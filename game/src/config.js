// Cinderwisp: every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below depends
// on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  accel: 2600,
  maxSpeed: 305,
  dashSpeed: 760,
  dashTime: 0.16,
  dashCooldown: 1.2,
  invulnerable: 1.6,
  flameStart: 80,
  flameRespawn: 55,
};

export const FLAME = {
  max: 100,
  drain: 1.1,
  rainDrain: 3.4,
  emberGain: 22,
  lightCost: 8,
  hearthGain: 12,
  hitLoss: 20,
};

export const BRAZIER = {
  baseCount: 5,
  extraNight: 2,
  maxCount: 7,
  lightRadius: 125,
  points: 200,
};

export const WISP = {
  baseCount: 2,
  maxCount: 7,
  radius: 15,
  speed: 96,
  speedPerNight: 8,
  spawnInterval: 5,
  spawnScale: 0.92,
  minSpawnInterval: 2.2,
  scatterSpeed: 340,
};

export const EMBER = {
  radius: 9,
  points: 10,
  interval: 2.1,
  maxOnField: 6,
  drift: 12,
};

export const RAIN = {
  clouds: 2,
  rx: 150,
  ry: 72,
  speedMin: 24,
  speedMax: 42,
};

export const NIGHT = {
  bonus: 400,
  bonusPerFlame: 8,
  lifeEvery: 3,
  maxLives: 5,
};

export const LIVES = 3;
export const NEAR_MISS_RADIUS = 36;
export const NEAR_MISS_POINTS = 15;

/** How many falling things can exist at once; the pool is allocated once, at boot. */
export const POOL_SIZE = 96;

export const PALETTE = {
  backdrop: '#0d1026',
  sky: '#141838',
  ground: '#1b2142',
  stone: '#232a4d',
  player: '#ffb347',
  playerCore: '#fff3c4',
  flame: '#ff8c42',
  ember: '#f2c94c',
  wisp: '#8b7cf6',
  wispCore: '#cfc6ff',
  rain: '#5a6b8c',
  brazierCold: '#3a4266',
  brazierLit: '#ff9e3d',
  panel: '#171c36',
  text: '#f2ead8',
  muted: '#9aa3c0',
  danger: '#ff6b6b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'cinderwisp.best';
export const MUTE_KEY = 'cinderwisp.muted';
