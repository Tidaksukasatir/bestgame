// The between-wave shop: six upgrades, bought with light shards. Prices rise
// with the level already owned; each item has a cap. Buying applies at once.

import { SHOP } from './config.js';
import { healPlayer } from './player.js';

export const SHOP_ITEMS = SHOP.items;

export function shopPrice(item, level) {
  return item.base + level * Math.ceil(item.base * 0.6);
}

export function canBuy(state, item) {
  const level = state.upgrades[item.id];
  return level < item.max && state.shardCount >= shopPrice(item, level);
}

/** Buy an upgrade by id. Returns 'ok', 'maxed' or 'poor'. */
export function buyUpgrade(state, id) {
  const item = SHOP_ITEMS.find((it) => it.id === id);
  if (!item) return 'poor';
  const level = state.upgrades[item.id];
  if (level >= item.max) return 'maxed';
  const price = shopPrice(item, level);
  if (state.shardCount < price) return 'poor';
  state.shardCount -= price;
  state.upgrades[item.id] = level + 1;
  if (item.id === 'health') {
    state.player.maxHp += 25;
    healPlayer(state, 25);
  }
  return 'ok';
}
