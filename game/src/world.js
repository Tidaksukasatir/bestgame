// The simulation: one fixed step of Wispkeeper. The main loop calls step() at
// 60 Hz; rendering never touches these rules. step() returns an event bitmask
// (see state.js) so the main loop can play sounds and announce changes.

import { FIELD, WIN_WAVE } from './config.js';
import {
  EVENT_BOSS, EVENT_ENEMY_DIED, EVENT_HIT_LANTERN, EVENT_HIT_PLAYER,
  EVENT_OVER, EVENT_SHOOT, EVENT_VICTORY, EVENT_WAVE_CLEAR,
  createState, resetState,
} from './state.js';
import { updatePlayer } from './player.js';
import { killEnemy, startWave, updateEnemies, updateSpawns } from './enemies.js';
import { fireWeapon, spawnDeathBurst, updateBullets, updateEnemyBullets, weaponInterval, addFloat } from './weapons.js';

export { createState, resetState, startWave };
export {
  EVENT_NONE, EVENT_HIT_PLAYER, EVENT_HIT_LANTERN, EVENT_ENEMY_DIED,
  EVENT_PICKUP, EVENT_WAVE_CLEAR, EVENT_OVER, EVENT_VICTORY, EVENT_BOSS, EVENT_SHOOT,
} from './state.js';

export function createWorld(seed) {
  const state = createState(seed);
  return {
    state,
    reset(seed) {
      resetState(state, seed);
    },
    /** Begin wave 1 of a new run. */
    startRun() {
      startWave(state, 1);
    },
    /** Begin the next wave after the shop. */
    nextWave() {
      startWave(state, state.wave + 1);
    },
    step(dt, input, firing) {
      return stepWorld(state, dt, input, firing);
    },
  };
}

function dropShards(state, x, y, count) {
  for (let k = 0; k < count; k += 1) {
    for (let i = 0; i < state.shards.list.length; i += 1) {
      const s = state.shards.list[i];
      if (s.active) continue;
      s.active = true;
      state.shards.count += 1;
      const a = state.rng.range(0, 6.283);
      s.x = x + Math.cos(a) * 10;
      s.y = y + Math.sin(a) * 10;
      s.vx = Math.cos(a) * state.rng.range(40, 120);
      s.vy = Math.sin(a) * state.rng.range(40, 120);
      s.value = 1;
      s.bob = state.rng.range(0, 6.28);
      break;
    }
  }
}

function sweepDead(state) {
  let events = 0;
  for (let i = 0; i < state.enemies.list.length; i += 1) {
    const e = state.enemies.list[i];
    if (!e.active || e.hp > 0) continue;
    const mult = 1 + Math.min(2, state.combo * 0.05);
    const gained = Math.round(e.score * mult);
    state.score += gained;
    state.kills += 1;
    state.combo += 1;
    state.comboTimer = 3;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    addFloat(state, e.x, e.y - e.radius - 10, `+${gained}`, '#7de8ff', 15);
    spawnDeathBurst(state, e.x, e.y, e.color, e.kind === 'boss' ? 40 : 14);
    dropShards(state, e.x, e.y, e.shards);
    const wasBoss = e.kind === 'boss';
    killEnemy(state, e);
    events |= EVENT_ENEMY_DIED;
    if (wasBoss) events |= EVENT_BOSS;
  }
  return events;
}

function updateShards(state, dt) {
  const p = state.player;
  for (let i = 0; i < state.shards.list.length; i += 1) {
    const s = state.shards.list[i];
    if (!s.active) continue;
    s.bob += dt * 4;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= 0.9;
    s.vy *= 0.9;
    if (!p.alive) continue;
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < 130 * 130) {
      const d = Math.sqrt(d2) || 1;
      const pull = 520 * (1 - d / 200);
      s.x += (dx / d) * pull * dt;
      s.y += (dy / d) * pull * dt;
    }
    if (d2 < 24 * 24) {
      s.active = false;
      state.shards.count -= 1;
      state.shardCount += s.value;
    }
  }
}

function updateParticles(state, dt) {
  for (let i = 0; i < state.particles.list.length; i += 1) {
    const pt = state.particles.list[i];
    if (!pt.active) continue;
    pt.life += dt;
    if (pt.life >= pt.maxLife) {
      pt.active = false;
      state.particles.count -= 1;
      continue;
    }
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= pt.drag;
    pt.vy *= pt.drag;
  }
  for (let i = 0; i < state.floats.list.length; i += 1) {
    const f = state.floats.list[i];
    if (!f.active) continue;
    f.life += dt;
    f.y -= 34 * dt;
    if (f.life >= f.maxLife) {
      f.active = false;
      state.floats.count -= 1;
    }
  }
}

function stepWorld(state, dt, input, firing) {
  state.time += dt;
  // Ambient motes drift behind every screen.
  for (const m of state.motes) {
    m.y -= m.speed * dt;
    m.phase += dt;
    if (m.y < -10) {
      m.y = FIELD.height + 10;
      m.x = state.rng.range(0, FIELD.width);
    }
  }
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
  if (state.lantern.flash > 0) state.lantern.flash -= dt;
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }
  updateParticles(state, dt);

  // Attract mode: the title screen simmers with no enemies and no player input.
  if (!state.waveActive && state.wave === 0) return 0;
  if (state.over || state.victory) return 0;

  let events = 0;
  const p = state.player;
  if (input) {
    p.aimX = input.aim.x;
    p.aimY = input.aim.y;
    updatePlayer(state, input.dir, dt);
    p.fireTimer -= dt;
    if (firing && p.alive && p.fireTimer <= 0) {
      const fired = fireWeapon(state);
      if (fired > 0) {
        p.fireTimer = weaponInterval(state);
        events |= EVENT_SHOOT;
      }
    }
  }

  updateSpawns(state, dt);
  const contact = updateEnemies(state, dt);
  if (contact & 1) events |= EVENT_HIT_PLAYER;
  if (contact & 2) events |= EVENT_HIT_LANTERN;
  events |= updateBullets(state, dt);
  const ebullets = updateEnemyBullets(state, dt);
  if (ebullets & 1) events |= EVENT_HIT_PLAYER;
  if (ebullets & 2) events |= EVENT_HIT_LANTERN;
  events |= sweepDead(state);
  updateShards(state, dt);

  if (!p.alive || state.lantern.hp <= 0) {
    state.over = true;
    return events | EVENT_OVER;
  }
  if (state.waveActive && state.spawnLeft <= 0 && state.enemies.count === 0) {
    state.waveActive = false;
    state.score += 100 * state.wave;
    if (state.wave >= WIN_WAVE) {
      state.victory = true;
      return events | EVENT_VICTORY;
    }
    return events | EVENT_WAVE_CLEAR;
  }
  return events;
}
