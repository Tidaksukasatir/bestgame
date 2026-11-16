// Keyboard + mouse input. Movement keys are read every step; one-shot actions
// (confirm, pause, restart, shop keys, clicks) are queued as a bitmask the main
// loop consumes once per frame.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_SHOP_CONTINUE = 8;

export function createInput(canvas, toLogical) {
  const keys = new Set();
  let queued = 0;
  let shopKey = '';
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let clicked = false;
  let clickX = 0;
  let clickY = 0;

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  window.addEventListener('keydown', (event) => {
    const k = keyName(event);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(k);
    if (k === 'Enter' || k === ' ') queued |= ACTION_CONFIRM;
    if (k === 'p' || k === 'Escape') queued |= ACTION_PAUSE;
    if (k === 'r') queued |= ACTION_RESTART;
    if (k >= '1' && k <= '6') shopKey = k;
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(keyName(event));
  });
  window.addEventListener('blur', () => {
    keys.clear();
    mouseDown = false;
  });

  function updateMouse(event) {
    const rect = canvas.getBoundingClientRect();
    const p = toLogical(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
    mouseX = p.x;
    mouseY = p.y;
  }

  canvas.addEventListener('mousemove', updateMouse);
  canvas.addEventListener('mousedown', (event) => {
    updateMouse(event);
    mouseDown = true;
    clicked = true;
    clickX = mouseX;
    clickY = mouseY;
  });
  window.addEventListener('mouseup', () => {
    mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** Normalised movement direction from WASD / arrows. */
    direction() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        x *= 0.7071;
        y *= 0.7071;
      }
      return { x, y };
    },
    /** Aim point in logical coordinates (the mouse). */
    aim() {
      return { x: mouseX, y: mouseY };
    },
    get firing() {
      return mouseDown || keys.has(' ');
    },
    takeActions() {
      const a = queued;
      queued = 0;
      return a;
    },
    takeShopKey() {
      const k = shopKey;
      shopKey = '';
      return k;
    },
    takeClick() {
      if (!clicked) return null;
      clicked = false;
      return { x: clickX, y: clickY };
    },
    /** True while any movement key is held (lets the title screen skip its demo). */
    get anyKey() {
      return keys.size > 0;
    },
  };
}
