// The screenshot scenes behind ?shot=start|play|night|end. Each one plays the real rules
// forward from a fresh world, steered by an autopilot, so the frame is what a short
// game really looks like and the same seed always gives the same frame.
//
// The good pilot heads for the nearest cold brazier (or an ember when the flame runs
// low), keeps clear of wisps and rain, and dashes out of trouble. The end scene's
// pilot is careless: it wanders into wisps and never feeds the flame, so the night
// takes it — as a hurried player is taken.

import { FIELD, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 11;
const NIGHT_LIMIT_SECONDS = 240;
const END_LIMIT_SECONDS = 600;

function nearestColdBrazier(state) {
  let best = null;
  let bestDistance = Infinity;
  for (const brazier of state.braziers) {
    if (brazier.lit) continue;
    const distance = Math.hypot(brazier.x - state.player.x, brazier.y - state.player.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = brazier;
    }
  }
  return best;
}

function nearestEmber(state) {
  let best = null;
  let bestDistance = Infinity;
  for (const ember of state.embers) {
    const distance = Math.hypot(ember.x - state.player.x, ember.y - state.player.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = ember;
    }
  }
  return best;
}

function wispDanger(state) {
  let danger = { x: 0, y: 0 };
  for (const wisp of state.wisps) {
    const dx = state.player.x - wisp.x;
    const dy = state.player.y - wisp.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance < 150) {
      const weight = (150 - distance) / 150;
      danger = { x: danger.x + (dx / distance) * weight, y: danger.y + (dy / distance) * weight };
    }
  }
  return danger;
}

/** The good pilot: chase the goal, feed the flame, keep clear of wisps. */
function goodPilot(state, world) {
  const player = state.player;
  const target = player.flame < 45 ? nearestEmber(state) || nearestColdBrazier(state) : nearestColdBrazier(state) || nearestEmber(state);
  let x = 0;
  let y = 0;
  if (target !== null) {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const length = Math.hypot(dx, dy) || 1;
    x = dx / length;
    y = dy / length;
  }
  const danger = wispDanger(state);
  x += danger.x * 1.4;
  y += danger.y * 1.4;
  if (world.inRain(player.x, player.y) && player.flame < 60) {
    // Step out of the rain: head for the nearest dry edge of the nearest cloud.
    for (const cloud of state.clouds) {
      const dx = (player.x - cloud.x) / cloud.rx;
      const dy = (player.y - cloud.y) / cloud.ry;
      if (dx * dx + dy * dy <= 1) {
        x += dx * 1.2;
        y += dy * 1.2;
        break;
      }
    }
  }
  const length = Math.hypot(x, y);
  if (length < 0.01) return { x: 0, y: 0, dash: false };
  const dash = Math.hypot(danger.x, danger.y) > 0.9 && player.dashCooldown <= 0;
  return { x: x / length, y: y / length, dash };
}

/** The careless pilot: drifts toward the nearest wisp and never feeds the flame. */
function carelessPilot(state) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const wisp of state.wisps) {
    const distance = Math.hypot(wisp.x - state.player.x, wisp.y - state.player.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = wisp;
    }
  }
  if (nearest === null) return { x: 0.3, y: 0.2, dash: false };
  const dx = nearest.x - state.player.x;
  const dy = nearest.y - state.player.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length, dash: false };
}

function runSteps(world, seconds, pilot, stopOnNight) {
  const steps = Math.floor(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    const move = pilot(world.state, world);
    const events = world.step(STEP, { x: move.x, y: move.y }, move.dash, false);
    if (events.over) return true;
    if (events.night && stopOnNight) return false;
  }
  return false;
}

/**
 * Set `world` to the named scene (start, play, night or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'night' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { x: 0, y: 0 }, false, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    const over = runSteps(world, END_LIMIT_SECONDS, carelessPilot, false);
    void over;
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  if (name === 'night') {
    // Play well until the night is lit; the banner is still showing.
    runSteps(world, NIGHT_LIMIT_SECONDS, goodPilot, true);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  runSteps(world, PLAY_SECONDS, goodPilot, false);
  return { screen: SCREEN_PLAY, best: world.state.score };
}
