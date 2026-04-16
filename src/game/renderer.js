import {
  BASE_W, BASE_H,
  LANE_COUNT, LANE_WIDTH, ROAD_LEFT, ROAD_WIDTH,
  COL,
} from './constants.js';

// ─── Helpers ───

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

// Seeded-ish pseudo random for stars (deterministic per position)
function starHash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) & 0xffff;
}

// ─── Sky (night) ───

export function drawSky(ctx, frame) {
  const grad = ctx.createLinearGradient(0, 0, 0, BASE_H);
  grad.addColorStop(0, '#050515');
  grad.addColorStop(0.5, '#0a0a2e');
  grad.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Stars
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 60; i++) {
    const sx = starHash(i, 0) % BASE_W;
    const sy = starHash(i, 1) % BASE_H;
    const brightness = 0.3 + 0.7 * ((starHash(i, 2) % 100) / 100);
    const twinkle = Math.sin(frame * 0.02 + i * 1.7) * 0.3 + 0.7;
    ctx.globalAlpha = brightness * twinkle;
    const size = (starHash(i, 3) % 3 === 0) ? 2 : 1;
    ctx.fillRect(sx, sy, size, size);
  }
  ctx.globalAlpha = 1;

  // Moon
  glow(ctx, '#FFFFCC', 20);
  circle(ctx, 60, 50, 16, '#FFFFDD');
  noGlow(ctx);
  // Moon shadow (crescent)
  circle(ctx, 54, 46, 14, '#0a0a2e');
}

// ─── Festival ground (green grass) ───

export function drawGround(ctx, scrollY) {
  const sideW = ROAD_LEFT;
  const rightX = ROAD_LEFT + ROAD_WIDTH;
  const rightW = BASE_W - rightX;

  // Green grass base
  rect(ctx, 0, 0, sideW, BASE_H, '#1a4a12');
  rect(ctx, rightX, 0, rightW, BASE_H, '#1a4a12');

  // Scrolling grass texture — lighter horizontal stripes
  ctx.fillStyle = '#1f5516';
  const stripeH = 20;
  const offset = (scrollY * 0.5) % stripeH;
  for (let y = -stripeH + offset; y < BASE_H + stripeH; y += stripeH) {
    ctx.fillRect(0, y, sideW, 3);
    ctx.fillRect(rightX, y, rightW, 3);
  }
}

// ─── No-op fence (kept for engine.js compatibility) ───

export function drawFence() {}

// ─── Road ───

export function drawRoad(ctx, scrollY) {
  // Road surface
  rect(ctx, ROAD_LEFT, 0, ROAD_WIDTH, BASE_H, COL.road);

  // Road edges with neon glow
  glow(ctx, COL.neonCyan, 6);
  rect(ctx, ROAD_LEFT, 0, 3, BASE_H, '#88CCFF');
  rect(ctx, ROAD_LEFT + ROAD_WIDTH - 3, 0, 3, BASE_H, '#88CCFF');
  noGlow(ctx);

  // Yellow dashed lane lines
  ctx.fillStyle = COL.roadLine;
  const dashH = 30;
  const gapH = 20;
  const period = dashH + gapH;
  const offset = scrollY % period;

  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const lx = ROAD_LEFT + lane * LANE_WIDTH - 1;
    for (let y = -dashH + offset; y < BASE_H + dashH; y += period) {
      ctx.fillRect(lx, y, 3, dashH);
    }
  }
}

// ─── Festival decorations ───

export function drawDecorations(ctx, decorations, frame) {
  const sideW = ROAD_LEFT;
  const rightX = ROAD_LEFT + ROAD_WIDTH;
  const rightW = BASE_W - rightX;

  for (const d of decorations) {
    const x = d.side === 'left' ? sideW / 2 : rightX + rightW / 2;
    const y = d.y;

    switch (d.type) {
      case 'tent':
        drawTent(ctx, x, y, d, frame);
        break;
      case 'flagpole':
        drawFlagpole(ctx, x, y, d, frame);
        break;
      case 'van':
        drawFoodVan(ctx, x, y, d);
        break;
      default:
        drawTent(ctx, x, y, d, frame);
    }
  }
}

function drawTent(ctx, x, y, d, frame) {
  const tw = 60; // tent width
  const th = 30; // tent body height
  const peakH = 20; // triangle peak height above body
  const left = x - tw / 2;

  // Warm glow on grass beneath tent
  ctx.globalAlpha = 0.2;
  glow(ctx, COL.warmGlow, 12);
  ctx.fillStyle = COL.warmGlow;
  ctx.fillRect(left + 4, y + th - 2, tw - 8, 8);
  noGlow(ctx);
  ctx.globalAlpha = 1;

  // Tent body (dark base)
  rect(ctx, left + 4, y, tw - 8, th, '#1a1510');

  // Lit entrance (warm yellow slit in center)
  ctx.fillStyle = '#FFCC44';
  ctx.globalAlpha = 0.6;
  ctx.fillRect(x - 4, y + 6, 8, th - 6);
  ctx.globalAlpha = 1;

  // Triangular canopy roof — bright and bold
  ctx.fillStyle = d.canopyColor1;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(x, y - peakH);
  ctx.lineTo(left + tw, y);
  ctx.closePath();
  ctx.fill();

  // Second color stripe on canopy
  ctx.fillStyle = d.canopyColor2;
  ctx.beginPath();
  ctx.moveTo(left + tw * 0.2, y);
  ctx.lineTo(x, y - peakH + 4);
  ctx.lineTo(left + tw * 0.8, y);
  ctx.closePath();
  ctx.fill();

  // Peak pole/flag
  ctx.fillStyle = '#555';
  ctx.fillRect(x - 1, y - peakH - 6, 2, 8);

  // Tiny flag at peak
  ctx.fillStyle = d.canopyColor1;
  ctx.fillRect(x + 1, y - peakH - 6, 6, 4);
}

function drawFlagpole(ctx, x, y, d, frame) {
  // Pole
  ctx.fillStyle = '#777';
  ctx.fillRect(x - 1, y - 30, 2, 40);

  // Flag fluttering
  const sway = Math.sin(frame * 0.05 + y * 0.1) * 3;
  ctx.fillStyle = d.canopyColor1;
  ctx.beginPath();
  ctx.moveTo(x + 1, y - 28);
  ctx.lineTo(x + 12 + sway, y - 25);
  ctx.lineTo(x + 10 + sway, y - 18);
  ctx.lineTo(x + 1, y - 20);
  ctx.closePath();
  ctx.fill();

  // Pole base
  ctx.fillStyle = '#555';
  ctx.fillRect(x - 3, y + 8, 6, 4);
}

function drawFoodVan(ctx, x, y, d) {
  const vw = 34;
  const vh = 22;
  const left = x - vw / 2;

  // Van body
  rect(ctx, left, y, vw, vh, d.canopyColor1);

  // Darker roof strip
  rect(ctx, left, y, vw, 5, d.canopyColor2);

  // Window
  ctx.fillStyle = 'rgba(200, 230, 255, 0.5)';
  ctx.fillRect(left + 3, y + 2, vw - 6, 3);

  // Serving hatch (road-facing side)
  ctx.fillStyle = '#FFCC44';
  ctx.globalAlpha = 0.5;
  ctx.fillRect(left + 6, y + 8, vw - 12, 6);
  ctx.globalAlpha = 1;

  // Wheels
  ctx.fillStyle = '#222';
  circle(ctx, left + 5, y + vh, 3, '#222');
  circle(ctx, left + vw - 5, y + vh, 3, '#222');
}

// ─── Player go-kart (top-down, night) ───

export function drawPlayer(ctx, player, frame, immune) {
  const cx = player.x;
  const cy = player.y;
  const w = player.w;
  const h = player.h;

  if (immune && Math.floor(frame / 4) % 2 === 0) return;

  const left = cx - w / 2;
  const top = cy - h / 2;

  // Headlight beams (projected forward / upward on screen)
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#FFFF88';
  ctx.beginPath();
  ctx.moveTo(cx - 8, top + 2);
  ctx.lineTo(cx - 20, top - 80);
  ctx.lineTo(cx + 20, top - 80);
  ctx.lineTo(cx + 8, top + 2);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Headlight glow
  glow(ctx, '#FFFF44', 10);
  circle(ctx, cx - 8, top + 2, 4, '#FFFF88');
  circle(ctx, cx + 8, top + 2, 4, '#FFFF88');
  noGlow(ctx);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(left + 2, top + 2, w, h);

  // Wheels
  ctx.fillStyle = '#222';
  ctx.fillRect(left - 3, top + 4, 6, 14);
  ctx.fillRect(left + w - 3, top + 4, 6, 14);
  ctx.fillRect(left - 3, top + h - 18, 6, 14);
  ctx.fillRect(left + w - 3, top + h - 18, 6, 14);

  // Body
  ctx.fillStyle = COL.red;
  ctx.fillRect(left + 2, top, w - 4, h);

  // Darker sides
  ctx.fillStyle = COL.redDark;
  ctx.fillRect(left + 2, top, 4, h);
  ctx.fillRect(left + w - 6, top, 4, h);

  // Windshield
  ctx.fillStyle = '#2288CC';
  ctx.fillRect(left + 8, top + 4, w - 16, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(left + 10, top + 6, w - 24, 4);

  // Driver
  circle(ctx, cx, cy + 2, 6, COL.cream);
  circle(ctx, cx, cy - 1, 6, '#D4A882');
  circle(ctx, cx, cy - 3, 6, COL.red);

  // Rear spoiler
  ctx.fillStyle = COL.redDark;
  ctx.fillRect(left + 4, top + h - 6, w - 8, 6);

  // Taillights
  glow(ctx, '#FF0000', 6);
  ctx.fillStyle = '#FF3333';
  ctx.fillRect(left + 4, top + h - 3, 6, 3);
  ctx.fillRect(left + w - 10, top + h - 3, 6, 3);
  noGlow(ctx);

  // "R" on hood
  ctx.fillStyle = COL.cream;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('R', cx, cy + 22);
}

// ─── Obstacle cars (top-down, night) ───

export function drawCar(ctx, obs) {
  const cx = obs.x;
  const cy = obs.y;
  const w = obs.w;
  const h = obs.h;
  const left = cx - w / 2;
  const top = cy - h / 2;

  // Headlights (bottom = front, cars face away)
  glow(ctx, '#FFFF44', 6);
  circle(ctx, cx - 8, top + h + 2, 3, '#FFFF88');
  circle(ctx, cx + 8, top + h + 2, 3, '#FFFF88');
  noGlow(ctx);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(left + 2, top + 2, w, h);

  // Wheels
  ctx.fillStyle = '#222';
  ctx.fillRect(left - 2, top + 4, 5, 12);
  ctx.fillRect(left + w - 3, top + 4, 5, 12);
  ctx.fillRect(left - 2, top + h - 16, 5, 12);
  ctx.fillRect(left + w - 3, top + h - 16, 5, 12);

  switch (obs.type) {
    case 'sedan': {
      rect(ctx, left + 2, top, w - 4, h, obs.color);
      rect(ctx, left + 2, top, 3, h, obs.colorDark);
      rect(ctx, left + w - 5, top, 3, h, obs.colorDark);
      ctx.fillStyle = '#335577';
      ctx.fillRect(left + 6, top + 4, w - 12, 12);
      ctx.fillRect(left + 8, top + h - 16, w - 16, 10);
      break;
    }
    case 'truck': {
      rect(ctx, left + 2, top + h - 24, w - 4, 24, obs.color);
      rect(ctx, left + 2, top + h - 24, 3, 24, obs.colorDark);
      rect(ctx, left + w - 5, top + h - 24, 3, 24, obs.colorDark);
      rect(ctx, left + 1, top, w - 2, h - 22, obs.colorDark);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(left + 2, top + 2, w - 4, h - 26);
      ctx.fillStyle = '#335577';
      ctx.fillRect(left + 6, top + h - 20, w - 12, 10);
      break;
    }
    case 'sports': {
      rect(ctx, left + 2, top + 2, w - 4, h - 4, obs.color);
      rect(ctx, left + 2, top + 2, 3, h - 4, obs.colorDark);
      rect(ctx, left + w - 5, top + 2, 3, h - 4, obs.colorDark);
      ctx.fillStyle = obs.colorAccent;
      ctx.fillRect(cx - 3, top + 2, 6, h - 4);
      ctx.fillStyle = '#335577';
      ctx.fillRect(left + 5, top + 4, w - 10, 10);
      rect(ctx, left + 3, top, w - 6, 4, obs.colorDark);
      break;
    }
    case 'van': {
      rect(ctx, left + 1, top, w - 2, h, obs.color);
      rect(ctx, left + 1, top, 3, h, obs.colorDark);
      rect(ctx, left + w - 4, top, 3, h, obs.colorDark);
      ctx.fillStyle = '#335577';
      ctx.fillRect(left + 6, top + h - 18, w - 12, 12);
      ctx.strokeStyle = obs.colorDark;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, top + 2);
      ctx.lineTo(cx, top + h - 22);
      ctx.stroke();
      break;
    }
  }

  // Taillights (top = rear)
  glow(ctx, '#FF0000', 5);
  ctx.fillStyle = '#FF2222';
  ctx.fillRect(left + 3, top, 5, 3);
  ctx.fillRect(left + w - 8, top, 5, 3);
  noGlow(ctx);
}

// ─── Crash explosion ───

export function drawExplosion(ctx, explosion) {
  if (!explosion) return;
  const { x, y, frame, particles } = explosion;
  const progress = frame / 30;
  const alpha = 1 - progress;

  // Expanding ring
  glow(ctx, '#FF6600', 10);
  ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
  ctx.lineWidth = 4 - progress * 3;
  ctx.beginPath();
  ctx.arc(x, y, 10 + progress * 60, 0, Math.PI * 2);
  ctx.stroke();
  noGlow(ctx);

  // Inner flash
  if (frame < 8) {
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, 20 - frame, 0, Math.PI * 2);
    ctx.fill();
  }

  // Particles
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
