// The HUD: health bars, wave / score / shards / combo, the boss bar, upgrade
// pips, and the shop's layout (shared with the renderer so clicks land where
// the buttons are drawn). All drawing is in logical 1280x720 coordinates.

import { FIELD, PALETTE } from './config.js';
import { SHOP_ITEMS as ITEMS, canBuy, shopPrice } from './shop.js';
import { weaponDamage, weaponInterval, weaponShots } from './weapons.js';

export function bar(ctx, x, y, w, h, frac, fill, back, edge) {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

export function drawHud(ctx, state, screen) {
  const p = state.player;
  const l = state.lantern;
  ctx.textBaseline = 'alphabetic';

  // Top-left: keeper health + lantern health.
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('KEEPER', 20, 26);
  bar(ctx, 20, 32, 220, 14, p.hp / p.maxHp, '#ffd97a', '#241d33', '#3a2f55');
  ctx.fillStyle = PALETTE.text;
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 248, 44);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText('LANTERN', 20, 66);
  bar(ctx, 20, 72, 220, 14, l.hp / l.maxHp, l.hp / l.maxHp < 0.3 ? '#ff5d73' : '#7de8ff', '#1a2438', '#2c3a5e');
  ctx.fillStyle = PALETTE.text;
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(`${Math.ceil(l.hp)} / ${l.maxHp}`, 248, 84);

  // Top-right: wave, score, shards, combo.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText(`WAVE ${Math.max(1, state.wave)} / 10`, FIELD.width - 20, 40);
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`SCORE  ${state.score}`, FIELD.width - 20, 64);
  ctx.fillStyle = '#7de8ff';
  ctx.fillText(`◆ ${state.shardCount} shards`, FIELD.width - 20, 86);
  if (state.combo >= 3) {
    ctx.fillStyle = '#ffd97a';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText(`COMBO x${(1 + Math.min(2, state.combo * 0.05)).toFixed(2)}  (${state.combo})`, FIELD.width - 20, 110);
  }
  ctx.textAlign = 'left';

  // Bottom-left: weapon readout.
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  const dmg = weaponDamage(state);
  const rate = (1 / weaponInterval(state)).toFixed(1);
  ctx.fillText(`DMG ${dmg}   •   ${rate}/s   •   x${weaponShots(state)} shot   •   pierce ${state.upgrades.pierce}`, 20, FIELD.height - 18);

  // Boss bar, top-centre, while a boss lives.
  if (state.boss && state.boss.active) {
    const b = state.boss;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff8ba0';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText('HOLLOW WISP — BOSS', FIELD.width / 2, 30);
    bar(ctx, FIELD.width / 2 - 220, 38, 440, 12, b.hp / b.maxHp, '#e84e6e', '#2a1420', '#5e2436');
    ctx.textAlign = 'left';
  }

  if (screen === 'paused') {
    ctx.fillStyle = 'rgba(8, 10, 24, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 54px system-ui, sans-serif';
    ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 10);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '400 18px system-ui, sans-serif';
    ctx.fillText('Press P or Esc to keep playing', FIELD.width / 2, FIELD.height / 2 + 30);
    ctx.textAlign = 'left';
  }
}

/** The shop's six card rectangles, in logical coordinates. */
export function shopLayout() {
  const rects = [];
  const w = 330;
  const h = 118;
  const gapX = 24;
  const gapY = 18;
  const x0 = (FIELD.width - (w * 2 + gapX)) / 2;
  const y0 = 218;
  for (let i = 0; i < ITEMS.length; i += 1) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    rects.push({ item: ITEMS[i], x: x0 + col * (w + gapX), y: y0 + row * (h + gapY), w, h });
  }
  return rects;
}

export function drawShop(ctx, state) {
  ctx.fillStyle = 'rgba(8, 10, 24, 0.78)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 44px system-ui, sans-serif';
  ctx.fillText(`WAVE ${state.wave} CLEARED`, FIELD.width / 2, 92);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '400 18px system-ui, sans-serif';
  ctx.fillText(`The lantern holds. Spend your light shards, then face wave ${state.wave + 1}.`, FIELD.width / 2, 126);
  ctx.fillStyle = '#7de8ff';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText(`◆ ${state.shardCount} shards`, FIELD.width / 2, 164);
  ctx.textAlign = 'left';

  for (const rect of shopLayout()) {
    const item = rect.item;
    const level = state.upgrades[item.id];
    const price = shopPrice(item, level);
    const afford = canBuy(state, item);
    const maxed = level >= item.max;
    ctx.fillStyle = afford ? '#1b2342' : '#141828';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = afford ? '#3a4a86' : '#262c48';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillText(`[${item.key}]  ${item.name}`, rect.x + 16, rect.y + 30);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '400 14px system-ui, sans-serif';
    ctx.fillText(item.desc, rect.x + 16, rect.y + 54);
    ctx.fillStyle = maxed ? PALETTE.muted : '#7de8ff';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(maxed ? 'MAXED' : `◆ ${price}`, rect.x + 16, rect.y + 82);
    // Level pips.
    for (let k = 0; k < item.max; k += 1) {
      ctx.fillStyle = k < level ? '#ffd97a' : '#2c3460';
      ctx.fillRect(rect.x + 16 + k * 14, rect.y + 94, 10, 8);
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillText('Press 1–6 or click a card to buy — Enter to start the next wave', FIELD.width / 2, FIELD.height - 36);
  ctx.textAlign = 'left';
}

export { ITEMS as SHOP_ITEMS };
