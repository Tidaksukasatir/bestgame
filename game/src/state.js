// The single state object: one run of Wispkeeper. Everything the simulation
// touches lives here, so a fresh run is one reset and a screenshot scene is one
// staged state. Pools are allocated once; the step only reuses their slots.

import { FIELD, LANTERN, PLAYER, POOLS, STEP, WIN_WAVE } from './config.js';
import { createRandom } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_HIT_PLAYER = 1;
export const EVENT_HIT_LANTERN = 2;
export const EVENT_ENEMY_DIED = 4;
export const EVENT_PICKUP = 8;
export const EVENT_WAVE_CLEAR = 16;
export const EVENT_OVER = 32;
export const EVENT_VICTORY = 64;
export const EVENT_BOSS = 128;
export const EVENT_SHOOT = 256;

function makePool(size, make) {
  const list = new Array(size);
  for (let i = 0; i < size; i += 1) list[i] = make();
  return { list, count: 0 };
}

export function createState(seed) {
  const state = {
    rng: createRandom(seed),
    time: 0,
    wave: 0,
    score: 0,
    kills: 0,
    shardCount: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    waveActive: false,
    spawnLeft: 0,
    spawnTimer: 0,
    boss: null,
    shake: 0,
    over: false,
    victory: false,
    lantern: { x: LANTERN.x, y: LANTERN.y, hp: LANTERN.maxHp, maxHp: LANTERN.maxHp, radius: LANTERN.radius, flash: 0 },
    player: {
      x: LANTERN.x, y: LANTERN.y + 120, hp: PLAYER.maxHp, maxHp: PLAYER.maxHp,
      radius: PLAYER.radius, speed: PLAYER.speed, invuln: 0, flash: 0,
      fireTimer: 0, aimX: LANTERN.x, aimY: LANTERN.y - 100, alive: true,
    },
    upgrades: { damage: 0, fireRate: 0, speed: 0, health: 0, multishot: 0, pierce: 0 },
    enemies: makePool(POOLS.enemies, () => ({
      active: false, kind: 'chaser', x: 0, y: 0, vx: 0, vy: 0, hp: 1, maxHp: 1,
      radius: 10, speed: 100, damage: 10, shards: 1, score: 10, target: 0,
      telegraph: 0, attackTimer: 0, hitTimer: 0, flash: 0, wobble: 0, color: '#fff',
    })),
    bullets: makePool(POOLS.bullets, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0, damage: 10, pierce: 0, travelled: 0, radius: 5,
    })),
    ebullets: makePool(POOLS.ebullets, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0, damage: 8, travelled: 0, radius: 6,
    })),
    shards: makePool(POOLS.shards, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0, value: 1, bob: 0,
    })),
    particles: makePool(POOLS.particles, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#fff', drag: 0.9,
    })),
    floats: makePool(POOLS.floats, () => ({
      active: false, x: 0, y: 0, life: 0, maxLife: 0.8, text: '', color: '#fff', size: 14,
    })),
    /** Ambient drifting wisps behind the title screen (visual only). */
    motes: [],
  };
  for (let i = 0; i < 26; i += 1) {
    state.motes.push({
      x: state.rng.range(0, FIELD.width), y: state.rng.range(0, FIELD.height),
      r: state.rng.range(2, 5), speed: state.rng.range(6, 22), phase: state.rng.range(0, 6.28),
      hue: state.rng.pick(['#b06ee8', '#7de8ff', '#ffd97a']),
    });
  }
  return state;
}

/** Reset a state in place for a new run (same pools, no allocation). */
export function resetState(state, seed) {
  const fresh = createState(seed);
  for (const key of Object.keys(fresh)) {
    if (key === 'enemies' || key === 'bullets' || key === 'ebullets' || key === 'shards' || key === 'particles' || key === 'floats') {
      state[key].count = 0;
      for (const slot of state[key].list) slot.active = false;
      continue;
    }
    state[key] = fresh[key];
  }
  state.rng = createRandom(seed);
  state.time = 0;
}

export { STEP, WIN_WAVE };
