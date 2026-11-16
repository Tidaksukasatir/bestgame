// Wispkeeper — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Survive this many waves to win. Every 5th wave is a boss wave. */
export const WIN_WAVE = 10;

export const LANTERN = {
  x: FIELD.width / 2,
  y: FIELD.height / 2,
  radius: 34,
  maxHp: 150,
  /** Light radius the lantern casts (visual + shard magnet is the player's). */
  glow: 230,
};

export const PLAYER = {
  radius: 14,
  speed: 305,
  maxHp: 100,
  /** Seconds of invulnerability after taking a hit. */
  invuln: 0.8,
  /** Shards within this distance fly to the player. */
  magnet: 130,
  pickup: 24,
};

export const WEAPON = {
  damage: 12,
  /** Seconds between shots at level 0. */
  interval: 0.22,
  bulletSpeed: 640,
  bulletRadius: 5,
  range: 560,
};

/** Enemy kinds. All original: shadow wisps of the Hollow. */
export const ENEMY = {
  chaser: { radius: 13, hp: 22, speed: 165, damage: 10, shards: 1, score: 10, color: '#b06ee8' },
  tank: { radius: 22, hp: 95, speed: 62, damage: 18, shards: 3, score: 25, color: '#7d5ba6' },
  shooter: { radius: 14, hp: 30, speed: 105, damage: 8, shards: 2, score: 20, color: '#e86e9a' },
  splitter: { radius: 17, hp: 40, speed: 115, damage: 12, shards: 2, score: 20, color: '#6ee8c8' },
  mote: { radius: 9, hp: 10, speed: 195, damage: 6, shards: 0, score: 5, color: '#9fe8d8' },
  boss: { radius: 46, hp: 620, speed: 52, damage: 25, shards: 15, score: 250, color: '#e84e6e' },
};

/** Per-wave HP and speed growth. */
export const SCALING = { hpPerWave: 0.14, speedPerWave: 0.02, maxSpeedMult: 1.5 };

/** How a wave is composed. Count grows with the wave; the mix widens as waves go on. */
export function waveComposition(wave) {
  const count = 6 + wave * 3;
  const kinds = ['chaser'];
  if (wave >= 2) kinds.push('splitter');
  if (wave >= 3) kinds.push('shooter');
  if (wave >= 4) kinds.push('tank');
  return { count, kinds, boss: wave % 5 === 0 };
}

export const SHOP = {
  /** Keys 1-6 in the shop, in display order. */
  items: [
    { id: 'damage', key: '1', name: 'Ember Rounds', desc: '+25% bullet damage', base: 8, max: 9 },
    { id: 'fireRate', key: '2', name: 'Quick Wick', desc: '+20% fire rate', base: 8, max: 9 },
    { id: 'speed', key: '3', name: 'Swift Flame', desc: '+12% move speed', base: 6, max: 6 },
    { id: 'health', key: '4', name: 'Stout Lantern', desc: '+25 max HP and heal 25', base: 10, max: 9 },
    { id: 'multishot', key: '5', name: 'Twin Flames', desc: '+1 projectile per shot', base: 25, max: 3 },
    { id: 'pierce', key: '6', name: 'Piercing Light', desc: 'Bullets pierce +1 enemy', base: 20, max: 3 },
  ],
};

/** Pool sizes, allocated once at boot; nothing is allocated in the hot loop. */
export const POOLS = { enemies: 96, bullets: 128, ebullets: 96, shards: 160, particles: 320, floats: 48 };

export const PALETTE = {
  backdrop: '#0b0e1a',
  ground: '#12162a',
  groundRing: '#1a2040',
  lanternGlow: '#ffd97a',
  lanternCore: '#fff3c4',
  player: '#ffe9a8',
  playerCore: '#fffbe8',
  bullet: '#ffe9a8',
  enemyBullet: '#ff7a9e',
  shard: '#7de8ff',
  text: '#f2ead8',
  muted: '#9a94b8',
  panel: '#171c33',
  panelEdge: '#2c3460',
  danger: '#ff5d73',
  good: '#7de8a8',
  boss: '#e84e6e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'wispkeeper.best';
