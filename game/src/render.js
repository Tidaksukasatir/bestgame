// The renderer: everything the player sees, painted from the state in logical
// 1280x720 coordinates and scaled to the window. All art is drawn with canvas
// shapes — no image files. Screens: title, play, paused, shop, game over, victory.

import { FIELD, PALETTE } from './config.js';
import { drawHud, drawShop } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_SHOP = 'shop';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let ox = 0;
  let oy = 0;
  let cw = 0;
  let ch = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = window.innerWidth;
    ch = window.innerHeight;
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    scale = Math.min(cw / FIELD.width, ch / FIELD.height) * dpr;
    ox = (canvas.width - FIELD.width * scale) / 2;
    oy = (canvas.height - FIELD.height * scale) / 2;
  }

  window.addEventListener('resize', resize);
  resize();

  /** Convert a point in CSS pixels (relative to the canvas) to logical coords. */
  function toLogical(px, py, w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const s = Math.min(w / FIELD.width, h / FIELD.height) * dpr;
    const x0 = (w * dpr - FIELD.width * s) / 2;
    const y0 = (h * dpr - FIELD.height * s) / 2;
    return { x: (px * dpr - x0) / s, y: (py * dpr - y0) / s };
  }

  function drawBackground(state) {
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Faint ground rings around the lantern.
    ctx.strokeStyle = PALETTE.groundRing;
    ctx.lineWidth = 1;
    for (let r = 120; r <= 480; r += 120) {
      ctx.beginPath();
      ctx.arc(FIELD.width / 2, FIELD.height / 2, r, 0, 6.2832);
      ctx.stroke();
    }
    // Ambient motes.
    for (const m of state.motes) {
      const a = 0.25 + 0.2 * Math.sin(m.phase);
      ctx.globalAlpha = a;
      ctx.fillStyle = m.hue;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawLantern(state) {
    const l = state.lantern;
    const flicker = 1 + 0.04 * Math.sin(state.time * 5) + 0.03 * Math.sin(state.time * 11);
    const glowR = 230 * flicker;
    const g = ctx.createRadialGradient(l.x, l.y, 10, l.x, l.y, glowR);
    g.addColorStop(0, 'rgba(255, 217, 122, 0.34)');
    g.addColorStop(0.55, 'rgba(255, 217, 122, 0.10)');
    g.addColorStop(1, 'rgba(255, 217, 122, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(l.x - glowR, l.y - glowR, glowR * 2, glowR * 2);
    // Post, glass and flame.
    ctx.fillStyle = '#3a2f55';
    ctx.fillRect(l.x - 3, l.y + 18, 6, 26);
    ctx.fillStyle = '#241d33';
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.radius, 0, 6.2832);
    ctx.fill();
    ctx.strokeStyle = '#5a4a86';
    ctx.lineWidth = 2;
    ctx.stroke();
    const flame = 13 + 2 * Math.sin(state.time * 7);
    ctx.fillStyle = l.flash > 0 ? '#ff8ba0' : PALETTE.lanternCore;
    ctx.beginPath();
    ctx.ellipse(l.x, l.y - 2, flame * 0.62, flame, 0, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = '#ffb84d';
    ctx.beginPath();
    ctx.ellipse(l.x, l.y + 2, flame * 0.34, flame * 0.55, 0, 0, 6.2832);
    ctx.fill();
  }

  function drawWisp(x, y, r, color, time, flash, eyes) {
    // A wisp: glowing body, trailing tail, two eyes.
    const g = ctx.createRadialGradient(x, y, 1, x, y, r * 2.1);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.1, 0, 6.2832);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = flash > 0 ? '#ffffff' : color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.fill();
    // Tail.
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.9, r * 0.5, r * 0.8 + 2 * Math.sin(time * 6 + x), 0, 0, 6.2832);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (eyes) {
      ctx.fillStyle = '#0b0e1a';
      ctx.beginPath();
      ctx.arc(x - r * 0.35, y - r * 0.15, r * 0.16, 0, 6.2832);
      ctx.arc(x + r * 0.35, y - r * 0.15, r * 0.16, 0, 6.2832);
      ctx.fill();
    }
  }

  function drawWorld(state) {
    drawBackground(state);
    drawLantern(state);
    // Shards.
    for (let i = 0; i < state.shards.list.length; i += 1) {
      const s = state.shards.list[i];
      if (!s.active) continue;
      const bob = Math.sin(s.bob) * 2;
      ctx.save();
      ctx.translate(s.x, s.y + bob);
      ctx.rotate(s.bob * 0.5);
      ctx.fillStyle = PALETTE.shard;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.strokeStyle = '#d8f7ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(-4.5, -4.5, 9, 9);
      ctx.restore();
    }
    // Enemies, with a telegraph ring while they form.
    for (let i = 0; i < state.enemies.list.length; i += 1) {
      const e = state.enemies.list[i];
      if (!e.active) continue;
      if (e.telegraph > 0) {
        const frac = 1 - e.telegraph / 0.6;
        ctx.globalAlpha = 0.25 + 0.55 * frac;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 14 * (1 - frac), 0, 6.2832);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      drawWisp(e.x, e.y, e.radius, e.color, state.time + e.wobble, e.flash, true);
      // Boss crown.
      if (e.kind === 'boss') {
        ctx.fillStyle = '#ffd97a';
        ctx.beginPath();
        ctx.moveTo(e.x - 26, e.y - e.radius - 2);
        ctx.lineTo(e.x - 13, e.y - e.radius - 18);
        ctx.lineTo(e.x, e.y - e.radius - 4);
        ctx.lineTo(e.x + 13, e.y - e.radius - 18);
        ctx.lineTo(e.x + 26, e.y - e.radius - 2);
        ctx.closePath();
        ctx.fill();
      }
      // Health bar for hurt or big enemies.
      if (e.hp < e.maxHp && (e.kind === 'tank' || e.kind === 'boss' || e.kind === 'shooter')) {
        ctx.fillStyle = 'rgba(10, 12, 26, 0.7)';
        ctx.fillRect(e.x - 18, e.y - e.radius - 12, 36, 4);
        ctx.fillStyle = '#ff5d73';
        ctx.fillRect(e.x - 18, e.y - e.radius - 12, 36 * Math.max(0, e.hp / e.maxHp), 4);
      }
    }
    // Enemy bullets.
    for (let i = 0; i < state.ebullets.list.length; i += 1) {
      const b = state.ebullets.list[i];
      if (!b.active) continue;
      ctx.fillStyle = '#ff7a9e';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = '#ffd7e0';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.45, 0, 6.2832);
      ctx.fill();
    }
    // Player bullets.
    for (let i = 0; i < state.bullets.list.length; i += 1) {
      const b = state.bullets.list[i];
      if (!b.active) continue;
      ctx.fillStyle = PALETTE.bullet;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.5, 0, 6.2832);
      ctx.fill();
    }
    // The keeper (blinks while invulnerable).
    const p = state.player;
    if (p.alive && !(p.invuln > 0 && Math.floor(state.time * 14) % 2 === 0)) {
      // Aim line, faint.
      ctx.strokeStyle = 'rgba(255, 233, 168, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.aimX, p.aimY);
      ctx.stroke();
      drawWisp(p.x, p.y, p.radius, PALETTE.player, state.time, p.flash, true);
      ctx.fillStyle = PALETTE.playerCore;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, 6.2832);
      ctx.fill();
    }
    // Particles.
    for (let i = 0; i < state.particles.list.length; i += 1) {
      const pt = state.particles.list[i];
      if (!pt.active) continue;
      ctx.globalAlpha = Math.max(0, 1 - pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Floating numbers.
    ctx.textAlign = 'center';
    for (let i = 0; i < state.floats.list.length; i += 1) {
      const f = state.floats.list[i];
      if (!f.active) continue;
      ctx.globalAlpha = Math.max(0, 1 - f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.font = `700 ${f.size}px system-ui, sans-serif`;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function panel(ctx2, x, y, w, h) {
    ctx2.fillStyle = 'rgba(14, 18, 38, 0.92)';
    ctx2.fillRect(x, y, w, h);
    ctx2.strokeStyle = PALETTE.panelEdge;
    ctx2.lineWidth = 2;
    ctx2.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  function drawTitle(state, best) {
    drawWorld(state);
    ctx.fillStyle = 'rgba(8, 10, 24, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd97a';
    ctx.font = '700 76px system-ui, sans-serif';
    ctx.fillText('WISPKEEPER', FIELD.width / 2, 196);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '400 21px system-ui, sans-serif';
    ctx.fillText('Keep the last lantern lit. The Hollow sends its wisps — hold them off for 10 waves.', FIELD.width / 2, 240);
    panel(ctx, FIELD.width / 2 - 330, 282, 660, 190);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText('WASD / arrows — move        Mouse — aim        Hold click / Space — shoot', FIELD.width / 2, 322);
    ctx.fillText('P / Esc — pause        R — restart        1–6 — buy in the shop', FIELD.width / 2, 352);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '400 16px system-ui, sans-serif';
    ctx.fillText('Kill shadow wisps for light shards. Between waves, spend shards on upgrades.', FIELD.width / 2, 392);
    ctx.fillText('Chasers hunt you, tanks besiege the lantern, shooters fire from afar.', FIELD.width / 2, 420);
    ctx.fillText('Every 5th wave a Hollow Wisp boss arrives. If the lantern falls, the dark wins.', FIELD.width / 2, 446);
    ctx.fillStyle = '#ffd97a';
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText('Press Enter or click to start', FIELD.width / 2, 540);
    if (best > 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '600 16px system-ui, sans-serif';
      ctx.fillText(`Best score: ${best}`, FIELD.width / 2, 576);
    }
    ctx.textAlign = 'left';
  }

  function drawEnd(state, best, victory) {
    drawWorld(state);
    ctx.fillStyle = 'rgba(8, 10, 24, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = victory ? '#7de8a8' : '#ff5d73';
    ctx.font = '700 62px system-ui, sans-serif';
    ctx.fillText(victory ? 'THE LIGHT HOLDS' : 'THE DARK TAKES ALL', FIELD.width / 2, 210);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '400 20px system-ui, sans-serif';
    ctx.fillText(
      victory
        ? 'Ten waves broken against your lantern. The Hollow retreats — for now.'
        : state.lantern.hp <= 0
          ? 'The lantern has gone out. The wisps feast in the dark.'
          : 'The keeper has fallen, and the lantern stands unguarded.',
      FIELD.width / 2,
      252,
    );
    panel(ctx, FIELD.width / 2 - 260, 300, 520, 190);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText(`Score  ${state.score}`, FIELD.width / 2, 348);
    ctx.font = '400 18px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`Waves survived: ${victory ? 10 : state.wave}      Kills: ${state.kills}      Best combo: x${state.bestCombo}`, FIELD.width / 2, 384);
    ctx.fillText(`Best score: ${best}`, FIELD.width / 2, 416);
    ctx.fillText('Shards left unspent: ' + state.shardCount, FIELD.width / 2, 448);
    ctx.fillStyle = '#ffd97a';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('Press R or Enter to play again', FIELD.width / 2, 556);
    ctx.textAlign = 'left';
  }

  function draw(state, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05060d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? (state.rng.next() - 0.5) * state.shake : 0;
    const shakeY = state.shake > 0 ? (state.rng.next() - 0.5) * state.shake : 0;
    ctx.setTransform(scale, 0, 0, scale, ox + shakeX * scale, oy + shakeY * scale);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_OVER) drawEnd(state, best, false);
    else if (screen === SCREEN_VICTORY) drawEnd(state, best, true);
    else if (screen === SCREEN_SHOP) {
      drawWorld(state);
      drawHud(ctx, state, screen);
      drawShop(ctx, state);
    } else {
      drawWorld(state);
      drawHud(ctx, state, screen);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { draw, resize, toLogical };
}
