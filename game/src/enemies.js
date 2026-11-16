// The shadow wisps: what each kind is, how it spawns at the field's edge with a
// visible telegraph, and how it moves and attacks. Kinds are original to this
// game: chaser, tank, shooter, splitter (which bursts into motes), and the boss.

import { ENEMY, FIELD, SCALING, waveComposition } from './config.js';
import { hurtLantern, hurtPlayer } from './player.js';

function poolAdd(pool) {
  for (let i = 0; i < pool.list.length; i += 1) {
    if (!pool.list[i].active) {
      pool.list[i].active = true;
      pool.count += 1;
      return pool.list[i];
    }
  }
  return null;
}

function poolRemove(pool, slot) {
  slot.active = false;
  pool.count -= 1;
}

/** Pick a spawn point just outside one edge of the field. */
export function edgeSpawn(rng) {
  const side = rng.int(0, 4);
  const m = 30;
  if (side === 0) return { x: rng.range(0, FIELD.width), y: -m };
  if (side === 1) return { x: rng.range(0, FIELD.width), y: FIELD.height + m };
  if (side === 2) return { x: -m, y: rng.range(0, FIELD.height) };
  return { x: FIELD.width + m, y: rng.range(0, FIELD.height) };
}

export function spawnEnemy(state, kind, wave) {
  const def = ENEMY[kind];
  const slot = poolAdd(state.enemies);
  if (!slot) return null;
  const at = edgeSpawn(state.rng);
  const hpMult = 1 + SCALING.hpPerWave * (wave - 1);
  const spMult = Math.min(SCALING.maxSpeedMult, 1 + SCALING.speedPerWave * (wave - 1));
  slot.kind = kind;
  slot.x = at.x;
  slot.y = at.y;
  slot.vx = 0;
  slot.vy = 0;
  slot.maxHp = Math.round(def.hp * hpMult);
  slot.hp = slot.maxHp;
  slot.radius = def.radius;
  slot.speed = def.speed * spMult * state.rng.range(0.9, 1.1);
  slot.damage = def.damage;
  slot.shards = def.shards;
  slot.score = def.score;
  slot.color = def.color;
  // 0 = hunts the lantern, 1 = hunts the keeper. Shooters and splitters prefer
  // the lantern; chasers split their attention.
  slot.target = kind === 'chaser' ? (state.rng.next() < 0.4 ? 1 : 0) : 0;
  slot.telegraph = 0.6;
  slot.attackTimer = state.rng.range(0.5, 1.5);
  slot.hitTimer = 0;
  slot.flash = 0;
  slot.wobble = state.rng.range(0, 6.28);
  return slot;
}

export function spawnBoss(state, wave) {
  const boss = spawnEnemy(state, 'boss', wave);
  if (!boss) return null;
  boss.x = FIELD.width / 2;
  boss.y = -60;
  boss.maxHp = Math.round(ENEMY.boss.hp * (1 + 0.35 * (wave / 5 - 1)));
  boss.hp = boss.maxHp;
  boss.telegraph = 1.0;
  state.boss = boss;
  return boss;
}

/** Start a wave: fill the spawn queue from the wave's composition. */
export function startWave(state, wave) {
  const comp = waveComposition(wave);
  state.wave = wave;
  state.spawnLeft = comp.count;
  state.spawnTimer = 0.4;
  state.waveActive = true;
  state.bossSpawned = false;
  if (comp.boss) {
    spawnBoss(state, wave);
    state.bossSpawned = true;
  }
}

/** Queue the next spawn while the wave still has enemies to send. */
export function updateSpawns(state, dt) {
  if (!state.waveActive || state.spawnLeft <= 0) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  const comp = waveComposition(state.wave);
  const kind = state.rng.pick(comp.kinds);
  spawnEnemy(state, kind, state.wave);
  state.spawnLeft -= 1;
  // Spawn faster as the wave goes on and on later waves.
  const base = Math.max(0.22, 0.85 - state.wave * 0.05);
  state.spawnTimer = base * state.rng.range(0.7, 1.3);
}

function targetOf(state, e) {
  if (e.target === 1 && state.player.alive) return state.player;
  return state.lantern;
}

function burstMotes(state, x, y) {
  for (let i = 0; i < 2; i += 1) {
    const mote = spawnEnemy(state, 'mote', state.wave);
    if (!mote) break;
    mote.x = x + (i === 0 ? -14 : 14);
    mote.y = y + (i === 0 ? -10 : 10);
    mote.telegraph = 0.25;
    mote.target = 0;
  }
}

export function killEnemy(state, e) {
  poolRemove(state.enemies, e);
  if (e.kind === 'splitter') burstMotes(state, e.x, e.y);
  if (e === state.boss) state.boss = null;
}

/**
 * Move every enemy one step, resolve contact attacks, and return an event
 * bitmask (hit player / hit lantern). Shooting enemies fire enemy bullets.
 */
export function updateEnemies(state, dt) {
  const p = state.player;
  const l = state.lantern;
  let events = 0;
  for (let i = 0; i < state.enemies.list.length; i += 1) {
    const e = state.enemies.list[i];
    if (!e.active) continue;
    if (e.flash > 0) e.flash -= dt;
    e.wobble += dt * 3;
    if (e.telegraph > 0) {
      e.telegraph -= dt;
      continue;
    }
    const t = targetOf(state, e);
    const dx = t.x - e.x;
    const dy = t.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    if (e.kind === 'shooter') {
      // Keep a ring's distance from its target and fire at the keeper.
      const want = 260;
      const toward = dist > want + 30 ? 1 : dist < want - 30 ? -1 : 0;
      const strafe = Math.sin(e.wobble * 0.6) * 0.7;
      e.x += (nx * toward - ny * strafe) * e.speed * dt;
      e.y += (ny * toward + nx * strafe) * e.speed * dt;
      e.attackTimer -= dt;
      if (e.attackTimer <= 0 && p.alive) {
        e.attackTimer = 2.1;
        fireEnemyBullet(state, e, p.x, p.y);
      }
    } else if (e.kind === 'boss') {
      e.x += nx * e.speed * dt;
      e.y += ny * e.speed * dt;
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = 2.4;
        bossSpread(state, e);
      }
    } else {
      // Chaser, tank, splitter, mote: drift toward the target with a wobble.
      const wob = Math.sin(e.wobble) * 0.45;
      e.x += (nx - ny * wob) * e.speed * dt;
      e.y += (ny + nx * wob) * e.speed * dt;
    }

    // Contact with the target: deal damage, then the attacker recoils (light
    // kinds burst on impact; tanks and the boss keep coming, with a cooldown).
    const tr = t === p ? p.radius : l.radius;
    if (dist < e.radius + tr + 2) {
      e.hitTimer -= dt;
      if (e.hitTimer <= 0) {
        e.hitTimer = 0.9;
        if (t === p) {
          if (hurtPlayer(state, e.damage)) events |= 32; // player died: handled by world
          events |= 1;
        } else {
          if (hurtLantern(state, e.damage)) events |= 32;
          events |= 2;
        }
        if (e.kind === 'chaser' || e.kind === 'mote') {
          e.hp = 0;
        } else {
          // Knock the attacker back off its target so it must approach again.
          e.x -= nx * (e.radius + tr + 8);
          e.y -= ny * (e.radius + tr + 8);
        }
      }
    }
  }
  return events;
}

function fireEnemyBullet(state, e, tx, ty) {
  const pool = state.ebullets;
  for (let i = 0; i < pool.list.length; i += 1) {
    const b = pool.list[i];
    if (b.active) continue;
    const dx = tx - e.x;
    const dy = ty - e.y;
    const d = Math.hypot(dx, dy) || 1;
    b.active = true;
    pool.count += 1;
    b.x = e.x;
    b.y = e.y;
    b.vx = (dx / d) * 240;
    b.vy = (dy / d) * 240;
    b.damage = e.damage;
    b.travelled = 0;
    b.radius = 6;
    return;
  }
}

function bossSpread(state, boss) {
  const p = state.player;
  const base = Math.atan2(p.y - boss.y, p.x - boss.x);
  for (let k = -2; k <= 2; k += 1) {
    const pool = state.ebullets;
    for (let i = 0; i < pool.list.length; i += 1) {
      const b = pool.list[i];
      if (b.active) continue;
      const a = base + k * 0.22;
      b.active = true;
      pool.count += 1;
      b.x = boss.x + Math.cos(a) * (boss.radius + 6);
      b.y = boss.y + Math.sin(a) * (boss.radius + 6);
      b.vx = Math.cos(a) * 210;
      b.vy = Math.sin(a) * 210;
      b.damage = 12;
      b.travelled = 0;
      b.radius = 7;
      break;
    }
  }
}
