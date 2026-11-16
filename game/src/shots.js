// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so the frame is what a short game really looks like and
// the same seed always gives the same frame.

import { STEP } from './config.js';
import { EVENT_WAVE_CLEAR } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Steer the keeper: kite away from the nearest wisp, hold an orbit around the
// lantern, and aim at the nearest wisp. When `passive` is true the keeper
// never shoots and never moves, so the lantern falls — the end scene. */
function autopilot(state, passive) {
  if (passive) return { dir: { x: 0, y: 0 }, aim: { x: 640, y: 360 }, firing: false };
  const p = state.player;
  let near = null;
  let nearD = Infinity;
  for (let i = 0; i < state.enemies.list.length; i += 1) {
    const e = state.enemies.list[i];
    if (!e.active || e.telegraph > 0) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearD) {
      nearD = d;
      near = e;
    }
  }
  // Orbit point: 190 from the lantern, on the far side of the nearest wisp.
  const cx = 640;
  const cy = 360;
  let tx = p.x;
  let ty = p.y;
  if (near) {
    const away = Math.atan2(p.y - near.y, p.x - near.x);
    tx = p.x + Math.cos(away) * 120;
    ty = p.y + Math.sin(away) * 120;
  }
  const ox = cx + Math.cos(state.time * 0.25) * 190;
  const oy = cy + Math.sin(state.time * 0.25) * 190;
  tx = tx * 0.55 + ox * 0.45;
  ty = ty * 0.55 + oy * 0.45;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = Math.hypot(dx, dy) || 1;
  const dir = d > 12 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 };
  const aim = near ? { x: near.x, y: near.y } : { x: cx, y: cy - 120 };
  return { dir, aim, firing: near !== null };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset(1337);
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, null, false);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    world.startRun();
    // Play until wave 2 is underway with several wisps on screen. A cleared
    // wave opens the shop in a real game, so advance past it here.
    for (let i = 0; i < 40 / STEP; i += 1) {
      const input = autopilot(state, false);
      const events = world.step(STEP, input, input.firing);
      if (events & EVENT_WAVE_CLEAR) world.nextWave();
      if (state.over || state.victory) break;
      if (state.wave >= 2 && state.enemies.count >= 6) break;
    }
    return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
  }
  // End: the keeper never fights, so the lantern falls — a real game-over frame.
  world.startRun();
  for (let i = 0; i < 300 / STEP; i += 1) {
    const input = autopilot(state, true);
    const events = world.step(STEP, input, false);
    if (events & EVENT_WAVE_CLEAR) world.nextWave();
    if (state.over) break;
  }
  return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
}
