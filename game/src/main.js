// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play,
// paused, shop, game over and victory.
//
// ?seed=N fixes the run's randomness. ?shot=start|play|end stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for
// a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createWorld, EVENT_ENEMY_DIED, EVENT_HIT_LANTERN, EVENT_HIT_PLAYER, EVENT_OVER, EVENT_SHOOT, EVENT_VICTORY, EVENT_WAVE_CLEAR } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';
import { shopLayout } from './hud.js';
import { SHOP_ITEMS, buyUpgrade } from './shop.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();
let lastHitSound = 0;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (px, py, w, h) => renderer.toLogical(px, py, w, h));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset(Math.floor(Math.random() * 4294967296));
    world.startRun();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.waveStart();
    announce('Playing. Defend the lantern for 10 waves.');
  }

  function endGame(victory) {
    screen = victory ? SCREEN_VICTORY : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (victory) audio.victory();
    else audio.gameOver();
    announce(victory ? `Victory. Score ${world.state.score}.` : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function playSounds(events) {
    const now = performance.now();
    if (events & EVENT_SHOOT) audio.shoot();
    if (events & 512 && now - lastHitSound > 70) {
      lastHitSound = now;
      audio.hit();
    }
    if (events & EVENT_ENEMY_DIED) audio.enemyDie();
    if (events & EVENT_HIT_PLAYER) audio.hurt();
    if (events & EVENT_HIT_LANTERN) audio.hurt();
    if (events & EVENT_WAVE_CLEAR) audio.waveClear();
  }

  function handleShopInput() {
    const key = input.takeShopKey();
    if (key) {
      const item = SHOP_ITEMS.find((it) => it.key === key);
      if (item) {
        const result = buyUpgrade(world.state, item.id);
        if (result === 'ok') audio.buy();
        else audio.denied();
      }
    }
    const click = input.takeClick();
    if (click) {
      for (const rect of shopLayout()) {
        if (click.x >= rect.x && click.x <= rect.x + rect.w && click.y >= rect.y && click.y <= rect.y + rect.h) {
          const result = buyUpgrade(world.state, rect.item.id);
          if (result === 'ok') audio.buy();
          else audio.denied();
          break;
        }
      }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM || input.takeClick()) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (actions & ACTION_RESTART) {
        startGame();
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (actions & ACTION_RESTART) {
        startGame();
      }
    } else if (screen === SCREEN_SHOP) {
      handleShopInput();
      if (actions & ACTION_CONFIRM) {
        audio.unlock();
        world.nextWave();
        screen = SCREEN_PLAY;
        audio.waveStart();
        announce(`Wave ${world.state.wave}.`);
      }
    } else if (screen === SCREEN_OVER || screen === SCREEN_VICTORY) {
      if (actions & (ACTION_RESTART | ACTION_CONFIRM) || input.takeClick()) startGame();
    }
    // A shop click is consumed in the shop; anywhere else a stray click is dropped.
    if (screen !== SCREEN_SHOP) input.takeClick();
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, null, false);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const dir = input.direction();
    const aim = input.aim();
    const events = world.step(STEP, { dir, aim }, input.firing);
    playSounds(events);
    if (events & EVENT_OVER) endGame(false);
    else if (events & EVENT_VICTORY) endGame(true);
    else if (events & EVENT_WAVE_CLEAR) {
      screen = SCREEN_SHOP;
      announce(`Wave ${world.state.wave} cleared. Spend your shards.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting wisps swarm unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Wispkeeper. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
