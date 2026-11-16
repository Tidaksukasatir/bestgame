// The keeper's lantern-shot: firing with a spread for multishot, bullet flight,
// piercing, and hit resolution against enemies. Bullets come from the pool.

import { WEAPON } from './config.js';
import { killEnemy } from './enemies.js';
import { hurtLantern, hurtPlayer } from './player.js';

export function weaponDamage(state) {
  return Math.round(WEAPON.damage * (1 + 0.25 * state.upgrades.damage));
}

export function weaponInterval(state) {
  return WEAPON.interval / (1 + 0.2 * state.upgrades.fireRate);
}

export function weaponShots(state) {
  return 1 + state.upgrades.multishot;
}

/** Fire one volley toward the aim point (multishot fans the extra bullets). */
export function fireWeapon(state) {
  const p = state.player;
  const n = weaponShots(state);
  const base = Math.atan2(p.aimY - p.y, p.aimX - p.x);
  const damage = weaponDamage(state);
  const pierce = state.upgrades.pierce;
  let fired = 0;
  for (let k = 0; k < n; k += 1) {
    const off = (k - (n - 1) / 2) * 0.16;
    const a = base + off;
    for (let i = 0; i < state.bullets.list.length; i += 1) {
      const b = state.bullets.list[i];
      if (b.active) continue;
      b.active = true;
      state.bullets.count += 1;
      b.x = p.x + Math.cos(a) * (p.radius + 6);
      b.y = p.y + Math.sin(a) * (p.radius + 6);
      b.vx = Math.cos(a) * WEAPON.bulletSpeed;
      b.vy = Math.sin(a) * WEAPON.bulletSpeed;
      b.damage = damage;
      b.pierce = pierce;
      b.travelled = 0;
      b.radius = WEAPON.bulletRadius;
      fired += 1;
      break;
    }
  }
  return fired;
}

/** Move bullets, expire them past range, and resolve hits. Returns event bits. */
export function updateBullets(state, dt) {
  let events = 0;
  for (let i = 0; i < state.bullets.list.length; i += 1) {
    const b = state.bullets.list[i];
    if (!b.active) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.travelled += WEAPON.bulletSpeed * dt;
    if (b.travelled > WEAPON.range || b.x < -20 || b.x > 1300 || b.y < -20 || b.y > 740) {
      b.active = false;
      state.bullets.count -= 1;
      continue;
    }
    for (let j = 0; j < state.enemies.list.length; j += 1) {
      const e = state.enemies.list[j];
      if (!e.active || e.telegraph > 0) continue;
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      const rr = e.radius + b.radius;
      if (dx * dx + dy * dy > rr * rr) continue;
      e.hp -= b.damage;
      e.flash = 0.12;
      addFloat(state, e.x, e.y - e.radius - 6, String(b.damage), '#ffe9a8', 15);
      events |= 512; // a bullet landed
      spawnHitSparks(state, b.x, b.y, e.color);
      if (b.pierce > 0) {
        b.pierce -= 1;
      } else {
        b.active = false;
        state.bullets.count -= 1;
      }
      break;
    }
  }
  return events;
}

/** Move enemy bullets and resolve hits on the player and the lantern. */
export function updateEnemyBullets(state, dt) {
  let events = 0;
  const p = state.player;
  const l = state.lantern;
  for (let i = 0; i < state.ebullets.list.length; i += 1) {
    const b = state.ebullets.list[i];
    if (!b.active) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.travelled += 240 * dt;
    if (b.travelled > 700 || b.x < -20 || b.x > 1300 || b.y < -20 || b.y > 740) {
      b.active = false;
      state.ebullets.count -= 1;
      continue;
    }
    if (p.alive) {
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const rr = p.radius + b.radius;
      if (dx * dx + dy * dy < rr * rr) {
        b.active = false;
        state.ebullets.count -= 1;
        hurtPlayer(state, b.damage);
        events |= 1;
        continue;
      }
    }
    const dx = l.x - b.x;
    const dy = l.y - b.y;
    const rr = l.radius + b.radius;
    if (dx * dx + dy * dy < rr * rr) {
      b.active = false;
      state.ebullets.count -= 1;
      hurtLantern(state, b.damage);
      events |= 2;
    }
  }
  return events;
}

/** Floating damage / pickup numbers, from the pool. */
export function addFloat(state, x, y, text, color, size) {
  for (let i = 0; i < state.floats.list.length; i += 1) {
    const f = state.floats.list[i];
    if (f.active) continue;
    f.active = true;
    state.floats.count += 1;
    f.x = x;
    f.y = y;
    f.life = 0;
    f.maxLife = 0.8;
    f.text = text;
    f.color = color;
    f.size = size;
    return;
  }
}

export function spawnHitSparks(state, x, y, color) {
  for (let k = 0; k < 4; k += 1) {
    for (let i = 0; i < state.particles.list.length; i += 1) {
      const pt = state.particles.list[i];
      if (pt.active) continue;
      pt.active = true;
      state.particles.count += 1;
      const a = state.rng.range(0, 6.283);
      const sp = state.rng.range(60, 200);
      pt.x = x;
      pt.y = y;
      pt.vx = Math.cos(a) * sp;
      pt.vy = Math.sin(a) * sp;
      pt.life = 0;
      pt.maxLife = state.rng.range(0.2, 0.4);
      pt.size = state.rng.range(2, 4);
      pt.color = color;
      pt.drag = 0.86;
      break;
    }
  }
}

export function spawnDeathBurst(state, x, y, color, count) {
  for (let k = 0; k < count; k += 1) {
    for (let i = 0; i < state.particles.list.length; i += 1) {
      const pt = state.particles.list[i];
      if (pt.active) continue;
      pt.active = true;
      state.particles.count += 1;
      const a = state.rng.range(0, 6.283);
      const sp = state.rng.range(40, 260);
      pt.x = x;
      pt.y = y;
      pt.vx = Math.cos(a) * sp;
      pt.vy = Math.sin(a) * sp;
      pt.life = 0;
      pt.maxLife = state.rng.range(0.3, 0.7);
      pt.size = state.rng.range(2, 6);
      pt.color = k % 3 === 0 ? '#ffe9a8' : color;
      pt.drag = 0.88;
      break;
    }
  }
}

export { killEnemy };
