// The renderer: everything the player sees. The scene is drawn in the fixed 1280x720
// field, then a darkness layer is laid over it with light punched out around the
// player and every lit brazier, so the field feels dark and the flame feels precious.
// A glow pass ('lighter') makes embers, flames and wisps shine through the dark.

import { BRAZIER, EMBER, FIELD, FLAME, FONT, PALETTE, PLAYER, WISP } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function glow(context, x, y, radius, color, strength) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.globalAlpha = strength;
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
}

function flameShape(context, x, y, height, flicker, color) {
  const wobble = Math.sin(flicker) * 3;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x, y - height);
  context.bezierCurveTo(x + 8 + wobble, y - height * 0.55, x + 6, y - height * 0.1, x, y);
  context.bezierCurveTo(x - 6, y - height * 0.1, x - 8 - wobble, y - height * 0.55, x, y - height);
  context.fill();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const dark = document.createElement('canvas');
  dark.width = FIELD.width;
  dark.height = FIELD.height;
  const darkContext = dark.getContext('2d');

  function fit() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const offsetX = (canvas.width - FIELD.width * scale) / 2;
    const offsetY = (canvas.height - FIELD.height * scale) / 2;
    return { scale, offsetX, offsetY };
  }

  function drawBackground(state) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.sky);
    gradient.addColorStop(0.55, PALETTE.backdrop);
    gradient.addColorStop(1, PALETTE.ground);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    for (const star of state.stars) {
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(state.time * 0.8 + star.phase));
      context.globalAlpha = twinkle * 0.8;
      context.fillStyle = '#dfe6ff';
      context.beginPath();
      context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;

    for (const stone of state.stones) {
      context.fillStyle = stone.shade > 0.5 ? '#262e55' : '#1e2547';
      context.beginPath();
      context.arc(stone.x, stone.y, stone.radius, 0, Math.PI * 2);
      context.fill();
    }

    // The heart-hearth at the centre: a ring of old stones where the wisp returns.
    context.strokeStyle = '#2c355e';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(FIELD.width / 2, FIELD.height / 2, 46, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = '#232a4d';
    context.beginPath();
    context.arc(FIELD.width / 2, FIELD.height / 2, 38, 0, Math.PI * 2);
    context.fill();
  }

  function drawBraziers(state) {
    for (const brazier of state.braziers) {
      // Stone base and bowl.
      context.fillStyle = PALETTE.stone;
      context.beginPath();
      context.arc(brazier.x, brazier.y + 14, 22, 0, Math.PI);
      context.fill();
      context.fillRect(brazier.x - 22, brazier.y + 12, 44, 8);
      context.fillStyle = '#161b33';
      context.beginPath();
      context.ellipse(brazier.x, brazier.y + 6, 26, 10, 0, 0, Math.PI * 2);
      context.fill();
      if (brazier.lit) {
        flameShape(context, brazier.x, brazier.y + 4, 34 + Math.sin(brazier.flicker) * 5, brazier.flicker, PALETTE.brazierLit);
        flameShape(context, brazier.x, brazier.y + 4, 20 + Math.sin(brazier.flicker * 1.3) * 3, brazier.flicker * 1.3, '#ffd166');
      } else {
        // Cold: a wisp of smoke curls up, and a bright ring marks where to stand.
        context.strokeStyle = 'rgba(200,208,232,0.6)';
        context.lineWidth = 2.5;
        context.beginPath();
        context.arc(brazier.x, brazier.y + 6, 18 + Math.sin(brazier.flicker * 0.5) * 2, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = 'rgba(154,163,192,0.25)';
        context.beginPath();
        context.arc(brazier.x + Math.sin(brazier.flicker * 0.7) * 5, brazier.y - 14 - ((brazier.flicker * 7) % 18), 4, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawEmbers(state) {
    for (const ember of state.embers) {
      const pulse = 1 + Math.sin(ember.phase) * 0.25;
      const size = EMBER.radius * pulse;
      context.save();
      context.translate(ember.x, ember.y);
      context.rotate(Math.PI / 4 + Math.sin(ember.phase * 0.5) * 0.2);
      context.fillStyle = PALETTE.ember;
      context.fillRect(-size / 2, -size / 2, size, size);
      context.fillStyle = '#fff7d6';
      context.fillRect(-size / 5, -size / 5, size / 2.5, size / 2.5);
      context.restore();
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    const flicker = 1 + Math.sin(state.time * 9) * 0.08 + Math.sin(state.time * 23) * 0.04;
    const blink = player.invulnerable > 0 && Math.floor(state.time * 12) % 2 === 0;
    if (blink) return;

    // Dash trail.
    for (const drop of player.trail) {
      context.globalAlpha = Math.max(0, drop.life / 0.4) * 0.6;
      context.fillStyle = PALETTE.flame;
      context.beginPath();
      context.arc(drop.x, drop.y, 7, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;

    // The wisp: a glowing orb with a little tail and a bright core.
    context.fillStyle = 'rgba(255,179,71,0.35)';
    context.beginPath();
    context.arc(player.x - Math.cos(player.face) * 16, player.y - Math.sin(player.face) * 16, 9 * flicker, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(player.x, player.y, PLAYER.radius * flicker, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.playerCore;
    context.beginPath();
    context.arc(player.x, player.y, (PLAYER.radius - 5) * flicker, 0, Math.PI * 2);
    context.fill();
    // Eyes, looking where it flies.
    context.fillStyle = '#3a2a12';
    context.beginPath();
    context.arc(player.x + Math.cos(player.face) * 5 - 3, player.y + Math.sin(player.face) * 5 - 2, 1.8, 0, Math.PI * 2);
    context.arc(player.x + Math.cos(player.face) * 5 + 3, player.y + Math.sin(player.face) * 5 - 2, 1.8, 0, Math.PI * 2);
    context.fill();
  }

  function drawWisps(state) {
    for (const wisp of state.wisps) {
      const wobble = Math.sin(state.time * 5 + wisp.wander) * 3;
      context.fillStyle = 'rgba(139,124,246,0.3)';
      context.beginPath();
      context.arc(wisp.x - wisp.vx * 0.06, wisp.y - wisp.vy * 0.06 + wobble, WISP.radius + 5, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.wisp;
      context.beginPath();
      context.arc(wisp.x, wisp.y + wobble * 0.4, WISP.radius, 0, Math.PI * 2);
      context.fill();
      // A ragged tail.
      context.beginPath();
      context.moveTo(wisp.x - WISP.radius * 0.7, wisp.y + 6);
      context.lineTo(wisp.x - wisp.vx * 0.12, wisp.y - wisp.vy * 0.12 + 16);
      context.lineTo(wisp.x + WISP.radius * 0.7, wisp.y + 6);
      context.closePath();
      context.fill();
      // Hollow eyes.
      context.fillStyle = '#0d1026';
      context.beginPath();
      context.arc(wisp.x - 5, wisp.y - 3 + wobble * 0.4, 2.6, 0, Math.PI * 2);
      context.arc(wisp.x + 5, wisp.y - 3 + wobble * 0.4, 2.6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.wispCore;
      context.beginPath();
      context.arc(wisp.x - 5, wisp.y - 3 + wobble * 0.4, 1, 0, Math.PI * 2);
      context.arc(wisp.x + 5, wisp.y - 3 + wobble * 0.4, 1, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawRain(state) {
    for (const cloud of state.clouds) {
      context.fillStyle = 'rgba(38,46,80,0.85)';
      context.beginPath();
      context.ellipse(cloud.x, cloud.y, cloud.rx, cloud.ry, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(90,107,140,0.5)';
      context.beginPath();
      context.ellipse(cloud.x - cloud.rx * 0.3, cloud.y - cloud.ry * 0.35, cloud.rx * 0.55, cloud.ry * 0.5, 0, 0, Math.PI * 2);
      context.fill();
      // Rain streaks under the cloud.
      context.strokeStyle = 'rgba(140,165,205,0.45)';
      context.lineWidth = 2;
      for (let index = 0; index < 14; index += 1) {
        const rx = cloud.x - cloud.rx + ((index * 37 + cloud.seed * 13) % (cloud.rx * 2));
        const fall = ((state.time * 260 + index * 53 + cloud.seed * 7) % 90);
        context.beginPath();
        context.moveTo(rx, cloud.y + cloud.ry * 0.4 + fall);
        context.lineTo(rx - 5, cloud.y + cloud.ry * 0.4 + fall + 16);
        context.stroke();
      }
    }
  }

  function drawGlow(state) {
    context.globalCompositeOperation = 'lighter';
    const player = state.player;
    const flameLight = 130 + (player.flame / FLAME.max) * 130;
    glow(context, player.x, player.y, flameLight, 'rgba(255,150,60,0.55)', 1);
    for (const brazier of state.braziers) {
      if (brazier.lit) glow(context, brazier.x, brazier.y, 110, 'rgba(255,140,50,0.5)', 1);
    }
    for (const ember of state.embers) {
      glow(context, ember.x, ember.y, 26, 'rgba(242,201,76,0.5)', 1);
    }
    for (const wisp of state.wisps) {
      glow(context, wisp.x, wisp.y, 42, 'rgba(139,124,246,0.4)', 1);
    }
    context.globalCompositeOperation = 'source-over';
  }

  // After the darkness: the things that shine through it — ember cores and the wisps
  // themselves — so the collectibles and the hunters read even far from any flame.
  function drawThroughDark(state) {
    for (const ember of state.embers) {
      const pulse = 1 + Math.sin(ember.phase) * 0.25;
      context.save();
      context.translate(ember.x, ember.y);
      context.rotate(Math.PI / 4);
      context.fillStyle = '#ffe9a8';
      context.fillRect(-3 * pulse, -3 * pulse, 6 * pulse, 6 * pulse);
      context.restore();
    }
    context.globalCompositeOperation = 'lighter';
    for (const wisp of state.wisps) {
      glow(context, wisp.x, wisp.y, 46, 'rgba(139,124,246,0.55)', 1);
    }
    context.globalCompositeOperation = 'source-over';
    for (const wisp of state.wisps) {
      const wobble = Math.sin(state.time * 5 + wisp.wander) * 3;
      context.fillStyle = PALETTE.wisp;
      context.beginPath();
      context.arc(wisp.x, wisp.y + wobble * 0.4, WISP.radius, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#0d1026';
      context.beginPath();
      context.arc(wisp.x - 5, wisp.y - 3 + wobble * 0.4, 2.6, 0, Math.PI * 2);
      context.arc(wisp.x + 5, wisp.y - 3 + wobble * 0.4, 2.6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.wispCore;
      context.beginPath();
      context.arc(wisp.x - 5, wisp.y - 3 + wobble * 0.4, 1.2, 0, Math.PI * 2);
      context.arc(wisp.x + 5, wisp.y - 3 + wobble * 0.4, 1.2, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawDarkness(state) {
    darkContext.clearRect(0, 0, FIELD.width, FIELD.height);
    darkContext.fillStyle = 'rgba(4,6,18,0.58)';
    darkContext.fillRect(0, 0, FIELD.width, FIELD.height);
    darkContext.globalCompositeOperation = 'destination-out';
    const player = state.player;
    const flameLight = 150 + (player.flame / FLAME.max) * 150;
    const hole = (x, y, radius, strength) => {
      const gradient = darkContext.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(0,0,0,${strength})`);
      gradient.addColorStop(0.7, `rgba(0,0,0,${strength * 0.6})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      darkContext.fillStyle = gradient;
      darkContext.beginPath();
      darkContext.arc(x, y, radius, 0, Math.PI * 2);
      darkContext.fill();
    };
    hole(player.x, player.y, flameLight, 0.95);
    for (const brazier of state.braziers) {
      if (brazier.lit) hole(brazier.x, brazier.y, BRAZIER.lightRadius + 35, 0.9);
    }
    darkContext.globalCompositeOperation = 'source-over';
    context.drawImage(dark, 0, 0);
  }

  function drawHud(state, screen, best, muted) {
    const player = state.player;
    context.textBaseline = 'alphabetic';
    // Top-left: score and best.
    context.fillStyle = PALETTE.text;
    context.font = `700 30px ${FONT}`;
    context.textAlign = 'left';
    context.fillText(`${state.score}`, 28, 46);
    context.font = `500 16px ${FONT}`;
    context.fillStyle = PALETTE.muted;
    context.fillText(`BEST ${Math.max(best, state.score)}`, 28, 70);
    // Top-centre: the night.
    context.font = `700 22px ${FONT}`;
    context.fillStyle = PALETTE.text;
    context.textAlign = 'center';
    context.fillText(`NIGHT ${state.night}`, FIELD.width / 2, 44);
    const lit = state.braziers.filter((brazier) => brazier.lit).length;
    for (let index = 0; index < state.braziers.length; index += 1) {
      context.fillStyle = index < lit ? PALETTE.brazierLit : '#3a4266';
      context.beginPath();
      context.arc(FIELD.width / 2 - ((state.braziers.length - 1) * 16) / 2 + index * 16, 62, 6, 0, Math.PI * 2);
      context.fill();
    }
    // Top-right: lives and mute.
    context.textAlign = 'right';
    for (let index = 0; index < state.lives; index += 1) {
      flameShape(context, FIELD.width - 36 - index * 30, 52, 18, state.time * 3 + index, PALETTE.flame);
    }
    context.font = `500 15px ${FONT}`;
    context.fillStyle = PALETTE.muted;
    context.fillText(muted ? 'MUTED (M)' : 'SOUND (M)', FIELD.width - 28, 76);
    // Bottom-left: the flame bar.
    const barX = 28;
    const barY = FIELD.height - 44;
    const barWidth = 260;
    context.fillStyle = 'rgba(23,28,54,0.9)';
    roundRect(context, barX - 6, barY - 6, barWidth + 12, 30, 8);
    context.fill();
    const flameFraction = Math.max(0, player.flame / FLAME.max);
    const flameColor = flameFraction > 0.45 ? PALETTE.flame : flameFraction > 0.2 ? '#ff9e3d' : PALETTE.danger;
    context.fillStyle = flameColor;
    roundRect(context, barX, barY, barWidth * flameFraction, 18, 6);
    context.fill();
    context.fillStyle = PALETTE.text;
    context.font = `600 14px ${FONT}`;
    context.textAlign = 'left';
    context.fillText(`FLAME ${Math.ceil(player.flame)}`, barX, barY + 15);
    // Bottom-centre: dash readiness.
    const dashReady = player.dashCooldown <= 0;
    context.textAlign = 'center';
    context.fillStyle = dashReady ? PALETTE.text : PALETTE.muted;
    context.font = `600 15px ${FONT}`;
    context.fillText(dashReady ? 'DASH READY  ·  SHIFT / CLICK' : 'DASH…', FIELD.width / 2, FIELD.height - 26);
    // Bottom-right: the controls.
    context.textAlign = 'right';
    context.fillStyle = PALETTE.muted;
    context.font = `500 14px ${FONT}`;
    context.fillText('WASD / ARROWS MOVE · P PAUSE', FIELD.width - 28, FIELD.height - 26);
    void screen;
  }

  function panel(text, subtext) {
    context.fillStyle = 'rgba(13,16,38,0.82)';
    roundRect(context, FIELD.width / 2 - 330, FIELD.height / 2 - 150, 660, 300, 18);
    context.fill();
    context.strokeStyle = 'rgba(255,179,71,0.5)';
    context.lineWidth = 2;
    roundRect(context, FIELD.width / 2 - 330, FIELD.height / 2 - 150, 660, 300, 18);
    context.stroke();
    context.fillStyle = PALETTE.text;
    context.textAlign = 'center';
    context.font = `800 64px ${FONT}`;
    context.fillText(text, FIELD.width / 2, FIELD.height / 2 - 28);
    context.font = `500 21px ${FONT}`;
    context.fillStyle = PALETTE.muted;
    context.fillText(subtext, FIELD.width / 2, FIELD.height / 2 + 18);
  }

  function drawTitle(state, best) {
    context.fillStyle = 'rgba(13,16,38,0.45)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.textAlign = 'center';
    context.fillStyle = PALETTE.player;
    context.font = `800 92px ${FONT}`;
    context.fillText('CINDERWISP', FIELD.width / 2, 218);
    context.fillStyle = PALETTE.text;
    context.font = `500 26px ${FONT}`;
    context.fillText('Courier of the Last Flame', FIELD.width / 2, 262);
    context.fillStyle = PALETTE.muted;
    context.font = `400 19px ${FONT}`;
    context.fillText('The night is dark and hungry. Light every brazier before your flame burns out.', FIELD.width / 2, 306);
    context.fillText('Embers feed the flame. Rain drinks it. Shadow wisps hunt it.', FIELD.width / 2, 336);
    context.fillStyle = PALETTE.text;
    context.font = `600 20px ${FONT}`;
    context.fillText('WASD / ARROWS — move      SHIFT / CLICK — dash      P — pause      M — mute', FIELD.width / 2, 412);
    const pulse = 0.65 + Math.sin(state.time * 3) * 0.35;
    context.globalAlpha = pulse;
    context.font = `700 24px ${FONT}`;
    context.fillStyle = PALETTE.ember;
    context.fillText('PRESS SPACE OR CLICK TO BEGIN', FIELD.width / 2, 478);
    context.globalAlpha = 1;
    if (best > 0) {
      context.fillStyle = PALETTE.muted;
      context.font = `500 18px ${FONT}`;
      context.fillText(`BEST ${best}`, FIELD.width / 2, 516);
    }
  }

  function drawOver(state, best) {
    context.fillStyle = 'rgba(13,16,38,0.6)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    panel('THE FLAME IS OUT', `SCORE ${state.score}   ·   BEST ${Math.max(best, state.score)}   ·   NIGHT ${state.night}`);
    const pulse = 0.65 + Math.sin(state.time * 3) * 0.35;
    context.globalAlpha = pulse;
    context.fillStyle = PALETTE.ember;
    context.font = `700 22px ${FONT}`;
    context.textAlign = 'center';
    context.fillText('PRESS SPACE TO LIGHT AGAIN', FIELD.width / 2, FIELD.height / 2 + 96);
    context.globalAlpha = 1;
  }

  function drawBanner(state) {
    if (state.banner <= 0) return;
    const alpha = Math.min(1, state.banner / 0.6);
    context.globalAlpha = alpha;
    context.fillStyle = 'rgba(13,16,38,0.7)';
    roundRect(context, FIELD.width / 2 - 300, 150, 600, 96, 16);
    context.fill();
    context.fillStyle = PALETTE.ember;
    context.font = `800 40px ${FONT}`;
    context.textAlign = 'center';
    context.fillText(`NIGHT ${state.night - 1} LIT`, FIELD.width / 2, 196);
    context.fillStyle = PALETTE.text;
    context.font = `600 22px ${FONT}`;
    context.fillText(`BONUS +${state.nightBonus}`, FIELD.width / 2, 228);
    context.globalAlpha = 1;
  }

  function draw(state, screen, best, muted) {
    const { scale, offsetX, offsetY } = fit();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#05060f';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    drawBackground(state);
    drawBraziers(state);
    drawEmbers(state);
    drawPlayer(state);
    drawWisps(state);
    drawRain(state);
    drawGlow(state);
    drawDarkness(state);
    drawThroughDark(state);
    if (screen === SCREEN_TITLE) {
      drawHud(state, screen, best, muted);
      drawTitle(state, best);
    } else if (screen === SCREEN_OVER) {
      drawHud(state, screen, best, muted);
      drawOver(state, best);
    } else {
      drawHud(state, screen, best, muted);
      if (screen === SCREEN_PAUSED) {
        context.fillStyle = 'rgba(13,16,38,0.55)';
        context.fillRect(0, 0, FIELD.width, FIELD.height);
        panel('PAUSED', 'PRESS P OR SPACE TO CARRY ON');
      }
      drawBanner(state);
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { draw };
}
