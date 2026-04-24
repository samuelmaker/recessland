import {
  BASE_W, BASE_H,
  LANE_COUNT, LANE_WIDTH, ROAD_LEFT, ROAD_WIDTH,
  COL,
} from './constants.js';
import { BUMPER_PALETTES } from './entities.js';

// ─── Basic helpers ───────────────────────────────────────────────────────────

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function circle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function glow(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function noGlow(ctx) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// Seeded-ish pseudo random for stars (deterministic per position)
function starHash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) & 0xffff;
}

// Flicker envelope (low-freq sine × occasional brownout)
export function flickerNeon(frame, seed = 0, baseAlpha = 1) {
  const sine = 0.92 + Math.sin(frame * 0.1 + seed) * 0.08;
  const brownout = (starHash(Math.floor(frame / 7), seed) % 100 < 3) ? 0.6 : 1;
  return baseAlpha * sine * brownout;
}

export function drawNeonDot(ctx, x, y, r, color, blur = 6) {
  glow(ctx, color, blur);
  circle(ctx, x, y, r, color);
  noGlow(ctx);
}

// ─── Offscreen sprite caches ─────────────────────────────────────────────────

let caches = null;

function buildSpriteCache(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const cx = c.getContext('2d');
  drawFn(cx, w, h);
  return c;
}

export function initRenderer() {
  if (caches) return;
  caches = {
    ferrisWheel: buildFerrisWheel(),
    smallFerris: buildSmallFerris(),
    skyline: buildSkyline(),
    finishArch: buildFinishArch(),
    player: buildPlayerSprite(),
    rivals: buildRivalSprites(),
    arcadeBooth: buildArcadeBoothBody(),
  };
}

function ensureCaches() {
  if (!caches) initRenderer();
}

// ─── Exhaust particle pool ───────────────────────────────────────────────────

const MAX_EXHAUST = 120;
let exhaustParticles = [];

export function resetExhaustParticles() {
  exhaustParticles = [];
}

export function emitExhaust(entity, color) {
  if (exhaustParticles.length >= MAX_EXHAUST) return;
  exhaustParticles.push({
    x: entity.x + (Math.random() - 0.5) * 10,
    y: entity.y + entity.h / 2 - 2,
    vy: -0.6 - Math.random() * 0.8,
    vx: (Math.random() - 0.5) * 0.3,
    life: 18 + Math.random() * 8,
    maxLife: 26,
    color: color || (Math.random() < 0.5 ? '#FF3FA0' : '#5EE8FF'),
  });
}

export function drawExhaustParticles(ctx) {
  if (exhaustParticles.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of exhaustParticles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = a * 0.6;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function stepExhaustParticles(dt) {
  for (const p of exhaustParticles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  exhaustParticles = exhaustParticles.filter(p => p.life > 0);
}

// ─── Sky (deep-night pier) ──────────────────────────────────────────────────

function buildSkyline() {
  return buildSpriteCache(BASE_W, 40, (cx, w, h) => {
    // Distant pier buildings silhouette
    const heights = [18, 26, 14, 32, 20, 28, 16, 24, 22, 30, 15, 26, 18, 22];
    let x = 0;
    let i = 0;
    while (x < w) {
      const bw = 24 + (i % 3) * 8;
      const bh = heights[i % heights.length];
      // Body
      cx.fillStyle = '#12043A';
      cx.fillRect(x, h - bh, bw, bh);
      // Pink rim on top edge
      cx.fillStyle = '#D04A9A';
      cx.globalAlpha = 0.55;
      cx.fillRect(x, h - bh, bw, 1);
      cx.globalAlpha = 1;
      // Windows
      cx.fillStyle = i % 2 === 0 ? '#FFE6A6' : '#9EEBFF';
      cx.globalAlpha = 0.5;
      for (let wy = h - bh + 4; wy < h - 4; wy += 6) {
        for (let wx = x + 3; wx < x + bw - 3; wx += 6) {
          if (starHash(wx, wy) % 3 === 0) cx.fillRect(wx, wy, 2, 2);
        }
      }
      cx.globalAlpha = 1;
      x += bw;
      i++;
    }
  });
}

export function drawSky(ctx, frame) {
  ensureCaches();

  // Night-pier gradient
  const grad = ctx.createLinearGradient(0, 0, 0, BASE_H);
  grad.addColorStop(0.00, COL.nightSky1);
  grad.addColorStop(0.35, COL.nightSky2);
  grad.addColorStop(0.60, COL.nightSky3);
  grad.addColorStop(0.80, COL.nightSky4);
  grad.addColorStop(0.95, COL.nightSky5);
  grad.addColorStop(1.00, COL.nightSky6);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Bokeh orbs (soft additive colour blobs)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bokehColors = ['#FF3FA0', '#5EE8FF', '#9A50FF', '#FFE455', '#FF3FA0', '#5EE8FF'];
  for (let i = 0; i < 6; i++) {
    const bx = (starHash(i, 30) % BASE_W);
    const by = (starHash(i, 31) % Math.floor(BASE_H * 0.65));
    const br = 30 + (starHash(i, 32) % 40);
    ctx.fillStyle = bokehColors[i % bokehColors.length];
    ctx.globalAlpha = 0.08 + (starHash(i, 33) % 8) * 0.01;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // Stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 60; i++) {
    const sx = starHash(i, 0) % BASE_W;
    const sy = starHash(i, 1) % Math.floor(BASE_H * 0.55);
    const brightness = 0.25 + 0.5 * ((starHash(i, 2) % 100) / 100);
    const twinkle = Math.sin(frame * 0.02 + i * 1.7) * 0.3 + 0.7;
    ctx.globalAlpha = brightness * twinkle;
    const big = starHash(i, 3) % 7 === 0;
    if (big) {
      // 4-point cross
      ctx.fillRect(sx - 1, sy, 3, 1);
      ctx.fillRect(sx, sy - 1, 1, 3);
    } else {
      const size = (starHash(i, 3) % 3 === 0) ? 2 : 1;
      ctx.fillRect(sx, sy, size, size);
    }
  }
  ctx.globalAlpha = 1;

  // Crescent moon
  const moonX = BASE_W * 0.18;
  const moonY = BASE_H * 0.18;
  glow(ctx, '#9EEBFF', 14);
  circle(ctx, moonX, moonY, 16, '#F6E6B0');
  noGlow(ctx);
  // Carve crescent by overpainting with sky-ish dark
  circle(ctx, moonX + 6, moonY - 3, 14, COL.nightSky2);

  // Skyline silhouette
  ctx.drawImage(caches.skyline, 0, BASE_H * 0.38);
  // Neon horizon accent
  ctx.save();
  ctx.strokeStyle = COL.neonMagenta;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  glow(ctx, COL.neonMagenta, 10);
  ctx.beginPath();
  ctx.moveTo(0, BASE_H * 0.42);
  ctx.lineTo(BASE_W, BASE_H * 0.42);
  ctx.stroke();
  noGlow(ctx);
  ctx.restore();

  // 2 seagulls
  ctx.strokeStyle = '#1a0a2e';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 2; i++) {
    const gx = (frame * 0.1 + i * 180) % (BASE_W + 40) - 20;
    const gy = 70 + i * 45;
    const wingY = Math.sin(frame * 0.04 + i * 2) * 3;
    ctx.beginPath();
    ctx.moveTo(gx - 6, gy + wingY);
    ctx.quadraticCurveTo(gx - 2, gy - 4 + wingY, gx, gy + wingY);
    ctx.quadraticCurveTo(gx + 2, gy - 4 + wingY, gx + 6, gy + wingY);
    ctx.stroke();
  }
}

// ─── Background Ferris Wheel (hero visual) ──────────────────────────────────

const BIG_WHEEL = {
  cx: BASE_W * 0.72,
  cy: BASE_H * 0.28,
  r: 100,
  bulbs: 32,
};

function buildFerrisWheel() {
  const size = BIG_WHEEL.r * 2 + 40;
  return buildSpriteCache(size, size, (cx, w, h) => {
    const ccx = w / 2;
    const ccy = h / 2;
    const r = BIG_WHEEL.r;

    // Spokes
    cx.strokeStyle = '#5A3A80';
    cx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      cx.beginPath();
      cx.moveTo(ccx, ccy);
      cx.lineTo(ccx + Math.cos(a) * r, ccy + Math.sin(a) * r);
      cx.stroke();
    }

    // Inner rim (cool accent)
    cx.globalAlpha = 0.6;
    cx.strokeStyle = '#7EE8FF';
    cx.lineWidth = 1;
    cx.beginPath();
    cx.arc(ccx, ccy, r - 4, 0, Math.PI * 2);
    cx.stroke();
    cx.globalAlpha = 1;

    // Outer rim
    glow(cx, '#FFF2C2', 8);
    cx.strokeStyle = '#FFF2C2';
    cx.lineWidth = 2.5;
    cx.beginPath();
    cx.arc(ccx, ccy, r, 0, Math.PI * 2);
    cx.stroke();
    noGlow(cx);

    // Gondolas
    const gondolaColors = ['#FF3FA0', '#5EE8FF', '#FFE455', '#C0634A', '#9A50FF', '#5EE8FF'];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + Math.PI / 2;
      const gx = ccx + Math.cos(a) * (r + 6);
      const gy = ccy + Math.sin(a) * (r + 6);
      // Hanger
      cx.strokeStyle = '#7A5AA8';
      cx.lineWidth = 1;
      cx.beginPath();
      cx.moveTo(ccx + Math.cos(a) * r, ccy + Math.sin(a) * r);
      cx.lineTo(gx, gy);
      cx.stroke();
      // Car
      cx.fillStyle = gondolaColors[i];
      roundRectPath(cx, gx - 5, gy - 3, 10, 8, 2);
      cx.fill();
      cx.fillStyle = '#1a0a2e';
      cx.fillRect(gx - 3, gy - 1, 6, 2);
    }

    // Bulbs around rim
    for (let i = 0; i < BIG_WHEEL.bulbs; i++) {
      const a = (Math.PI * 2 * i) / BIG_WHEEL.bulbs;
      const bx = ccx + Math.cos(a) * r;
      const by = ccy + Math.sin(a) * r;
      const warm = i % 2 === 0;
      const color = warm ? COL.wheelWarm : COL.wheelCool;
      // Halo
      cx.globalAlpha = 0.35;
      cx.fillStyle = color;
      cx.beginPath();
      cx.arc(bx, by, 5, 0, Math.PI * 2);
      cx.fill();
      cx.globalAlpha = 1;
      // Core
      cx.fillStyle = color;
      cx.beginPath();
      cx.arc(bx, by, 2.5, 0, Math.PI * 2);
      cx.fill();
    }

    // Central hub
    cx.fillStyle = '#1a0a2e';
    cx.beginPath();
    cx.arc(ccx, ccy, 12, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = '#7EE8FF';
    cx.beginPath();
    cx.arc(ccx, ccy, 4, 0, Math.PI * 2);
    cx.fill();
  });
}

export function drawBackgroundFerrisWheel(ctx, frame) {
  ensureCaches();
  const img = caches.ferrisWheel;
  const s = img.width;
  const angle = frame * 0.004;

  ctx.save();
  ctx.translate(BIG_WHEEL.cx, BIG_WHEEL.cy);
  ctx.rotate(angle);
  ctx.drawImage(img, -s / 2, -s / 2);
  ctx.restore();

  // 4 live flicker bulbs on top (in world space, at rotated bulb positions)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) {
    const idx = starHash(frame >> 4, k) % BIG_WHEEL.bulbs;
    const a = (Math.PI * 2 * idx) / BIG_WHEEL.bulbs + angle;
    const bx = BIG_WHEEL.cx + Math.cos(a) * BIG_WHEEL.r;
    const by = BIG_WHEEL.cy + Math.sin(a) * BIG_WHEEL.r;
    const alpha = flickerNeon(frame, k, 1);
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = k % 2 === 0 ? COL.wheelWarm : COL.wheelCool;
    ctx.beginPath();
    ctx.arc(bx, by, 4 + (k % 2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ─── Ground (pier deck side strips) ──────────────────────────────────────────

export function drawGround(ctx, scrollY) {
  const sideW = ROAD_LEFT;
  const rightX = ROAD_LEFT + ROAD_WIDTH;
  const rightW = BASE_W - rightX;

  // Dark boardwalk base on sides
  rect(ctx, 0, 0, sideW, BASE_H, '#0F0620');
  rect(ctx, rightX, 0, rightW, BASE_H, '#0F0620');

  // Subtle scrolling stripes to suggest boardwalk planks
  ctx.fillStyle = '#1D0B38';
  const stripeH = 24;
  const offset = scrollY % stripeH;
  for (let y = -stripeH + offset; y < BASE_H + stripeH; y += stripeH) {
    ctx.fillRect(0, y, sideW, 2);
    ctx.fillRect(rightX, y, rightW, 2);
  }

  // Scattered warm sparkle flecks (subtle)
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 6; i++) {
    const px = starHash(i, 10) % (sideW - 6) + 3;
    const py = ((starHash(i, 11) % BASE_H) + scrollY * 0.5) % (BASE_H + 20) - 10;
    ctx.fillStyle = '#FFE0A0';
    ctx.fillRect(px, py, 1, 1);

    const rpx = rightX + (starHash(i, 12) % (rightW - 6)) + 3;
    const rpy = ((starHash(i, 13) % BASE_H) + scrollY * 0.5) % (BASE_H + 20) - 10;
    ctx.fillStyle = '#FFE0A0';
    ctx.fillRect(rpx, rpy, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Darker rim near the road edge
  ctx.globalAlpha = 0.4;
  rect(ctx, sideW - 4, 0, 4, BASE_H, '#05010F');
  rect(ctx, rightX, 0, 4, BASE_H, '#05010F');
  ctx.globalAlpha = 1;
}

export function drawFence() {}

// ─── Road (neon pier deck) ──────────────────────────────────────────────────

export function drawRoad(ctx, scrollY, frame = 0) {
  // Deck vertical gradient — darker wet asphalt with purple hue
  const grad = ctx.createLinearGradient(ROAD_LEFT, 0, ROAD_LEFT + ROAD_WIDTH, 0);
  grad.addColorStop(0, COL.deckWetDark);
  grad.addColorStop(0.5, COL.deckWetMid);
  grad.addColorStop(1, COL.deckWetDark);
  ctx.fillStyle = grad;
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, BASE_H);

  // Reflective neon streaks on wet asphalt (additive magenta + cyan)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const streakCount = 5;
  for (let i = 0; i < streakCount; i++) {
    const t = i / streakCount;
    const sx = ROAD_LEFT + ROAD_WIDTH * (0.08 + t * 0.84);
    const colorA = i % 2 === 0 ? COL.roadReflectMagenta : COL.roadReflectCyan;
    ctx.fillStyle = colorA;
    ctx.globalAlpha = 0.12;
    // Thin vertical streak that scrolls
    const yOff = (scrollY * 0.8 + i * 53) % 80;
    for (let y = -80 + yOff; y < BASE_H + 80; y += 80) {
      ctx.fillRect(sx - 1, y, 2, 60);
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // Plank lines across road (fainter now — just subtle seams)
  ctx.fillStyle = '#05030F';
  ctx.globalAlpha = 0.25;
  const plankPeriod = 40;
  const plankOffset = scrollY % plankPeriod;
  for (let y = -plankPeriod + plankOffset; y < BASE_H + plankPeriod; y += plankPeriod) {
    ctx.fillRect(ROAD_LEFT, y, ROAD_WIDTH, 1);
  }
  ctx.globalAlpha = 1;

  // Road edge strips (subtle warm rim)
  rect(ctx, ROAD_LEFT - 2, 0, 3, BASE_H, '#4A2545');
  rect(ctx, ROAD_LEFT + ROAD_WIDTH - 1, 0, 3, BASE_H, '#4A2545');

  // Warm incandescent edge bulbs (like a real fairground)
  const bigPeriod = 50;
  const bigOffset = scrollY % bigPeriod;
  const smallPeriod = 16;
  const smallOffset = scrollY % smallPeriod;

  // Small dim bulbs (every 16px)
  for (let y = -smallPeriod + smallOffset; y < BASE_H; y += smallPeriod) {
    const flicker = flickerNeon(frame, y, 1);
    ctx.globalAlpha = flicker * 0.7;
    circle(ctx, ROAD_LEFT + 1, y, 1.2, '#FFE0A0');
    circle(ctx, ROAD_LEFT + ROAD_WIDTH - 1, y, 1.2, '#FFE0A0');
  }
  ctx.globalAlpha = 1;

  // Big warm bulbs (every 50px, subtle colour variation)
  const palette = ['#FFE6A6', '#FFDD88', '#FFE0A0'];
  for (let y = -bigPeriod + bigOffset; y < BASE_H + bigPeriod; y += bigPeriod) {
    const idx = Math.floor((y + scrollY) / bigPeriod) % palette.length;
    const color = palette[((idx % palette.length) + palette.length) % palette.length];
    // Halo
    ctx.globalAlpha = 0.22;
    circle(ctx, ROAD_LEFT + 1, y, 7, color);
    circle(ctx, ROAD_LEFT + ROAD_WIDTH - 1, y, 7, color);
    ctx.globalAlpha = 1;
    // Core
    glow(ctx, color, 6);
    circle(ctx, ROAD_LEFT + 1, y, 2.5, color);
    circle(ctx, ROAD_LEFT + ROAD_WIDTH - 1, y, 2.5, color);
  }
  noGlow(ctx);

  // Soft warm lane dashes (thinner + more frequent to match wet-road look)
  const dashH = 20;
  const gapH = 18;
  const period = dashH + gapH;
  const lineOffset = scrollY % period;

  ctx.fillStyle = '#FFEDC8';
  ctx.globalAlpha = 0.8;
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const lx = ROAD_LEFT + lane * LANE_WIDTH - 1;
    for (let y = -dashH + lineOffset; y < BASE_H + dashH; y += period) {
      ctx.fillRect(lx, y, 2, dashH);
    }
  }
  ctx.globalAlpha = 1;
}

// ─── Finish Arch ─────────────────────────────────────────────────────────────

function buildFinishArch() {
  return buildSpriteCache(ROAD_WIDTH + 40, 90, (cx, w, h) => {
    // Two pylons
    cx.fillStyle = '#FF3FA0';
    cx.fillRect(8, 20, 10, 70);
    cx.fillRect(w - 18, 20, 10, 70);

    // Arc between
    cx.strokeStyle = '#FFE455';
    cx.lineWidth = 4;
    cx.lineCap = 'round';
    glow(cx, '#FFE455', 10);
    cx.beginPath();
    cx.moveTo(13, 22);
    cx.quadraticCurveTo(w / 2, -8, w - 13, 22);
    cx.stroke();
    noGlow(cx);

    // Bulb string
    for (let i = 1; i < 14; i++) {
      const t = i / 14;
      const bx = 13 + (w - 26) * t;
      const lift = Math.sin(Math.PI * t) * 30;
      const by = 22 - lift;
      const colors = ['#FF3FA0', '#5EE8FF', '#FFE455'];
      const c = colors[i % 3];
      cx.globalAlpha = 0.4;
      cx.fillStyle = c;
      cx.beginPath();
      cx.arc(bx, by, 4, 0, Math.PI * 2);
      cx.fill();
      cx.globalAlpha = 1;
      cx.fillStyle = c;
      cx.beginPath();
      cx.arc(bx, by, 1.8, 0, Math.PI * 2);
      cx.fill();
    }

    // "FINISH" banner across
    cx.fillStyle = 'rgba(10,5,30,0.85)';
    cx.fillRect(w / 2 - 46, 40, 92, 22);
    cx.strokeStyle = '#FFE455';
    cx.lineWidth = 1;
    cx.strokeRect(w / 2 - 46, 40, 92, 22);
    cx.fillStyle = '#FFE455';
    cx.font = 'bold 12px "Press Start 2P", monospace';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('FINISH', w / 2, 51);
  });
}

export function drawFinishArch(ctx, finishLineY) {
  ensureCaches();
  const img = caches.finishArch;
  const archX = ROAD_LEFT - 20;
  const archY = finishLineY - 110;
  ctx.drawImage(img, archX, archY);
}

// ─── Player bumper car ───────────────────────────────────────────────────────

const PLAYER_SPRITE_W = 54;
const PLAYER_SPRITE_H = 82;

function buildPlayerSprite() {
  // Yellow open-wheel F1-style kart. Nose points UP (away from player-bottom view).
  return buildSpriteCache(PLAYER_SPRITE_W, PLAYER_SPRITE_H, (cx, w, h) => {
    const cxw = w / 2;
    const cyh = h / 2;

    const YELLOW = '#F5C22B';
    const YELLOW_LIGHT = '#FFE177';
    const YELLOW_DARK = '#B88B18';
    const BLACK = '#0d0d18';
    const TYRE_SHEEN = '#2a2a33';

    // Ground shadow
    cx.fillStyle = 'rgba(0,0,0,0.45)';
    cx.beginPath();
    cx.ellipse(cxw + 1, cyh + 34, 22, 6, 0, 0, Math.PI * 2);
    cx.fill();

    // ── Exposed tyres (4 corners) ──────────────────────────────────────
    // Front wheels (top)
    cx.fillStyle = BLACK;
    cx.fillRect(cxw - 24, cyh - 24, 8, 14);
    cx.fillRect(cxw + 16, cyh - 24, 8, 14);
    // Rear wheels (bottom, wider)
    cx.fillRect(cxw - 25, cyh + 10, 9, 16);
    cx.fillRect(cxw + 16, cyh + 10, 9, 16);
    // Sheen
    cx.fillStyle = TYRE_SHEEN;
    cx.fillRect(cxw - 24, cyh - 18, 8, 1);
    cx.fillRect(cxw + 16, cyh - 18, 8, 1);
    cx.fillRect(cxw - 25, cyh + 17, 9, 1);
    cx.fillRect(cxw + 16, cyh + 17, 9, 1);

    // ── Axle rods (dark chassis bars connecting wheels to body) ────────
    cx.fillStyle = '#1a1a22';
    cx.fillRect(cxw - 16, cyh - 20, 32, 3);  // front axle
    cx.fillRect(cxw - 16, cyh + 16, 32, 3);  // rear axle

    // ── Side pods / radiators (yellow with black vent) ─────────────────
    cx.fillStyle = YELLOW;
    cx.fillRect(cxw - 16, cyh - 10, 6, 20);
    cx.fillRect(cxw + 10, cyh - 10, 6, 20);
    cx.fillStyle = BLACK;
    cx.fillRect(cxw - 15, cyh - 4, 4, 2);
    cx.fillRect(cxw + 11, cyh - 4, 4, 2);
    cx.fillRect(cxw - 15, cyh + 2, 4, 2);
    cx.fillRect(cxw + 11, cyh + 2, 4, 2);

    // ── Main body (torpedo, nose up) ───────────────────────────────────
    cx.fillStyle = YELLOW;
    cx.beginPath();
    cx.moveTo(cxw, cyh - 34);            // nose tip
    cx.lineTo(cxw - 4, cyh - 28);
    cx.lineTo(cxw - 7, cyh - 16);
    cx.lineTo(cxw - 10, cyh - 4);
    cx.lineTo(cxw - 10, cyh + 14);       // rear-left
    cx.lineTo(cxw + 10, cyh + 14);       // rear-right
    cx.lineTo(cxw + 10, cyh - 4);
    cx.lineTo(cxw + 7, cyh - 16);
    cx.lineTo(cxw + 4, cyh - 28);
    cx.closePath();
    cx.fill();

    // Body top highlight
    cx.fillStyle = YELLOW_LIGHT;
    cx.beginPath();
    cx.moveTo(cxw, cyh - 32);
    cx.lineTo(cxw - 3, cyh - 28);
    cx.lineTo(cxw - 4, cyh - 20);
    cx.lineTo(cxw + 4, cyh - 20);
    cx.lineTo(cxw + 3, cyh - 28);
    cx.closePath();
    cx.fill();

    // Body bottom shadow
    cx.fillStyle = YELLOW_DARK;
    cx.fillRect(cxw - 10, cyh + 10, 20, 4);

    // ── Cockpit opening ────────────────────────────────────────────────
    cx.fillStyle = '#0B0516';
    cx.beginPath();
    cx.ellipse(cxw, cyh - 2, 6, 9, 0, 0, Math.PI * 2);
    cx.fill();

    // Driver torso (dark racing suit peeking above the cockpit)
    cx.fillStyle = '#1a1a24';
    cx.fillRect(cxw - 4, cyh, 8, 5);

    // Driver helmet (black with cyan visor)
    cx.fillStyle = '#111118';
    cx.beginPath();
    cx.arc(cxw, cyh - 5, 5, 0, Math.PI * 2);
    cx.fill();
    // Visor
    cx.fillStyle = '#5EE8FF';
    cx.fillRect(cxw - 4, cyh - 6, 8, 2);
    // Visor shine
    cx.fillStyle = '#B6F9FF';
    cx.fillRect(cxw - 3, cyh - 6, 2, 1);

    // ── Front wing (at top) ────────────────────────────────────────────
    cx.fillStyle = '#121218';
    cx.fillRect(cxw - 18, cyh - 28, 36, 3);
    // Endplates
    cx.fillRect(cxw - 18, cyh - 30, 3, 5);
    cx.fillRect(cxw + 15, cyh - 30, 3, 5);
    // Aero slats (yellow accents)
    cx.fillStyle = YELLOW;
    cx.fillRect(cxw - 14, cyh - 27, 2, 1);
    cx.fillRect(cxw - 4, cyh - 27, 2, 1);
    cx.fillRect(cxw + 2, cyh - 27, 2, 1);
    cx.fillRect(cxw + 12, cyh - 27, 2, 1);

    // ── Rear wing (at bottom) ──────────────────────────────────────────
    cx.fillStyle = '#121218';
    cx.fillRect(cxw - 16, cyh + 18, 32, 4);
    // Wing endplates
    cx.fillRect(cxw - 16, cyh + 14, 2, 5);
    cx.fillRect(cxw + 14, cyh + 14, 2, 5);
    // Supports
    cx.fillRect(cxw - 8, cyh + 14, 2, 5);
    cx.fillRect(cxw + 6, cyh + 14, 2, 5);

    // Brake lights on rear wing (red)
    cx.fillStyle = '#FF3044';
    cx.fillRect(cxw - 10, cyh + 19, 4, 2);
    cx.fillRect(cxw + 6, cyh + 19, 4, 2);

    // Race number on nose
    cx.fillStyle = '#0B0516';
    cx.fillRect(cxw - 3, cyh - 20, 6, 6);
    cx.fillStyle = YELLOW_LIGHT;
    cx.font = 'bold 6px "Press Start 2P", monospace';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('1', cxw, cyh - 17);
  });
}

export function drawPlayer(ctx, player, frame, immune) {
  ensureCaches();

  if (immune && Math.floor(frame / 4) % 2 === 0) return;

  const cx = player.x;
  const cy = player.y;

  // Tilt into lane changes
  let tilt = 0;
  if (player.switchTimer > 0 && player.targetX !== player.switchFrom) {
    const dir = player.targetX > player.switchFrom ? 1 : -1;
    const t = player.switchTimer / 8; // LANE_SWITCH_FRAMES = 8
    tilt = dir * 0.08 * t;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);

  // Yellow underglow on the wet road beneath the kart
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35;
  const grd = ctx.createRadialGradient(0, 10, 2, 0, 10, 42);
  grd.addColorStop(0, 'rgba(255,225,80,0.9)');
  grd.addColorStop(1, 'rgba(255,225,80,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.ellipse(0, 10, 42, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Headlight beams
  ctx.globalAlpha = 0.12 + Math.random() * 0.04;
  ctx.fillStyle = COL.neonCyanSoft;
  ctx.beginPath();
  ctx.moveTo(-10, -PLAYER_SPRITE_H / 2 + 4);
  ctx.lineTo(-24, -PLAYER_SPRITE_H / 2 - 80);
  ctx.lineTo(24, -PLAYER_SPRITE_H / 2 - 80);
  ctx.lineTo(10, -PLAYER_SPRITE_H / 2 + 4);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Sprite
  ctx.drawImage(caches.player, -PLAYER_SPRITE_W / 2, -PLAYER_SPRITE_H / 2);

  // Headlights on either side of nose
  glow(ctx, '#FFF5C2', 8);
  circle(ctx, -6, -28, 1.5, '#FFFFFF');
  circle(ctx, 6, -28, 1.5, '#FFFFFF');
  noGlow(ctx);

  // Brake-light glow behind
  glow(ctx, '#FF3044', 8);
  ctx.fillStyle = '#FF3044';
  ctx.fillRect(-10, 19, 4, 2);
  ctx.fillRect(6, 19, 4, 2);
  noGlow(ctx);

  ctx.restore();
}

// ─── Rival bumper cars ───────────────────────────────────────────────────────

function buildRivalSprites() {
  const types = ['roundie', 'boxie', 'zippy', 'chunker'];
  const out = {};
  for (const type of types) {
    out[type] = BUMPER_PALETTES.map(palette => buildRivalSprite(type, palette));
  }
  return out;
}

function rivalDims(type) {
  switch (type) {
    case 'roundie': return { w: 38, h: 52 };
    case 'boxie':   return { w: 38, h: 62 };
    case 'zippy':   return { w: 36, h: 50 };
    case 'chunker': return { w: 40, h: 58 };
    default:        return { w: 38, h: 52 };
  }
}

function buildRivalSprite(type, palette) {
  const { w, h } = rivalDims(type);
  const padX = 6; // room for pole spark and overhang
  const padY = 22; // tall: pole above, wheels below
  const sw = w + padX * 2;
  const sh = h + padY * 2;

  return buildSpriteCache(sw, sh, (cx, tw, th) => {
    const cxw = tw / 2;
    const cyh = th / 2;
    const [c1] = palette;
    // Rivals face DOWN the road (toward player at bottom): nose at bottom, rear wing at top.
    const halfH = h / 2;
    const halfW = w / 2;

    // Shadow
    cx.fillStyle = 'rgba(0,0,0,0.45)';
    cx.beginPath();
    cx.ellipse(cxw + 2, cyh + halfH + 3, halfW + 1, 5, 0, 0, Math.PI * 2);
    cx.fill();

    // ── Tyres (fat rears near top, fronts near bottom-nose) ───────────
    const tyreW = 6;
    const tyreFrontH = 11;
    const tyreRearH = 13;
    cx.fillStyle = '#0d0d18';
    // Front tyres (bottom)
    cx.fillRect(cxw - halfW - 2, cyh + halfH - 18, tyreW, tyreFrontH);
    cx.fillRect(cxw + halfW - 4, cyh + halfH - 18, tyreW, tyreFrontH);
    // Rear tyres (top)
    cx.fillRect(cxw - halfW - 3, cyh - halfH + 6, tyreW + 1, tyreRearH);
    cx.fillRect(cxw + halfW - 4, cyh - halfH + 6, tyreW + 1, tyreRearH);
    // Tread highlights
    cx.fillStyle = '#2a2a35';
    cx.fillRect(cxw - halfW - 2, cyh + halfH - 13, tyreW, 1);
    cx.fillRect(cxw + halfW - 4, cyh + halfH - 13, tyreW, 1);
    cx.fillRect(cxw - halfW - 3, cyh - halfH + 12, tyreW + 1, 1);
    cx.fillRect(cxw + halfW - 4, cyh - halfH + 12, tyreW + 1, 1);

    // Chassis backing
    cx.fillStyle = '#1a1020';
    cx.fillRect(cxw - (halfW - 6), cyh - halfH + 4, (halfW - 6) * 2, h - 8);

    // ── Main body (nose points DOWN toward player) ────────────────────
    cx.fillStyle = c1;
    cx.beginPath();
    cx.moveTo(cxw, cyh + halfH);                      // nose tip (bottom)
    cx.lineTo(cxw - (halfW - 8), cyh + halfH - 8);
    cx.lineTo(cxw - (halfW - 4), cyh + halfH - 18);
    cx.lineTo(cxw - (halfW - 2), cyh - halfH + 4);    // rear-left
    cx.lineTo(cxw + (halfW - 2), cyh - halfH + 4);    // rear-right
    cx.lineTo(cxw + (halfW - 4), cyh + halfH - 18);
    cx.lineTo(cxw + (halfW - 8), cyh + halfH - 8);
    cx.closePath();
    cx.fill();

    // Cream racing stripe down centre (nose to rear)
    cx.fillStyle = '#F0E6D6';
    cx.beginPath();
    cx.moveTo(cxw, cyh + halfH - 2);
    cx.lineTo(cxw - 3, cyh + halfH - 10);
    cx.lineTo(cxw - 3, cyh - halfH + 6);
    cx.lineTo(cxw + 3, cyh - halfH + 6);
    cx.lineTo(cxw + 3, cyh + halfH - 10);
    cx.closePath();
    cx.fill();

    // Subtle side highlight
    cx.globalAlpha = 0.15;
    cx.fillStyle = '#FFFFFF';
    cx.fillRect(cxw - (halfW - 5), cyh - halfH + 10, 1, h - 24);
    cx.globalAlpha = 1;

    // Dark air intake just behind cockpit
    cx.fillStyle = '#1a0a12';
    cx.fillRect(cxw - 6, cyh - halfH + 8, 12, 7);

    // ── Cockpit ──────────────────────────────────────────────────────
    cx.fillStyle = '#1a0a2e';
    cx.beginPath();
    cx.ellipse(cxw, cyh, 7, 9, 0, 0, Math.PI * 2);
    cx.fill();
    // Windscreen shine (toward nose/bottom)
    cx.globalAlpha = 0.3;
    cx.fillStyle = '#5EE8FF';
    cx.fillRect(cxw - 4, cyh + 3, 3, 2);
    cx.globalAlpha = 1;

    // Driver helmet
    cx.fillStyle = '#9E4F3A';
    cx.beginPath();
    cx.arc(cxw, cyh - 3, 4, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = '#F0E6D6';
    cx.fillRect(cxw - 4, cyh - 3, 8, 1);

    // ── Front wing (at bottom, where nose points) ────────────────────
    cx.fillStyle = '#1a1020';
    cx.fillRect(cxw - halfW + 2, cyh + halfH - 3, w - 4, 2);
    cx.fillRect(cxw - halfW + 2, cyh + halfH - 5, 2, 3);
    cx.fillRect(cxw + halfW - 4, cyh + halfH - 5, 2, 3);

    // ── Rear wing (at top) ───────────────────────────────────────────
    cx.fillStyle = '#1a1020';
    cx.fillRect(cxw - halfW + 2, cyh - halfH + 1, w - 4, 3);
    cx.fillRect(cxw - halfW + 6, cyh - halfH + 4, 2, 3);
    cx.fillRect(cxw + halfW - 8, cyh - halfH + 4, 2, 3);
  });
}

export function drawCar(ctx, obs, frame = 0) {
  ensureCaches();
  const type = obs.type || 'roundie';
  const paletteIndex = obs.paletteIndex != null ? obs.paletteIndex : 0;
  const variants = caches.rivals[type] || caches.rivals.roundie;
  const sprite = variants[paletteIndex % variants.length];
  const sw = sprite.width;
  const sh = sprite.height;

  // Tilt during lane change
  let tilt = 0;
  if (obs.switchTimer > 0 && obs.targetX !== obs.switchFrom) {
    const dir = obs.targetX > obs.switchFrom ? 1 : -1;
    const t = obs.switchTimer / 20; // LANE_CHANGE_FRAMES
    tilt = dir * 0.06 * t;
  }

  ctx.save();
  ctx.translate(obs.x, obs.y);
  ctx.rotate(tilt);
  ctx.drawImage(sprite, -sw / 2, -sh / 2);

  // Taillights on rear wing (top in screen space — rivals face down-road)
  ctx.fillStyle = '#D85060';
  ctx.fillRect(-obs.w / 2 + 4, -obs.h / 2 + 1, 4, 2);
  ctx.fillRect(obs.w / 2 - 8, -obs.h / 2 + 1, 4, 2);

  ctx.restore();

  // Emit occasional exhaust
  if (Math.random() < 0.25) emitExhaust(obs);
}

// ─── Small Ferris wheel decoration ──────────────────────────────────────────

function buildSmallFerris() {
  return buildSpriteCache(48, 48, (cx, w, h) => {
    const ccx = w / 2;
    const ccy = h / 2;
    const r = 18;

    // Spokes
    cx.strokeStyle = '#5A3A80';
    cx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      cx.beginPath();
      cx.moveTo(ccx, ccy);
      cx.lineTo(ccx + Math.cos(a) * r, ccy + Math.sin(a) * r);
      cx.stroke();
    }

    // Rim
    glow(cx, '#FFF2C2', 5);
    cx.strokeStyle = '#FFF2C2';
    cx.lineWidth = 1.5;
    cx.beginPath();
    cx.arc(ccx, ccy, r, 0, Math.PI * 2);
    cx.stroke();
    noGlow(cx);

    // Bulbs
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      const bx = ccx + Math.cos(a) * r;
      const by = ccy + Math.sin(a) * r;
      const c = i % 2 === 0 ? '#FFE6A6' : '#9EEBFF';
      cx.globalAlpha = 0.4;
      cx.fillStyle = c;
      cx.beginPath();
      cx.arc(bx, by, 2.5, 0, Math.PI * 2);
      cx.fill();
      cx.globalAlpha = 1;
      cx.fillStyle = c;
      cx.beginPath();
      cx.arc(bx, by, 1.3, 0, Math.PI * 2);
      cx.fill();
    }

    // Hub
    cx.fillStyle = '#1a0a2e';
    cx.beginPath();
    cx.arc(ccx, ccy, 4, 0, Math.PI * 2);
    cx.fill();
  });
}

// ─── Trackside: Armco barrier ────────────────────────────────────────────────
// Metal crash barrier with red/white reflective chevrons, running vertically.
function drawBarrier(ctx, x, y, d) {
  const h = 80;
  // Post
  ctx.fillStyle = '#3a3a42';
  ctx.fillRect(x - 1, y - h / 2, 2, h);
  // Two horizontal rails
  ctx.fillStyle = '#B8B8C0';
  ctx.fillRect(x - 12, y - h / 2 + 10, 24, 4);
  ctx.fillRect(x - 12, y - h / 2 + 30, 24, 4);
  // Rail shadow line
  ctx.fillStyle = '#5a5a62';
  ctx.fillRect(x - 12, y - h / 2 + 14, 24, 1);
  ctx.fillRect(x - 12, y - h / 2 + 34, 24, 1);
  // Red/white chevrons on lower rail
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#C0634A' : '#F0E6D6';
    ctx.fillRect(x - 12 + i * 4, y - h / 2 + 30, 4, 4);
  }
}

// ─── Trackside: Tyre stack ───────────────────────────────────────────────────
function drawTyreStack(ctx, x, y, d) {
  const tyreR = 5;
  // 3 rows × 2 tyres
  for (let row = 0; row < 3; row++) {
    const ty = y - 12 + row * tyreR * 2;
    const offset = row % 2 === 0 ? 0 : tyreR;
    for (let col = -1; col <= 1; col++) {
      const tx = x + col * tyreR * 2 + offset;
      // Outer rubber
      ctx.fillStyle = '#111114';
      ctx.beginPath();
      ctx.arc(tx, ty, tyreR, 0, Math.PI * 2);
      ctx.fill();
      // Inner hole
      ctx.fillStyle = '#2a2a32';
      ctx.beginPath();
      ctx.arc(tx, ty, tyreR - 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 18, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Trackside: Grandstand with crowd ────────────────────────────────────────
function drawGrandstand(ctx, x, y, d, frame) {
  const w = 56;
  const h = 36;
  const left = x - w / 2;
  const top = y - h / 2;

  // Back wall
  ctx.fillStyle = '#1a0a2e';
  ctx.fillRect(left, top, w, h);

  // Roof overhang
  ctx.fillStyle = '#C0634A';
  ctx.fillRect(left - 3, top - 3, w + 6, 4);
  // Roof shadow stripe
  ctx.fillStyle = '#8A3D28';
  ctx.fillRect(left - 3, top + 1, w + 6, 1);

  // Tiered seats (3 rows)
  for (let row = 0; row < 3; row++) {
    const ry = top + 6 + row * 8;
    ctx.fillStyle = '#2a1540';
    ctx.fillRect(left + 2, ry, w - 4, 7);
    // Crowd silhouettes — deterministic per position, slight sway
    for (let i = 0; i < 7; i++) {
      const cx_ = left + 5 + i * 7;
      const hash = starHash(Math.floor(cx_), row);
      const skinIdx = hash % 3;
      const skin = ['#F5C26B', '#C49060', '#E8B88A'][skinIdx];
      const shirt = ['#C0634A', '#4A9EC2', '#E8B949', '#F0E6D6'][hash % 4];
      const sway = Math.sin(frame * 0.05 + i + row) * 0.5;
      // Shoulders
      ctx.fillStyle = shirt;
      ctx.fillRect(cx_ - 2, ry + 3 + sway, 4, 3);
      // Head
      ctx.fillStyle = skin;
      ctx.fillRect(cx_ - 1, ry + 1 + sway, 2, 2);
    }
  }

  // Sponsor stripe across top
  ctx.fillStyle = '#F0E6D6';
  ctx.fillRect(left + 2, top + 2, w - 4, 3);
  ctx.fillStyle = '#C0634A';
  ctx.font = 'bold 3px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RECESS', x, top + 3.5);
}

// ─── Trackside: Floodlight pylon ─────────────────────────────────────────────
function drawFloodlight(ctx, x, y, d, frame) {
  const poleTop = y - 36;
  // Pole
  ctx.fillStyle = '#555';
  ctx.fillRect(x - 1, poleTop, 2, 60);
  // Crossbar
  ctx.fillStyle = '#555';
  ctx.fillRect(x - 10, poleTop - 2, 20, 2);
  // Four lamps
  for (let i = 0; i < 4; i++) {
    const lx = x - 9 + i * 6;
    // Lamp housing
    ctx.fillStyle = '#333';
    ctx.fillRect(lx - 2, poleTop - 5, 4, 3);
    // Lamp glow
    glow(ctx, '#FFF2C2', 6);
    circle(ctx, lx, poleTop - 3, 1.2, '#FFF5C2');
    noGlow(ctx);
  }
  // Soft down-cone of light
  ctx.globalAlpha = 0.08 + flickerNeon(frame, x, 1) * 0.04;
  ctx.fillStyle = '#FFF5C2';
  ctx.beginPath();
  ctx.moveTo(x - 10, poleTop);
  ctx.lineTo(x + 10, poleTop);
  ctx.lineTo(x + 18, y + 24);
  ctx.lineTo(x - 18, y + 24);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // Base plate
  ctx.fillStyle = '#222';
  ctx.fillRect(x - 4, y + 22, 8, 2);
}

// ─── Trackside: Sponsor board ────────────────────────────────────────────────
function drawSponsorBoard(ctx, x, y, d) {
  const w = 50;
  const h = 22;
  const left = x - w / 2;
  const top = y - h / 2;
  // Posts
  ctx.fillStyle = '#444';
  ctx.fillRect(left + 3, y + h / 2, 2, 10);
  ctx.fillRect(left + w - 5, y + h / 2, 2, 10);
  // Board
  const bgColors = ['#C0634A', '#4A9EC2', '#E8B949', '#F0E6D6'];
  const hash = starHash(Math.floor(x), Math.floor(y));
  const bg = bgColors[hash % bgColors.length];
  ctx.fillStyle = bg;
  ctx.fillRect(left, top, w, h);
  // Border
  ctx.fillStyle = '#1a0a2e';
  ctx.fillRect(left, top, w, 1);
  ctx.fillRect(left, top + h - 1, w, 1);
  // Text
  const labels = ['RECESSLAND', 'DREAMLAND', 'MARGATE 26', 'ROAD 2'];
  const label = labels[hash % labels.length];
  ctx.fillStyle = bg === '#F0E6D6' ? '#C0634A' : '#F0E6D6';
  ctx.font = 'bold 5px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
}

// ─── Trackside: Big RECESSLAND brand billboard ───────────────────────────────
// Tall upright hoarding with the red RECESSLAND block logo — the hero brand prop.
function drawBrandBillboard(ctx, x, y, d, frame) {
  const w = 62;
  const h = 42;
  const left = x - w / 2;
  const top = y - h / 2;

  // Support posts below
  ctx.fillStyle = '#3a3a42';
  ctx.fillRect(left + 8, y + h / 2, 2, 14);
  ctx.fillRect(left + w - 10, y + h / 2, 2, 14);

  // Board back (deep night)
  ctx.fillStyle = '#0A0628';
  ctx.fillRect(left - 1, top - 1, w + 2, h + 2);

  // Cream inner panel
  ctx.fillStyle = '#F0E6D6';
  ctx.fillRect(left, top, w, h);

  // Red RECESSLAND block — two lines like the brand posters
  ctx.fillStyle = '#C0634A';
  // Line 1: "RECESS"
  const line1 = 'RECESS';
  const line2 = 'LAND';
  ctx.font = 'bold 8px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Red block behind line 1
  const block1W = 44;
  ctx.fillRect(x - block1W / 2, top + 6, block1W, 12);
  ctx.fillStyle = '#F0E6D6';
  ctx.fillText(line1, x, top + 12);
  // Red block behind line 2
  ctx.fillStyle = '#C0634A';
  const block2W = 34;
  ctx.fillRect(x - block2W / 2, top + 22, block2W, 12);
  ctx.fillStyle = '#F0E6D6';
  ctx.fillText(line2, x, top + 28);

  // Tiny subtitle
  ctx.fillStyle = '#C0634A';
  ctx.font = 'bold 3px "Press Start 2P", monospace';
  ctx.fillText('23-24 MAY', x, top + h - 4);

  // Steady warm perimeter bulbs (no flicker)
  const bulbSpacing = 8;
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < Math.floor(w / bulbSpacing); i++) {
    const bx = left + 4 + i * bulbSpacing;
    circle(ctx, bx, top - 2, 1, '#FFF5C2');
    circle(ctx, bx, top + h + 1, 1, '#FFF5C2');
  }
  for (let i = 0; i < Math.floor(h / bulbSpacing); i++) {
    const by = top + 4 + i * bulbSpacing;
    circle(ctx, left - 2, by, 1, '#FFF5C2');
    circle(ctx, left + w + 1, by, 1, '#FFF5C2');
  }
  ctx.globalAlpha = 1;
}

// ─── Trackside: Party crowd (chunky pixel festival-goers dancing) ────────────
// 5 blocky people with varied dance poses: both arms up, one-arm up, hands-on-hips,
// head-bob. Rendered entirely as axis-aligned pixels for a chunky retro feel.
function drawPartyCrowd(ctx, x, y, d, frame) {
  const seed = Math.floor(x) + Math.floor(y);
  const positions = [-20, -10, 0, 10, 20];
  const skins = ['#F5C26B', '#C49060', '#E8B88A', '#8A5A2E'];
  const outfits = ['#C0634A', '#4A9EC2', '#E8B949', '#7A4FA8', '#F0E6D6'];
  const hairs = ['#1a0a2e', '#8A5A2E', '#3a1810', '#C0634A'];

  // Ground shadow under group
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 14, 26, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < positions.length; i++) {
    const px = x + positions[i];
    const hash = starHash(seed + i * 31, i);
    const skin = skins[hash % skins.length];
    const outfit = outfits[(hash >> 3) % outfits.length];
    const hair = hairs[(hash >> 6) % hairs.length];
    // Pose locked per person (deterministic), bounce on beat
    const pose = hash % 4; // 0: both arms up, 1: left up, 2: right up, 3: hands on hips
    const beat = Math.floor(frame / 20 + i * 0.7 + (d.phaseOffset || 0)) % 2;
    const bounce = beat === 0 ? 0 : -1;

    // Body origin
    const bx = px;
    const by = y + bounce;

    // Legs (2px wide each, slightly apart when bouncing)
    ctx.fillStyle = '#1a0a2e';
    const legSpread = beat === 0 ? 0 : 1;
    ctx.fillRect(bx - 2 - legSpread, by + 6, 2, 5);
    ctx.fillRect(bx + legSpread, by + 6, 2, 5);

    // Torso
    ctx.fillStyle = outfit;
    ctx.fillRect(bx - 3, by + 1, 6, 5);

    // Head
    ctx.fillStyle = skin;
    ctx.fillRect(bx - 2, by - 4, 4, 4);

    // Hair / hat
    if (hash % 6 === 0) {
      // Party hat (triangle of pixels)
      const hatColor = ['#C0634A', '#E8B949', '#4A9EC2'][hash % 3];
      ctx.fillStyle = hatColor;
      ctx.fillRect(bx - 1, by - 7, 2, 1);
      ctx.fillRect(bx - 2, by - 6, 4, 1);
    } else {
      ctx.fillStyle = hair;
      ctx.fillRect(bx - 2, by - 5, 4, 2);
    }

    // Arms by pose
    ctx.fillStyle = skin;
    if (pose === 0) {
      // BOTH ARMS UP — classic rave
      ctx.fillRect(bx - 5, by - 4, 2, 5);
      ctx.fillRect(bx + 3, by - 4, 2, 5);
    } else if (pose === 1) {
      // LEFT ARM UP, right arm out
      ctx.fillRect(bx - 5, by - 4, 2, 5);
      ctx.fillRect(bx + 3, by + 2, 2, 4);
    } else if (pose === 2) {
      // RIGHT ARM UP, left arm out
      ctx.fillRect(bx - 5, by + 2, 2, 4);
      ctx.fillRect(bx + 3, by - 4, 2, 5);
    } else {
      // HANDS ON HIPS
      ctx.fillRect(bx - 5, by + 2, 2, 3);
      ctx.fillRect(bx + 3, by + 2, 2, 3);
    }

    // Occasional drink cup in a raised hand
    if (hash % 5 === 0 && (pose === 0 || pose === 1)) {
      ctx.fillStyle = '#F0E6D6';
      ctx.fillRect(bx - 5, by - 6, 2, 2);
    }
    if (hash % 7 === 0 && (pose === 0 || pose === 2)) {
      ctx.fillStyle = '#F0E6D6';
      ctx.fillRect(bx + 3, by - 6, 2, 2);
    }
  }
}

// ─── Trackside: Flag pole flying RECESSLAND flag ─────────────────────────────
function drawFlagPole(ctx, x, y, d, frame) {
  const poleTop = y - 34;
  // Pole
  ctx.fillStyle = '#C8C8D0';
  ctx.fillRect(x - 1, poleTop, 2, 60);
  // Pole cap (gold ball)
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(x, poleTop, 2, 0, Math.PI * 2);
  ctx.fill();

  // Flag — cream ground with red RECESSLAND block; waves horizontally
  const flagW = 22;
  const flagH = 14;
  const flagTop = poleTop + 2;
  const wave = Math.sin(frame * 0.08 + (d.phaseOffset || 0)) * 1.5;

  // Back "ripple" shadow layer
  ctx.fillStyle = '#8A3D28';
  ctx.beginPath();
  ctx.moveTo(x + 1, flagTop);
  ctx.lineTo(x + 1 + flagW, flagTop + wave);
  ctx.lineTo(x + 1 + flagW, flagTop + flagH + wave);
  ctx.lineTo(x + 1, flagTop + flagH);
  ctx.closePath();
  ctx.fill();

  // Cream face
  ctx.fillStyle = '#F0E6D6';
  ctx.beginPath();
  ctx.moveTo(x + 1, flagTop);
  ctx.lineTo(x + 1 + flagW, flagTop + wave);
  ctx.lineTo(x + 1 + flagW, flagTop + flagH + wave);
  ctx.lineTo(x + 1, flagTop + flagH);
  ctx.closePath();
  ctx.fill();

  // Red block with "RL" monogram (approximating the brand mark at this scale)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + 1, flagTop);
  ctx.lineTo(x + 1 + flagW, flagTop + wave);
  ctx.lineTo(x + 1 + flagW, flagTop + flagH + wave);
  ctx.lineTo(x + 1, flagTop + flagH);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#C0634A';
  ctx.fillRect(x + 4, flagTop + 3, flagW - 6, flagH - 6);
  ctx.fillStyle = '#F0E6D6';
  ctx.font = 'bold 5px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RL', x + 1 + flagW / 2, flagTop + flagH / 2 + wave / 2);
  ctx.restore();

  // Base
  ctx.fillStyle = '#2a2a32';
  ctx.fillRect(x - 4, y + 24, 8, 2);
}

// ─── Trackside: Marshal post with flag ───────────────────────────────────────
function drawMarshalPost(ctx, x, y, d, frame) {
  // Post
  ctx.fillStyle = '#555';
  ctx.fillRect(x - 1, y - 20, 2, 40);
  // Flag (yellow caution, waving)
  const sway = Math.sin(frame * 0.1 + (d.phaseOffset || 0)) * 2;
  ctx.fillStyle = '#E8B949';
  ctx.beginPath();
  ctx.moveTo(x + 1, y - 20);
  ctx.lineTo(x + 14 + sway, y - 16);
  ctx.lineTo(x + 14 + sway, y - 8);
  ctx.lineTo(x + 1, y - 4);
  ctx.closePath();
  ctx.fill();
  // Marshal silhouette at base
  ctx.fillStyle = '#F5A500';
  ctx.fillRect(x - 3, y + 4, 6, 8);  // high-vis vest
  ctx.fillStyle = '#F5C26B';
  ctx.fillRect(x - 2, y + 1, 4, 3);  // head
  ctx.fillStyle = '#1a0a2e';
  ctx.fillRect(x - 3, y + 12, 6, 2); // legs
}

// ─── Legacy (unused) ─────────────────────────────────────────────────────────

function drawCoaster(ctx, x, y, d, frame) {
  const w = 60;
  const startX = x - w / 2;
  const endX = x + w / 2;
  const peakY = y - 18;

  // Supports
  ctx.fillStyle = '#442';
  ctx.fillRect(startX + 4, y, 2, 22);
  ctx.fillRect(x - 1, peakY, 2, 22);
  ctx.fillRect(endX - 6, y, 2, 22);

  // Track arc
  glow(ctx, d.palette ? d.palette[0] : '#FF3FA0', 6);
  ctx.strokeStyle = d.palette ? d.palette[0] : '#FF3FA0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(startX, y + 8);
  ctx.quadraticCurveTo(x, peakY - 6, endX, y + 8);
  ctx.stroke();
  noGlow(ctx);

  // Track rail (second faint line)
  ctx.strokeStyle = '#FFFFFF';
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(startX, y + 10);
  ctx.quadraticCurveTo(x, peakY - 4, endX, y + 10);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Cart along arc
  const t = ((frame * 0.015 + (d.phaseOffset || 0)) % 1 + 1) % 1;
  // quadratic bezier at t
  const bx = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * x + t * t * endX;
  const by = (1 - t) * (1 - t) * (y + 8) + 2 * (1 - t) * t * (peakY - 6) + t * t * (y + 8);
  ctx.fillStyle = '#C0634A';
  ctx.fillRect(bx - 5, by - 4, 10, 6);
  ctx.fillStyle = '#FFE455';
  ctx.fillRect(bx - 4, by - 3, 2, 2);
  // Cart headlight
  glow(ctx, '#FFF2C2', 4);
  circle(ctx, bx + (t > 0.5 ? 5 : -5), by, 1.5, '#FFF2C2');
  noGlow(ctx);
}

// ─── Swing-ride decoration ──────────────────────────────────────────────────

function drawSwing(ctx, x, y, d, frame) {
  const rot = frame * 0.03 + (d.phaseOffset || 0);

  // Central pole
  ctx.fillStyle = '#555';
  ctx.fillRect(x - 1.5, y - 24, 3, 48);

  // Top cap (rotating disc — draw as ellipse)
  ctx.fillStyle = d.palette ? d.palette[0] : '#FF3FA0';
  ctx.beginPath();
  ctx.ellipse(x, y - 26, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = d.palette ? d.palette[1] : '#5EE8FF';
  ctx.beginPath();
  ctx.ellipse(x, y - 28, 8, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Chains with seats (6 chains rotating around)
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = rot + (Math.PI * 2 * i) / 6;
    const ex = x + Math.cos(a) * 14;
    const ey = y - 22 + Math.sin(a) * 3; // slight lift for perspective
    const sx = x + Math.cos(a) * 18;
    const sy = y - 6 + Math.sin(a) * 4;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    // Mini bumper-car seat
    const seatColor = [
      '#FF3FA0', '#5EE8FF', '#FFE455',
      '#9A50FF', '#FFFFFF', '#FF6600',
    ][i];
    ctx.fillStyle = seatColor;
    ctx.fillRect(sx - 3, sy - 1, 6, 4);
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(sx - 2, sy, 4, 1);
  }

  // Base
  ctx.fillStyle = '#333';
  ctx.fillRect(x - 6, y + 22, 12, 4);
}

// ─── Arcade booth decoration ────────────────────────────────────────────────

function buildArcadeBoothBody() {
  return buildSpriteCache(40, 40, (cx, w, h) => {
    // Body
    cx.fillStyle = '#2A1540';
    cx.fillRect(2, 8, w - 4, h - 10);

    // Lit front window
    cx.fillStyle = '#FFCC44';
    cx.globalAlpha = 0.6;
    cx.fillRect(6, 12, w - 12, 14);
    cx.globalAlpha = 1;

    // Window frame
    cx.strokeStyle = '#FFE455';
    cx.lineWidth = 1;
    cx.strokeRect(6, 12, w - 12, 14);

    // Prize shelf (3 dots)
    cx.fillStyle = '#FF3FA0';
    cx.beginPath();
    cx.arc(12, 19, 2, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = '#5EE8FF';
    cx.beginPath();
    cx.arc(20, 19, 2, 0, Math.PI * 2);
    cx.fill();
    cx.fillStyle = '#FFE455';
    cx.beginPath();
    cx.arc(28, 19, 2, 0, Math.PI * 2);
    cx.fill();

    // Candy-stripe awning
    const stripeW = 4;
    for (let sx = 0; sx < w; sx += stripeW * 2) {
      cx.fillStyle = '#FF3FA0';
      cx.fillRect(sx, 2, stripeW, 6);
      if (sx + stripeW < w) {
        cx.fillStyle = '#FFFFFF';
        cx.fillRect(sx + stripeW, 2, stripeW, 6);
      }
    }

    // Awning bottom edge
    cx.fillStyle = '#1a0a2e';
    cx.fillRect(0, 8, w, 1);

    // Counter
    cx.fillStyle = '#6A3A8F';
    cx.fillRect(2, h - 6, w - 4, 4);
  });
}

function drawArcadeBooth(ctx, x, y, d, frame) {
  ensureCaches();
  ctx.drawImage(caches.arcadeBooth, x - 20, y - 16);

  // Flashing top sign
  const signColor = Math.floor(frame / 15) % 3 === 0 ? '#FF3FA0'
    : Math.floor(frame / 15) % 3 === 1 ? '#5EE8FF' : '#FFE455';
  const alpha = flickerNeon(frame, x + y, 1);
  ctx.globalAlpha = alpha;
  glow(ctx, signColor, 8);
  ctx.fillStyle = signColor;
  ctx.fillRect(x - 8, y - 20, 16, 3);
  noGlow(ctx);
  ctx.globalAlpha = 1;
}

// ─── Kept-but-recoloured decorations ────────────────────────────────────────

function drawTent(ctx, x, y, d, frame) {
  const tw = 60;
  const th = 30;
  const peakH = 20;
  const left = x - tw / 2;

  // Warm glow on ground
  ctx.globalAlpha = 0.2;
  glow(ctx, COL.warmGlow, 12);
  ctx.fillStyle = COL.warmGlow;
  ctx.fillRect(left + 4, y + th - 2, tw - 8, 8);
  noGlow(ctx);
  ctx.globalAlpha = 1;

  // Body
  rect(ctx, left + 4, y, tw - 8, th, '#1a0a2e');

  // Lit entrance
  ctx.fillStyle = '#FFE455';
  ctx.globalAlpha = 0.6;
  ctx.fillRect(x - 4, y + 6, 8, th - 6);
  ctx.globalAlpha = 1;

  // Canopy
  ctx.fillStyle = d.canopyColor1;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(x, y - peakH);
  ctx.lineTo(left + tw, y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = d.canopyColor2;
  ctx.beginPath();
  ctx.moveTo(left + tw * 0.2, y);
  ctx.lineTo(x, y - peakH + 4);
  ctx.lineTo(left + tw * 0.8, y);
  ctx.closePath();
  ctx.fill();

  // Peak pole + flag
  ctx.fillStyle = '#888';
  ctx.fillRect(x - 1, y - peakH - 6, 2, 8);
  ctx.fillStyle = d.canopyColor1;
  ctx.fillRect(x + 1, y - peakH - 6, 6, 4);
}

function drawBunting(ctx, x, y, d, frame) {
  const bw = 60;
  const left = x - bw / 2;

  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(left + bw, y);
  ctx.stroke();

  const pennantW = 8;
  const pennantH = 10;
  for (let i = 0; i < 7; i++) {
    const px = left + 2 + i * 8;
    const sway = Math.sin(frame * 0.03 + i * 1.5) * 2;
    ctx.fillStyle = i % 2 === 0 ? d.canopyColor1 : d.canopyColor2;
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px + pennantW, y);
    ctx.lineTo(px + pennantW / 2 + sway, y + pennantH);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < 5; i++) {
    const lx = left + 5 + i * 12;
    glow(ctx, '#FFE455', 5);
    circle(ctx, lx, y, 1.5, '#FFF6B8');
  }
  noGlow(ctx);
}

function drawBeachHut(ctx, x, y, d) {
  const bw = 28;
  const bh = 20;
  const roofPeak = 8;
  const left = x - bw / 2;

  const stripeW = 4;
  for (let sx = 0; sx < bw; sx += stripeW * 2) {
    rect(ctx, left + sx, y, stripeW, bh, d.canopyColor1);
    if (sx + stripeW < bw) {
      rect(ctx, left + sx + stripeW, y, stripeW, bh, d.canopyColor2);
    }
  }

  rect(ctx, x - 3, y + bh - 10, 6, 10, '#3a1830');

  ctx.fillStyle = d.canopyColor1;
  ctx.beginPath();
  ctx.moveTo(left - 4, y);
  ctx.lineTo(x, y - roofPeak);
  ctx.lineTo(left + bw + 4, y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = d.canopyColor2;
  ctx.beginPath();
  ctx.moveTo(left - 4, y);
  ctx.lineTo(left + bw + 4, y);
  ctx.lineTo(left + bw + 4, y + 2);
  ctx.lineTo(left - 4, y + 2);
  ctx.closePath();
  ctx.fill();
}

// ─── Carnival tent (striped big-top) ────────────────────────────────────────

function drawCarnivalTent(ctx, x, y, d, frame) {
  const seed = d.variant || 0;
  // Tent silhouette — wider than tall, peaked roof
  const tw = 66;
  const th = 40;
  const peakH = 26;
  const left = x - tw / 2;
  const variantA = seed % 3;
  const stripeAColors = ['#6C2BA8', '#B32A7A', '#3A1A68'];
  const stripeBColors = ['#B32A7A', '#6C2BA8', '#D8458E'];
  const sA = stripeAColors[variantA];
  const sB = stripeBColors[variantA];

  // Ground glow (warm)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#FFB347';
  ctx.beginPath();
  ctx.ellipse(x, y + th + 4, tw * 0.6, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;

  // Tent body base (dark purple)
  ctx.fillStyle = '#1A0A2E';
  ctx.fillRect(left + 2, y, tw - 4, th);

  // Lit entrance (warm yellow)
  const entranceW = 16;
  ctx.fillStyle = '#FFD464';
  ctx.globalAlpha = 0.75;
  ctx.fillRect(x - entranceW / 2, y + 10, entranceW, th - 10);
  ctx.globalAlpha = 1;
  // Entrance curtains
  ctx.fillStyle = sA;
  ctx.fillRect(x - entranceW / 2 - 2, y + 10, 3, th - 10);
  ctx.fillRect(x + entranceW / 2 - 1, y + 10, 3, th - 10);

  // Canopy (peaked roof) — alternating vertical stripes
  const stripes = 8;
  const canopyLeft = left - 4;
  const canopyRight = left + tw + 4;
  for (let i = 0; i < stripes; i++) {
    const t0 = i / stripes;
    const t1 = (i + 1) / stripes;
    const x0 = canopyLeft + (canopyRight - canopyLeft) * t0;
    const x1 = canopyLeft + (canopyRight - canopyLeft) * t1;
    // Peak point along the curve
    const peakOffset = Math.sin(Math.PI * ((t0 + t1) / 2)) * peakH;
    const baseY = y;
    ctx.fillStyle = i % 2 === 0 ? sA : sB;
    ctx.beginPath();
    ctx.moveTo(x0, baseY);
    ctx.lineTo(x0, baseY - Math.sin(Math.PI * t0) * peakH);
    ctx.lineTo(x1, baseY - Math.sin(Math.PI * t1) * peakH);
    ctx.lineTo(x1, baseY);
    ctx.closePath();
    ctx.fill();
    // Slight shadow under stripe seams
    if (i < stripes - 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x1 - 0.5, baseY - peakOffset, 1, peakOffset);
    }
  }

  // Peak pole + pennant flag
  ctx.fillStyle = '#C8C8D0';
  ctx.fillRect(x - 1, y - peakH - 6, 2, 8);
  ctx.fillStyle = COL.tentTip;
  ctx.beginPath();
  ctx.moveTo(x + 1, y - peakH - 5);
  ctx.lineTo(x + 8, y - peakH - 3);
  ctx.lineTo(x + 1, y - peakH - 1);
  ctx.closePath();
  ctx.fill();

  // Fairy-light string along the bottom of the canopy
  const lightColors = ['#FFE455', '#FF3FA0', '#5EE8FF', '#FFE455', '#FF3FA0'];
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.5) / 9;
    const lx = canopyLeft + (canopyRight - canopyLeft) * t;
    const ly = y - Math.sin(Math.PI * t) * 4;
    const col = lightColors[(i + (frame >> 3)) % lightColors.length];
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(lx, ly, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(lx, ly, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Plushie stall (row of teddy-bear silhouettes behind a counter) ─────────

function drawPlushieStall(ctx, x, y, d, frame) {
  const w = 58;
  const h = 34;
  const left = x - w / 2;
  const top = y - h / 2;

  // Back wall
  ctx.fillStyle = '#1A0A2E';
  ctx.fillRect(left, top, w, h);

  // Candy-stripe awning
  const stripeW = 4;
  for (let sx = 0; sx < w; sx += stripeW * 2) {
    ctx.fillStyle = '#FF3FA0';
    ctx.fillRect(left + sx, top - 4, stripeW, 5);
    if (sx + stripeW < w) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(left + sx + stripeW, top - 4, stripeW, 5);
    }
  }
  ctx.fillStyle = '#0A0520';
  ctx.fillRect(left, top + 1, w, 1);

  // Warm interior glow
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#FFB347';
  ctx.fillRect(left + 2, top + 4, w - 4, h - 14);
  ctx.restore();
  ctx.globalAlpha = 1;

  // Rows of plushies (teddy silhouettes in varied pastel colours)
  const plushColors = ['#F5C2D9', '#C2E3F5', '#F5E8A8', '#E8C2F5', '#F5C09E', '#B5E8C2'];
  for (let row = 0; row < 2; row++) {
    const ry = top + 7 + row * 9;
    for (let i = 0; i < 6; i++) {
      const px = left + 4 + i * 9;
      const hash = starHash(px, ry);
      const col = plushColors[hash % plushColors.length];
      // Body
      ctx.fillStyle = col;
      ctx.fillRect(px, ry, 6, 6);
      // Head (circle)
      ctx.beginPath();
      ctx.arc(px + 3, ry - 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Ears
      ctx.fillRect(px, ry - 3, 2, 2);
      ctx.fillRect(px + 4, ry - 3, 2, 2);
      // Eyes (dark dots)
      ctx.fillStyle = '#1A0A2E';
      ctx.fillRect(px + 1, ry - 1, 1, 1);
      ctx.fillRect(px + 4, ry - 1, 1, 1);
    }
  }

  // Counter
  ctx.fillStyle = '#6A3A8F';
  ctx.fillRect(left, top + h - 5, w, 5);
  // Counter highlight
  ctx.fillStyle = '#9A5AC8';
  ctx.fillRect(left, top + h - 5, w, 1);

  // Perimeter warm bulbs
  ctx.globalAlpha = 0.9;
  const bulbStep = 8;
  for (let i = 0; i < Math.floor(w / bulbStep); i++) {
    const bx = left + 4 + i * bulbStep;
    circle(ctx, bx, top - 6, 1, '#FFE6A6');
  }
  ctx.globalAlpha = 1;
}

// ─── Neon signboard (FUN SPEED VIBES / GOOD TIMES ONLY) ─────────────────────

function drawNeonSignBoard(ctx, x, y, _d, frame, kind) {
  const w = 52;
  const h = 44;
  const left = x - w / 2;
  const top = y - h / 2;

  // Post
  ctx.fillStyle = '#2A2A32';
  ctx.fillRect(x - 1, y + h / 2, 2, 14);

  // Board body (dark panel)
  ctx.fillStyle = '#120520';
  ctx.fillRect(left - 1, top - 1, w + 2, h + 2);
  ctx.fillStyle = '#1E0B38';
  ctx.fillRect(left, top, w, h);

  // Lines
  let lines, colors;
  if (kind === 'fun') {
    lines = ['FUN', 'SPEED', 'VIBES'];
    colors = ['#FF3FA0', '#FFE455', '#5EE8FF'];
  } else {
    lines = ['GOOD', 'TIMES', 'ONLY'];
    colors = ['#FF3A3A', '#FFE455', '#5EE8FF'];
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < lines.length; i++) {
    const ly = top + 11 + i * 11;
    const col = colors[i];
    const flick = flickerNeon(frame, i * 31 + (x | 0), 1);
    ctx.save();
    ctx.globalAlpha = flick;
    glow(ctx, col, 8);
    ctx.fillStyle = col;
    ctx.font = 'bold 7px "Press Start 2P", monospace';
    ctx.fillText(lines[i], x, ly);
    noGlow(ctx);
    ctx.restore();
  }

  // Bulb-lined border (warm)
  const step = 6;
  ctx.globalAlpha = 0.8;
  for (let sx = left + 3; sx < left + w; sx += step) {
    circle(ctx, sx, top - 1, 0.9, '#FFE6A6');
    circle(ctx, sx, top + h, 0.9, '#FFE6A6');
  }
  for (let sy = top + 3; sy < top + h; sy += step) {
    circle(ctx, left - 1, sy, 0.9, '#FFE6A6');
    circle(ctx, left + w, sy, 0.9, '#FFE6A6');
  }
  ctx.globalAlpha = 1;
}

// ─── Balloon cluster ────────────────────────────────────────────────────────

function drawBalloonCluster(ctx, x, y, d, frame) {
  const seed = d.variant || 0;
  const balloons = [
    { dx: -8, dy: -14, col: '#FF3FA0' },
    { dx: 6, dy: -20, col: '#5EE8FF' },
    { dx: -2, dy: -26, col: '#FFE455' },
    { dx: 12, dy: -16, col: '#9A50FF' },
    { dx: -14, dy: -18, col: '#FF6600' },
    { dx: 2, dy: -32, col: '#F0E6D6' },
  ];
  const sway = Math.sin(frame * 0.03 + seed) * 1.5;

  // Ground anchor (hand)
  ctx.fillStyle = '#F5C26B';
  ctx.fillRect(x - 2, y, 4, 4);

  // Strings
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 0.7;
  for (const b of balloons) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + b.dx + sway * 0.5, y + b.dy);
    ctx.stroke();
  }

  // Balloons
  for (const b of balloons) {
    const bx = x + b.dx + sway * 0.5;
    const by = y + b.dy;
    // Halo
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = b.col;
    ctx.beginPath();
    ctx.arc(bx, by, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Body
    ctx.fillStyle = b.col;
    ctx.beginPath();
    ctx.ellipse(bx, by, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(bx - 2, by - 3, 1, 1);
    // Knot
    ctx.fillStyle = b.col;
    ctx.fillRect(bx - 0.5, by + 4, 1, 1);
  }
}

// ─── Collectibles (tickets + stars) ─────────────────────────────────────────

export function drawCollectible(ctx, c, frame) {
  const bob = Math.sin(c.bob) * 2;
  if (c.kind === 'ticket') {
    drawTicketSprite(ctx, c.x, c.y + bob, frame);
  } else {
    drawStarSprite(ctx, c.x, c.y + bob, frame, c.spin || 0);
  }
}

function drawTicketSprite(ctx, x, y, frame) {
  const w = 22;
  const h = 14;
  const left = x - w / 2;
  const top = y - h / 2;

  // Soft glow halo
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35 + Math.sin(frame * 0.15) * 0.1;
  const halo = ctx.createRadialGradient(x, y, 1, x, y, 16);
  halo.addColorStop(0, 'rgba(255,215,100,0.9)');
  halo.addColorStop(1, 'rgba(255,215,100,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;

  // Ticket body (rounded gold)
  ctx.fillStyle = COL.ticketEdge;
  ctx.fillRect(left - 1, top - 1, w + 2, h + 2);
  ctx.fillStyle = COL.ticketGold;
  ctx.fillRect(left, top, w, h);

  // Scalloped edges (semicircular cutouts top & bottom centre)
  ctx.fillStyle = COL.deckWetDark;
  ctx.beginPath();
  ctx.arc(x, top, 2, 0, Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, top + h, 2, Math.PI, Math.PI * 2);
  ctx.fill();

  // Dashed perforation line down centre
  ctx.fillStyle = COL.ticketGoldDark;
  for (let dy = top + 3; dy < top + h - 2; dy += 3) {
    ctx.fillRect(x - 0.5, dy, 1, 1.5);
  }

  // Little red "R" block on left side
  ctx.fillStyle = '#C0634A';
  ctx.fillRect(left + 2, top + 3, 5, h - 6);
  ctx.fillStyle = '#F0E6D6';
  ctx.font = 'bold 5px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('R', left + 4.5, top + h / 2);

  // Price/number on right side
  ctx.fillStyle = COL.ticketEdge;
  ctx.font = 'bold 5px "Press Start 2P", monospace';
  ctx.fillText('1', left + w - 4, top + h / 2);
}

function drawStarSprite(ctx, x, y, frame, spin) {
  // Soft glow halo
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.4 + Math.sin(frame * 0.2) * 0.12;
  const halo = ctx.createRadialGradient(x, y, 1, x, y, 22);
  halo.addColorStop(0, 'rgba(255,240,120,0.95)');
  halo.addColorStop(1, 'rgba(255,240,120,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;

  // 5-point star
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  const outer = 9;
  const inner = 4;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    const sx = Math.cos(a) * r;
    const sy = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fillStyle = '#FFE455';
  ctx.fill();
  // Inner highlight
  ctx.fillStyle = '#FFF5A8';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = (i % 2 === 0 ? outer : inner) * 0.55;
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    const sx = Math.cos(a) * r;
    const sy = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Orbiting sparkles (4 small)
  for (let i = 0; i < 4; i++) {
    const a = frame * 0.05 + (Math.PI / 2) * i;
    const rx = x + Math.cos(a) * 13;
    const ry = y + Math.sin(a) * 13;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(rx - 0.5, ry - 0.5, 1, 1);
  }
}

// ─── Decoration dispatcher ──────────────────────────────────────────────────

export function drawDecorations(ctx, decorations, frame) {
  const sideW = ROAD_LEFT;
  const rightX = ROAD_LEFT + ROAD_WIDTH;
  const rightW = BASE_W - rightX;

  for (const d of decorations) {
    const x = d.side === 'left' ? sideW / 2 : rightX + rightW / 2;
    const y = d.y;

    switch (d.type) {
      case 'barrier':        drawBarrier(ctx, x, y, d); break;
      case 'tyreStack':      drawTyreStack(ctx, x, y, d); break;
      case 'grandstand':     drawGrandstand(ctx, x, y, d, frame); break;
      case 'floodlight':     drawFloodlight(ctx, x, y, d, frame); break;
      case 'sponsorBoard':   drawSponsorBoard(ctx, x, y, d); break;
      case 'brandBillboard': drawBrandBillboard(ctx, x, y, d, frame); break;
      case 'partyCrowd':     drawPartyCrowd(ctx, x, y, d, frame); break;
      case 'flagPole':       drawFlagPole(ctx, x, y, d, frame); break;
      case 'marshalPost':    drawMarshalPost(ctx, x, y, d, frame); break;
      case 'carnivalTent':   drawCarnivalTent(ctx, x, y, d, frame); break;
      case 'plushieStall':   drawPlushieStall(ctx, x, y, d, frame); break;
      case 'neonSignFun':    drawNeonSignBoard(ctx, x, y, d, frame, 'fun'); break;
      case 'neonSignGto':    drawNeonSignBoard(ctx, x, y, d, frame, 'gto'); break;
      case 'balloonCluster': drawBalloonCluster(ctx, x, y, d, frame); break;
      default:               drawCarnivalTent(ctx, x, y, d, frame);
    }
  }
}

// ─── Crash explosion ─────────────────────────────────────────────────────────

export function drawExplosion(ctx, explosion) {
  if (!explosion) return;
  const { x, y, frame, particles } = explosion;
  const progress = frame / 30;
  const alpha = 1 - progress;

  glow(ctx, '#FF6600', 10);
  ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
  ctx.lineWidth = 4 - progress * 3;
  ctx.beginPath();
  ctx.arc(x, y, 10 + progress * 60, 0, Math.PI * 2);
  ctx.stroke();
  noGlow(ctx);

  if (frame < 8) {
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, 20 - frame, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of particles) {
    const px = p.x + p.vx * frame;
    const py = p.y + p.vy * frame;
    const pAlpha = Math.max(0, 1 - frame / 25);
    glow(ctx, `rgb(${p.r}, ${p.g}, ${p.b})`, 4);
    ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${pAlpha})`;
    ctx.fillRect(px - 2, py - 2, 4, 4);
  }
  noGlow(ctx);
}

// ─── Finish-line celebration ─────────────────────────────────────────────────

const NEON_BURST_COLORS = ['#FF3FA0', '#5EE8FF', '#FFE455', '#9A50FF', '#FFFFFF', '#FF6600'];

export function createCelebration() {
  const confetti = [];
  for (let i = 0; i < 80; i++) {
    confetti.push({
      x: Math.random() * BASE_W,
      y: -20 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 0.8,
      vy: 1.5 + Math.random() * 2,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      w: 3 + Math.random() * 3,
      h: 6 + Math.random() * 4,
      color: NEON_BURST_COLORS[Math.floor(Math.random() * NEON_BURST_COLORS.length)],
    });
  }
  return {
    frame: 0,
    fireworks: [],
    confetti,
  };
}

export function stepCelebration(c, dt) {
  if (!c) return;
  c.frame += dt;

  // Spawn a new firework burst every ~10 frames, cap at 6
  if (Math.floor(c.frame) % 10 === 0 && c.fireworks.length < 6 && Math.random() < 0.5) {
    const fx = 40 + Math.random() * (BASE_W - 80);
    const fy = 80 + Math.random() * (BASE_H * 0.4);
    const color = NEON_BURST_COLORS[Math.floor(Math.random() * NEON_BURST_COLORS.length)];
    const particles = [];
    for (let i = 0; i < 24; i++) {
      const a = (Math.PI * 2 * i) / 24;
      const spd = 1.5 + Math.random() * 1.5;
      particles.push({
        x: fx, y: fy,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: 40,
        color,
      });
    }
    c.fireworks.push({ particles, age: 0 });
  }

  // Tick fireworks
  for (const fw of c.fireworks) {
    fw.age += dt;
    for (const p of fw.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.05 * dt;
      p.life -= dt;
    }
  }
  c.fireworks = c.fireworks.filter(fw => fw.particles.some(p => p.life > 0));

  // Tick confetti
  for (const p of c.confetti) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.rotSpeed * dt;
  }
  c.confetti = c.confetti.filter(p => p.y < BASE_H + 20);
}

export function drawCelebration(ctx, c, frame) {
  if (!c) return;

  // Screen flash on first 8 frames
  if (c.frame < 8) {
    ctx.fillStyle = `rgba(255,255,255,${(1 - c.frame / 8) * 0.7})`;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  }

  // Fireworks (additive)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const fw of c.fireworks) {
    for (const p of fw.particles) {
      if (p.life <= 0) continue;
      const a = Math.min(1, p.life / 30);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // Confetti
  for (const p of c.confetti) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }

  // "CHAMPION!" banner
  const scaleT = Math.min(1, c.frame / 15);
  // ease-out-back
  const s = 1 + (1.70158 + 1) * Math.pow(scaleT - 1, 3) + 1.70158 * Math.pow(scaleT - 1, 2);
  ctx.save();
  ctx.translate(BASE_W / 2, BASE_H * 0.35);
  ctx.scale(s, s);

  // Rainbow shadow cycling
  const shadowColors = ['#FF3FA0', '#5EE8FF', '#FFE455', '#9A50FF'];
  const shadowColor = shadowColors[Math.floor(frame / 6) % shadowColors.length];
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#FFE455';
  ctx.font = 'bold 28px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CHAMPION!', 0, 0);
  ctx.shadowBlur = 0;

  // Secondary subline
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 10px "Press Start 2P", monospace';
  ctx.fillText('YOU MADE IT', 0, 22);
  ctx.restore();
}
