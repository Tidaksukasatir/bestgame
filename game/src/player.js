// The lantern-keeper: movement, taking hits, and the numbers the weapon reads.
// Movement is clamped to the field and slowed nowhere: the keeper answers at once.

import { FIELD, PLAYER } from './config.js';

/** Move the player from input; returns nothing, mutates state.player. */
export function updatePlayer(state, dir, dt) {
  const p = state.player;
  if (!p.alive) return;
  const speed = p.speed * (1 + 0.12 * state.upgrades.speed);
  p.x = Math.min(FIELD.width - p.radius, Math.max(p.radius, p.x + dir.x * speed * dt));
  p.y = Math.min(FIELD.height - p.radius, Math.max(p.radius, p.y + dir.y * speed * dt));
  if (p.invuln > 0) p.invuln -= dt;
  if (p.flash > 0) p.flash -= dt;
}

/** Damage the player; returns true when this hit killed them. */
export function hurtPlayer(state, damage) {
  const p = state.player;
  if (!p.alive || p.invuln > 0) return false;
  p.hp -= damage;
  p.invuln = PLAYER.invuln;
  p.flash = 0.25;
  state.shake = Math.max(state.shake, 9);
  state.combo = 0;
  state.comboTimer = 0;
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    return true;
  }
  return false;
}

/** Damage the lantern; returns true when it fell. */
export function hurtLantern(state, damage) {
  const l = state.lantern;
  l.hp -= damage;
  l.flash = 0.3;
  state.shake = Math.max(state.shake, 7);
  if (l.hp <= 0) {
    l.hp = 0;
    return true;
  }
  return false;
}

export function healPlayer(state, amount) {
  const p = state.player;
  p.hp = Math.min(p.maxHp, p.hp + amount);
}
