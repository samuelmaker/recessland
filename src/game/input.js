let moveLeft = false;
let moveRight = false;
let moveLeftPressed = false;
let moveRightPressed = false;
let nitroHeld = false;

function onKeyDown(e) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    if (!moveLeft) moveLeftPressed = true;
    moveLeft = true;
  }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    if (!moveRight) moveRightPressed = true;
    moveRight = true;
  }
  if (e.key === 'Shift' || e.key === 'ShiftLeft' || e.key === 'ShiftRight') {
    nitroHeld = true;
  }
}

function onKeyUp(e) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveLeft = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveRight = false;
  if (e.key === 'Shift' || e.key === 'ShiftLeft' || e.key === 'ShiftRight') {
    nitroHeld = false;
  }
}

let canvas = null;
// Track touches by identifier so we know which belongs to steering vs nitro
const activeTouches = new Map(); // id -> 'steer' | 'nitro'

// Returns 'nitro' if the touch falls inside the Nitro button DOM element, else null.
function touchRegion(clientX, clientY) {
  const nitroBtn = document.getElementById('nitro-btn');
  if (nitroBtn) {
    const r = nitroBtn.getBoundingClientRect();
    // Accept a small margin to forgive near-miss presses
    const pad = 8;
    if (
      clientX >= r.left - pad && clientX <= r.right + pad &&
      clientY >= r.top - pad && clientY <= r.bottom + pad
    ) return 'nitro';
  }
  return null;
}

function onTouchStart(e) {
  if (!canvas) return;
  for (const touch of e.changedTouches) {
    const region = touchRegion(touch.clientX, touch.clientY);
    if (region === 'nitro') {
      activeTouches.set(touch.identifier, 'nitro');
      nitroHeld = true;
      continue;
    }
    // Steer: left/right half
    activeTouches.set(touch.identifier, 'steer');
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const mid = rect.width / 2;
    if (x < mid) moveLeftPressed = true;
    else moveRightPressed = true;
  }
}

function onTouchEnd(e) {
  for (const touch of e.changedTouches) {
    const kind = activeTouches.get(touch.identifier);
    activeTouches.delete(touch.identifier);
    if (kind === 'nitro') {
      // Only clear nitro if no other nitro touch is active
      let stillHeld = false;
      for (const v of activeTouches.values()) if (v === 'nitro') { stillHeld = true; break; }
      if (!stillHeld) nitroHeld = false;
    }
  }
}

// Nitro button uses mouse too (desktop testing)
function onNitroMouseDown() { nitroHeld = true; }
function onNitroMouseUp() { nitroHeld = false; }

let nitroBtnEl = null;

export function initInput(canvasEl) {
  canvas = canvasEl;
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  // Bind touch on window so the nitro button (outside canvas) is caught too.
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('touchcancel', onTouchEnd, { passive: true });

  // Re-bind mouse events each time the nitro button mounts.
  nitroBtnEl = document.getElementById('nitro-btn');
  if (nitroBtnEl) {
    nitroBtnEl.addEventListener('mousedown', onNitroMouseDown);
    window.addEventListener('mouseup', onNitroMouseUp);
  }
}

export function destroyInput() {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('touchstart', onTouchStart);
  window.removeEventListener('touchend', onTouchEnd);
  window.removeEventListener('touchcancel', onTouchEnd);
  if (nitroBtnEl) {
    nitroBtnEl.removeEventListener('mousedown', onNitroMouseDown);
    window.removeEventListener('mouseup', onNitroMouseUp);
    nitroBtnEl = null;
  }
  canvas = null;
  activeTouches.clear();
  nitroHeld = false;
}

/** Returns and clears one-shot presses */
export function consumeInput() {
  const result = {
    left: moveLeftPressed,
    right: moveRightPressed,
    nitro: nitroHeld,
  };
  moveLeftPressed = false;
  moveRightPressed = false;
  return result;
}
