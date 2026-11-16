// Synthesized sound: every effect is built from oscillators and filtered noise at run
// time, so the game ships no audio files. The context is created on the first user
// gesture (a browser will not let audio start before one), and M toggles mute.

import { MUTE_KEY } from './config.js';

function readMuted() {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function createAudio() {
  let context = null;
  let master = null;
  let muted = readMuted();

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  /** Call from any user gesture so the context is allowed to start. */
  function unlock() {
    if (ensure() && context.state === 'suspended') void context.resume();
  }

  function tone({ frequency, end, duration, type = 'sine', volume = 0.5, delay = 0 }) {
    if (!ensure() || muted) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (end !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noise({ duration, volume = 0.4, frequency = 1200, end, delay = 0, type = 'bandpass' }) {
    if (!ensure() || muted) return;
    const start = context.currentTime + delay;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, start);
    if (end !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(20, end), start + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + duration + 0.05);
  }

  return {
    unlock,
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      try {
        window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
      } catch {
        // Storage can be off: the mute then lasts this visit only.
      }
      if (master !== null) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    click() {
      tone({ frequency: 660, duration: 0.06, type: 'triangle', volume: 0.25 });
    },
    pickup() {
      tone({ frequency: 880, duration: 0.09, type: 'sine', volume: 0.35 });
      tone({ frequency: 1318, duration: 0.12, type: 'sine', volume: 0.3, delay: 0.07 });
    },
    light() {
      noise({ duration: 0.5, volume: 0.35, frequency: 900, end: 3200 });
      tone({ frequency: 196, end: 392, duration: 0.5, type: 'triangle', volume: 0.3 });
      tone({ frequency: 523, duration: 0.4, type: 'sine', volume: 0.2, delay: 0.12 });
    },
    dash() {
      noise({ duration: 0.18, volume: 0.3, frequency: 2400, end: 500 });
    },
    hit() {
      tone({ frequency: 160, end: 55, duration: 0.3, type: 'sawtooth', volume: 0.4 });
      noise({ duration: 0.2, volume: 0.3, frequency: 400, end: 120, type: 'lowpass' });
    },
    flameOut() {
      noise({ duration: 0.7, volume: 0.35, frequency: 5000, end: 900 });
      tone({ frequency: 330, end: 110, duration: 0.7, type: 'sine', volume: 0.25 });
    },
    nearMiss() {
      tone({ frequency: 1568, duration: 0.05, type: 'sine', volume: 0.18 });
    },
    night() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((frequency, index) => {
        tone({ frequency, duration: 0.35, type: 'triangle', volume: 0.3, delay: index * 0.11 });
      });
    },
    gameOver() {
      const notes = [392, 330, 262, 196];
      notes.forEach((frequency, index) => {
        tone({ frequency, duration: 0.4, type: 'triangle', volume: 0.3, delay: index * 0.16 });
      });
    },
  };
}
