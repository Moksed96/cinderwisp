// The world: one state object and the rules that move it. Everything here is pure
// simulation — no drawing, no sound — so the screenshot scenes can drive it with an
// autopilot and get exactly what a real game looks like.
//
// The loop: carry your flame across the dark field and light every brazier before it
// burns out. Embers feed the flame, rain drinks it, shadow wisps hunt you. Light all
// the braziers to finish the night; lose all your lives (or let the flame die with
// none left) and the night takes you.

import {
  BRAZIER,
  EMBER,
  FIELD,
  FLAME,
  LIVES,
  NEAR_MISS_POINTS,
  NEAR_MISS_RADIUS,
  NIGHT,
  PLAYER,
  POOL_SIZE,
  RAIN,
  WISP,
} from './config.js';
import { pick, range, rangeInt } from './random.js';

export const KIND_WISP = 'wisp';
export const KIND_EMBER = 'ember';

const HEARTH = { x: FIELD.width / 2, y: FIELD.height / 2 };

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** A point on a random field edge, at least `away` from (x, y). */
function edgePoint(random, x, y, away) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const side = rangeInt(random, 0, 3);
    const point =
      side === 0
        ? { x: range(random, 40, FIELD.width - 40), y: 30 }
        : side === 1
          ? { x: range(random, 40, FIELD.width - 40), y: FIELD.height - 30 }
          : side === 2
            ? { x: 30, y: range(random, 40, FIELD.height - 40) }
            : { x: FIELD.width - 30, y: range(random, 40, FIELD.height - 40) };
    if (distance(point.x, point.y, x, y) >= away) return point;
  }
  return { x: 40, y: 40 };
}

function brazierSpots(random, count) {
  const spots = [];
  const margin = 130;
  for (let index = 0; index < count; index += 1) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const spot = {
        x: range(random, margin, FIELD.width - margin),
        y: range(random, margin + 60, FIELD.height - margin),
      };
      const clearOfHearth = distance(spot.x, spot.y, HEARTH.x, HEARTH.y) > 190;
      const clearOfOthers = spots.every((other) => distance(spot.x, spot.y, other.x, other.y) > 260);
      if (clearOfHearth && clearOfOthers) {
        spots.push(spot);
        break;
      }
    }
    if (spots.length === index) spots.push({ x: range(random, margin, FIELD.width - margin), y: range(random, margin + 60, FIELD.height - margin) });
  }
  return spots;
}

export function createWorld(random) {
  const state = {
    time: 0,
    night: 1,
    score: 0,
    lives: LIVES,
    best: 0,
    player: {
      x: HEARTH.x,
      y: HEARTH.y,
      vx: 0,
      vy: 0,
      face: 0,
      flame: PLAYER.flameStart,
      invulnerable: 0,
      dashTime: 0,
      dashCooldown: 0,
      trail: [],
    },
    braziers: [],
    wisps: [],
    embers: [],
    clouds: [],
    emberTimer: 0,
    wispTimer: 0,
    nightBonus: 0,
    banner: 0,
    stars: [],
    stones: [],
  };

  function seedScenery() {
    state.stars = [];
    state.stones = [];
    for (let index = 0; index < 90; index += 1) {
      state.stars.push({ x: range(random, 0, FIELD.width), y: range(random, 0, FIELD.height), phase: range(random, 0, 6.28), size: range(random, 0.6, 1.8) });
    }
    for (let index = 0; index < 46; index += 1) {
      state.stones.push({ x: range(random, 20, FIELD.width - 20), y: range(random, 20, FIELD.height - 20), radius: range(random, 3, 9), shade: range(random, 0, 1) });
    }
  }

  function seedClouds() {
    state.clouds = [];
    for (let index = 0; index < RAIN.clouds; index += 1) {
      state.clouds.push({
        x: range(random, 100, FIELD.width - 100),
        y: range(random, 90, FIELD.height - 90),
        rx: RAIN.rx * range(random, 0.85, 1.2),
        ry: RAIN.ry * range(random, 0.85, 1.2),
        vx: pick(random, [-1, 1]) * range(random, RAIN.speedMin, RAIN.speedMax),
        seed: range(random, 0, 100),
      });
    }
  }

  function brazierCount() {
    return Math.min(BRAZIER.maxCount, BRAZIER.baseCount + Math.max(0, state.night - BRAZIER.extraNight));
  }

  function wispTarget() {
    return Math.min(WISP.maxCount, WISP.baseCount + state.night - 1);
  }

  function seedNight() {
    state.braziers = brazierSpots(random, brazierCount()).map((spot) => ({ x: spot.x, y: spot.y, lit: false, flicker: range(random, 0, 6.28) }));
    state.wisps = [];
    state.embers = [];
    state.emberTimer = 1.2;
    state.wispTimer = 2.5;
  }

  function reset() {
    state.time = 0;
    state.night = 1;
    state.score = 0;
    state.lives = LIVES;
    state.nightBonus = 0;
    state.banner = 0;
    state.player.x = HEARTH.x;
    state.player.y = HEARTH.y;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.face = 0;
    state.player.flame = PLAYER.flameStart;
    state.player.invulnerable = 0;
    state.player.dashTime = 0;
    state.player.dashCooldown = 0;
    state.player.trail = [];
    seedScenery();
    seedClouds();
    seedNight();
  }

  function inRain(x, y) {
    for (const cloud of state.clouds) {
      const dx = (x - cloud.x) / cloud.rx;
      const dy = (y - cloud.y) / cloud.ry;
      if (dx * dx + dy * dy <= 1) return true;
    }
    return false;
  }

  function nearLitBrazier(x, y) {
    for (const brazier of state.braziers) {
      if (brazier.lit && distance(x, y, brazier.x, brazier.y) <= BRAZIER.lightRadius) return brazier;
    }
    return null;
  }

  function spawnEmber() {
    if (state.embers.length >= EMBER.maxOnField) return;
    state.embers.push({
      x: range(random, 60, FIELD.width - 60),
      y: range(random, 90, FIELD.height - 60),
      phase: range(random, 0, 6.28),
      vx: range(random, -EMBER.drift, EMBER.drift),
      vy: range(random, -EMBER.drift, EMBER.drift),
    });
  }

  function spawnWisp() {
    if (state.wisps.length >= POOL_SIZE) return;
    const point = edgePoint(random, state.player.x, state.player.y, 320);
    state.wisps.push({
      x: point.x,
      y: point.y,
      vx: 0,
      vy: 0,
      wander: range(random, 0, 6.28),
      nearMissArmed: true,
    });
  }

  function scatterWisps() {
    for (const wisp of state.wisps) {
      const away = Math.atan2(wisp.y - state.player.y, wisp.x - state.player.x);
      wisp.vx = Math.cos(away) * WISP.scatterSpeed;
      wisp.vy = Math.sin(away) * WISP.scatterSpeed;
    }
  }

  function finishNight() {
    state.nightBonus = NIGHT.bonus + Math.round(NIGHT.bonusPerFlame * state.player.flame);
    state.score += state.nightBonus;
    if (state.night % NIGHT.lifeEvery === 0 && state.lives < NIGHT.maxLives) state.lives += 1;
    state.night += 1;
    seedNight();
    state.banner = 2.6;
  }

  function flameOut(events) {
    state.lives -= 1;
    events.flameOut = true;
    if (state.lives <= 0) {
      events.over = true;
      return;
    }
    state.player.x = HEARTH.x;
    state.player.y = HEARTH.y;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.flame = PLAYER.flameRespawn;
    state.player.invulnerable = 2;
    scatterWisps();
  }

  /**
   * Advance the world one fixed step. `steer` is a unit vector (or zero); `dash` asks for a
   * dash this step; `attract` runs the ambient title screen (no flame, no wisps). Returns
   * the events of this step: pickup, light, hit, nearMiss, flameOut, night, over.
   */
  function step(dt, steer, dash, attract) {
    const events = { pickup: 0, light: false, hit: false, nearMiss: false, flameOut: false, night: false, over: false };
    const player = state.player;
    state.time += dt;

    for (const cloud of state.clouds) {
      cloud.x += cloud.vx * dt;
      if (cloud.x < -cloud.rx - 40) cloud.x = FIELD.width + cloud.rx + 40;
      if (cloud.x > FIELD.width + cloud.rx + 40) cloud.x = -cloud.rx - 40;
    }
    for (const brazier of state.braziers) brazier.flicker += dt * 6;
    if (state.banner > 0) state.banner -= dt;

    if (attract) {
      // The title screen: the wisp drifts in a slow circle around the hearth, embers sparkle.
      player.x = HEARTH.x + Math.cos(state.time * 0.35) * 150;
      player.y = HEARTH.y + Math.sin(state.time * 0.35) * 90;
      player.face = state.time * 0.35 + Math.PI / 2;
      player.flame = PLAYER.flameStart;
      state.emberTimer -= dt;
      if (state.emberTimer <= 0) {
        spawnEmber();
        state.emberTimer = EMBER.interval;
      }
      for (const ember of state.embers) {
        ember.phase += dt * 2;
        ember.x += ember.vx * dt;
        ember.y += ember.vy * dt;
      }
      return events;
    }

    // Steering and dash.
    if (dash && player.dashCooldown <= 0 && (steer.x !== 0 || steer.y !== 0)) {
      player.dashTime = PLAYER.dashTime;
      player.dashCooldown = PLAYER.dashCooldown;
      player.vx = steer.x * PLAYER.dashSpeed;
      player.vy = steer.y * PLAYER.dashSpeed;
      events.dash = true;
    }
    if (player.dashTime > 0) {
      player.dashTime -= dt;
    } else {
      player.vx += steer.x * PLAYER.accel * dt;
      player.vy += steer.y * PLAYER.accel * dt;
      const speed = Math.hypot(player.vx, player.vy);
      const max = PLAYER.maxSpeed;
      if (speed > max) {
        player.vx = (player.vx / speed) * max;
        player.vy = (player.vy / speed) * max;
      }
      if (steer.x === 0 && steer.y === 0) {
        player.vx *= Math.max(0, 1 - 8 * dt);
        player.vy *= Math.max(0, 1 - 8 * dt);
      }
    }
    player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, player.x + player.vx * dt));
    player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius, player.y + player.vy * dt));
    if (steer.x !== 0 || steer.y !== 0) player.face = Math.atan2(steer.y, steer.x);
    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    if (player.invulnerable > 0) player.invulnerable -= dt;

    // Ember trail while dashing.
    if (player.dashTime > 0) {
      player.trail.push({ x: player.x, y: player.y, life: 0.4 });
    }
    for (let index = player.trail.length - 1; index >= 0; index -= 1) {
      player.trail[index].life -= dt;
      if (player.trail[index].life <= 0) player.trail.splice(index, 1);
    }

    // The flame always burns; rain drinks it faster, a lit brazier feeds it.
    const raining = inRain(player.x, player.y);
    player.flame -= (raining ? FLAME.rainDrain : FLAME.drain) * dt;
    const hearth = nearLitBrazier(player.x, player.y);
    if (hearth !== null) player.flame += FLAME.hearthGain * dt;
    player.flame = Math.min(FLAME.max, player.flame);
    if (player.flame <= 0) {
      player.flame = 0;
      flameOut(events);
      return events;
    }

    // Embers: drift, sparkle, feed the flame and the score.
    state.emberTimer -= dt;
    if (state.emberTimer <= 0) {
      spawnEmber();
      state.emberTimer = EMBER.interval;
    }
    for (let index = state.embers.length - 1; index >= 0; index -= 1) {
      const ember = state.embers[index];
      ember.phase += dt * 2;
      ember.x += ember.vx * dt;
      ember.y += ember.vy * dt;
      if (ember.x < 30 || ember.x > FIELD.width - 30) ember.vx *= -1;
      if (ember.y < 60 || ember.y > FIELD.height - 30) ember.vy *= -1;
      if (distance(player.x, player.y, ember.x, ember.y) <= PLAYER.radius + EMBER.radius + 4) {
        state.embers.splice(index, 1);
        player.flame = Math.min(FLAME.max, player.flame + FLAME.emberGain);
        state.score += EMBER.points;
        events.pickup += 1;
      }
    }

    // Braziers: walk into a cold one to light it.
    for (const brazier of state.braziers) {
      if (!brazier.lit && distance(player.x, player.y, brazier.x, brazier.y) <= PLAYER.radius + 26) {
        brazier.lit = true;
        player.flame = Math.max(1, player.flame - FLAME.lightCost);
        state.score += BRAZIER.points;
        events.light = true;
      }
    }
    if (state.braziers.length > 0 && state.braziers.every((brazier) => brazier.lit)) {
      events.night = true;
      finishNight();
      return events;
    }

    // Wisps: spawn, chase, scatter on a hit, keep out of lit light.
    state.wispTimer -= dt;
    if (state.wispTimer <= 0) {
      if (state.wisps.length < wispTarget()) spawnWisp();
      const interval = Math.max(WISP.minSpawnInterval, WISP.spawnInterval * Math.pow(WISP.spawnScale, state.night - 1));
      state.wispTimer = interval;
    }
    const speed = WISP.speed + WISP.speedPerNight * (state.night - 1);
    for (const wisp of state.wisps) {
      wisp.wander += dt * 1.7;
      let tx = state.player.x - wisp.x;
      let ty = state.player.y - wisp.y;
      const toPlayer = Math.hypot(tx, ty) || 1;
      tx /= toPlayer;
      ty /= toPlayer;
      const wx = Math.cos(wisp.wander) * 0.35;
      const wy = Math.sin(wisp.wander) * 0.35;
      wisp.vx += (tx + wx) * 420 * dt;
      wisp.vy += (ty + wy) * 420 * dt;
      const wispSpeed = Math.hypot(wisp.vx, wisp.vy);
      if (wispSpeed > speed) {
        wisp.vx = (wisp.vx / wispSpeed) * speed;
        wisp.vy = (wisp.vy / wispSpeed) * speed;
      }
      // A lit brazier's light pushes a wisp back out.
      const lit = nearLitBrazier(wisp.x, wisp.y);
      if (lit !== null) {
        const away = Math.atan2(wisp.y - lit.y, wisp.x - lit.x);
        wisp.vx += Math.cos(away) * 700 * dt;
        wisp.vy += Math.sin(away) * 700 * dt;
      }
      wisp.x += wisp.vx * dt;
      wisp.y += wisp.vy * dt;
      wisp.x = Math.min(FIELD.width - WISP.radius, Math.max(WISP.radius, wisp.x));
      wisp.y = Math.min(FIELD.height - WISP.radius, Math.max(WISP.radius, wisp.y));

      const gap = distance(player.x, player.y, wisp.x, wisp.y);
      if (gap <= PLAYER.radius + WISP.radius) {
        if (player.invulnerable <= 0) {
          state.lives -= 1;
          player.flame = Math.max(0, player.flame - FLAME.hitLoss);
          player.invulnerable = PLAYER.invulnerable;
          scatterWisps();
          events.hit = true;
          if (state.lives <= 0) {
            events.over = true;
            return events;
          }
          if (player.flame <= 0) {
            flameOut(events);
            return events;
          }
        }
      } else if (gap <= NEAR_MISS_RADIUS + WISP.radius && wisp.nearMissArmed && player.invulnerable <= 0) {
        wisp.nearMissArmed = false;
        state.score += NEAR_MISS_POINTS;
        events.nearMiss = true;
      } else if (gap > 130) {
        wisp.nearMissArmed = true;
      }
    }

    return events;
  }

  return { state, reset, step, inRain, nearLitBrazier };
}
