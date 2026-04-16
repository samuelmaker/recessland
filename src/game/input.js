let moveLeft = false;
let moveRight = false;
let moveLeftPressed = false;
let moveRightPressed = false;

function onKeyDown(e) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    if (!moveLeft) moveLeftPressed = true;
    moveLeft = true;
  }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    if (!moveRight) moveRightPressed = true;
    moveRight = true;
  }
}

function onKeyUp(e) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveLeft = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveRight = false;
}

let canvas = null;

function onTouchStart(e) {
  if (!canvas) return;
  for (const touch of e.changedTouches) {
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const mid = rect.width / 2;
    if (x < mid) moveLeftPressed = true;
    else moveRightPressed = true;
  }
}

export function initInput(canvasEl) {
  canvas = canvasEl;
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
}

export function destroyInput() {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  if (canvas) canvas.removeEventListener('touchstart', onTouchStart);
  canvas = null;
}

/** Returns and clears one-shot presses */
export function consumeInput() {
  const result = {
    left: moveLeftPressed,
    right: moveRightPressed,
  };
  moveLeftPressed = false;
  moveRightPressed = false;
  return result;
}
