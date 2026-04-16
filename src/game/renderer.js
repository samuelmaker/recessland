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

// ─── Sky (evening sunset) ───

export function drawSky(ctx, frame) {
  const grad = ctx.createLinearGradient(0, 0, 0, BASE_H);
  grad.addColorStop(0, '#1a1a5e');
  grad.addColorStop(0.4, '#4a3070');
  grad.addColorStop(0.65, '#C06040');
  grad.addColorStop(0.85, '#FF8855');
  grad.addColorStop(1, '#FFB366');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Stars (fewer, top of sky only)
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 20; i++) {
    const sx = starHash(i, 0) % BASE_W;
    const sy = starHash(i, 1) % (BASE_H * 0.4);
    const brightness = 0.2 + 0.5 * ((starHash(i, 2) % 100) / 100);
    const twinkle = Math.sin(frame * 0.02 + i * 1.7) * 0.3 + 0.7;
    ctx.globalAlpha = brightness * twinkle;
    const size = (starHash(i, 3) % 3 === 0) ? 2 : 1;
    ctx.fillRect(sx, sy, size, size);
  }
  ctx.globalAlpha = 1;

  // Setting sun
  const sunX = BASE_W - 60;
  const sunY = BASE_H * 0.75;
  // Haze band
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#FFAA44';
  ctx.fillRect(0, sunY - 20, BASE_W, 40);
  ctx.globalAlpha = 1;
  // Sun body
  glow(ctx, '#FF8800', 30);
  circle(ctx, sunX, sunY, 24, '#FFD060');
  noGlow(ctx);
  glow(ctx, '#FFAA00', 15);
  circle(ctx, sunX, sunY, 18, '#FFE080');
  noGlow(ctx);

  // Seagulls
  ctx.strokeStyle = '#2a2a3a';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const gx = (frame * 0.1 + i * 100) % (BASE_W + 40) - 20;
    const gy = 60 + i * 35;
    const wingY = Math.sin(frame * 0.04 + i * 2) * 3;
    ctx.beginPath();
    ctx.moveTo(gx - 6, gy + wingY);
    ctx.quadraticCurveTo(gx - 2, gy - 4 + wingY, gx, gy + wingY);
    ctx.quadraticCurveTo(gx + 2, gy - 4 + wingY, gx + 6, gy + wingY);
    ctx.stroke();
  }
}

// ─── Festival ground (warm golden-hour grass) ───

export function drawGround(ctx, scrollY) {
  const sideW = ROAD_LEFT;
  const rightX = ROAD_LEFT + ROAD_WIDTH;
  const rightW = BASE_W - rightX;

  // Sandy beach base
  rect(ctx, 0, 0, sideW, BASE_H, '#E8D5A3');
  rect(ctx, rightX, 0, rightW, BASE_H, '#E8D5A3');

  // Scrolling sand texture — subtle darker stripes
  ctx.fillStyle = '#D4C490';
  const stripeH = 20;
  const offset = (scrollY * 0.5) % stripeH;
  for (let y = -stripeH + offset; y < BASE_H + stripeH; y += stripeH) {
    ctx.fillRect(0, y, sideW, 2);
    ctx.fillRect(rightX, y, rightW, 2);
  }

  // Scattered pebbles/shells
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 8; i++) {
    const px = starHash(i, 10) % (sideW - 6) + 3;
    const py = ((starHash(i, 11) % BASE_H) + scrollY * 0.5) % (BASE_H + 20) - 10;
    circle(ctx, px, py, 2, '#B8A880');
    const rpx = rightX + (starHash(i, 12) % (rightW - 6)) + 3;
    const rpy = ((starHash(i, 13) % BASE_H) + scrollY * 0.5) % (BASE_H + 20) - 10;
    circle(ctx, rpx, rpy, 2, '#B8A880');
  }
  // Darker wet sand near road edge
  ctx.globalAlpha = 0.15;
  rect(ctx, sideW - 6, 0, 6, BASE_H, '#A09070');
  rect(ctx, rightX, 0, 6, BASE_H, '#A09070');
  ctx.globalAlpha = 1;
}

// ─── No-op fence (kept for engine.js compatibility) ───

export function drawFence() {}

// ─── Road ───

export function drawRoad(ctx, scrollY) {
  // Road surface
  rect(ctx, ROAD_LEFT, 0, ROAD_WIDTH, BASE_H, COL.road);

  // Road edges with warm fairy light glow
  glow(ctx, '#FFAA44', 4);
  rect(ctx, ROAD_LEFT, 0, 3, BASE_H, '#FFCC77');
  rect(ctx, ROAD_LEFT + ROAD_WIDTH - 3, 0, 3, BASE_H, '#FFCC77');
  noGlow(ctx);

  // Fairy light bulbs along edges
  const bulbInterval = 30;
  const bulbOffset = scrollY % bulbInterval;
  for (let y = -bulbInterval + bulbOffset; y < BASE_H; y += bulbInterval) {
    glow(ctx, '#FFDD88', 6);
    circle(ctx, ROAD_LEFT + 1, y, 2, '#FFEEAA');
    circle(ctx, ROAD_LEFT + ROAD_WIDTH - 1, y, 2, '#FFEEAA');
  }
  noGlow(ctx);

  // Yellow dashed lane lines
  ctx.fillStyle = COL.roadLine;
  const dashH = 30;
  const gapH = 20;
  const period = dashH + gapH;
  const lineOffset = scrollY % period;

  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const lx = ROAD_LEFT + lane * LANE_WIDTH - 1;
    for (let y = -dashH + lineOffset; y < BASE_H + dashH; y += period) {
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
      case 'beachHut':
        drawBeachHut(ctx, x, y, d);
        break;
      case 'bunting':
        drawBunting(ctx, x, y, d, frame);
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

function drawBeachHut(ctx, x, y, d) {
  const bw = 28;
  const bh = 20;
  const roofPeak = 8;
  const left = x - bw / 2;

  // Body with vertical candy stripes
  const stripeW = 4;
  for (let sx = 0; sx < bw; sx += stripeW * 2) {
    rect(ctx, left + sx, y, stripeW, bh, d.canopyColor1);
    if (sx + stripeW < bw) {
      rect(ctx, left + sx + stripeW, y, stripeW, bh, d.canopyColor2);
    }
  }

  // Door
  rect(ctx, x - 3, y + bh - 10, 6, 10, '#3a2518');

  // Peaked roof
  ctx.fillStyle = d.canopyColor1;
  ctx.beginPath();
  ctx.moveTo(left - 4, y);
  ctx.lineTo(x, y - roofPeak);
  ctx.lineTo(left + bw + 4, y);
  ctx.closePath();
  ctx.fill();

  // Roof edge highlight
  ctx.fillStyle = d.canopyColor2;
  ctx.beginPath();
  ctx.moveTo(left - 4, y);
  ctx.lineTo(left + bw + 4, y);
  ctx.lineTo(left + bw + 4, y + 2);
  ctx.lineTo(left - 4, y + 2);
  ctx.closePath();
  ctx.fill();
}

function drawBunting(ctx, x, y, d, frame) {
  const bw = 60;
  const left = x - bw / 2;

  // String
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(left + bw, y);
  ctx.stroke();

  // Triangular pennants
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

  // Fairy light dots along the string
  for (let i = 0; i < 5; i++) {
    const lx = left + 5 + i * 12;
    glow(ctx, '#FFDD88', 5);
    circle(ctx, lx, y, 1.5, '#FFEEAA');
  }
  noGlow(ctx);
}

// ─── Player go-kart (top-down, evening) ───

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

// ─── Obstacle racing cars (top-down, evening) ───

export function drawCar(ctx, obs) {
  const cx = obs.x;
  const cy = obs.y;
  const w = obs.w;
  const h = obs.h;
  const left = cx - w / 2;
  const top = cy - h / 2;

  // Headlights (bottom = front, cars face away)
  glow(ctx, '#FFFF44', 5);
  circle(ctx, cx - 7, top + h + 2, 2, '#FFFF88');
  circle(ctx, cx + 7, top + h + 2, 2, '#FFFF88');
  noGlow(ctx);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(left + 2, top + 2, w, h);

  // Wheels (low-profile racing)
  ctx.fillStyle = '#222';
  ctx.fillRect(left - 2, top + 4, 5, 8);
  ctx.fillRect(left + w - 3, top + 4, 5, 8);
  ctx.fillRect(left - 2, top + h - 12, 5, 8);
  ctx.fillRect(left + w - 3, top + h - 12, 5, 8);

  switch (obs.type) {
    case 'sedan': {
      // Standard racer
      rect(ctx, left + 3, top, w - 6, h, obs.color);
      rect(ctx, left + 3, top, 3, h, obs.colorDark);
      rect(ctx, left + w - 6, top, 3, h, obs.colorDark);
      // Racing stripe
      ctx.fillStyle = obs.colorAccent;
      ctx.fillRect(cx - 2, top, 4, h);
      // Windshield
      ctx.fillStyle = '#335577';
      ctx.fillRect(left + 7, top + 4, w - 14, 8);
      // Air intake
      rect(ctx, cx - 4, top + 14, 8, 4, '#222');
      // Rear spoiler
      rect(ctx, left + 1, top - 2, w - 2, 4, obs.colorDark);
      break;
    }
    case 'truck': {
      // GT / touring car
      rect(ctx, left + 3, top, w - 6, h, obs.color);
      rect(ctx, left + 3, top, 3, h, obs.colorDark);
      rect(ctx, left + w - 6, top, 3, h, obs.colorDark);
      // Parallel racing stripes
      ctx.fillStyle = obs.colorAccent;
      ctx.fillRect(cx - 5, top, 3, h);
      ctx.fillRect(cx + 2, top, 3, h);
      // Windshield
      ctx.fillStyle = '#335577';
      ctx.fillRect(left + 7, top + h - 20, w - 14, 10);
      // Wide rear spoiler
      rect(ctx, left, top - 3, w, 5, obs.colorDark);
      // Rear diffuser slats
      ctx.fillStyle = '#222';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(left + 5, top + 3 + i * 3, w - 10, 1);
      }
      break;
    }
    case 'sports': {
      // Formula-style
      rect(ctx, left + 3, top + 2, w - 6, h - 4, obs.color);
      rect(ctx, left + 3, top + 2, 3, h - 4, obs.colorDark);
      rect(ctx, left + w - 6, top + 2, 3, h - 4, obs.colorDark);
      // Center stripe
      ctx.fillStyle = obs.colorAccent;
      ctx.fillRect(cx - 3, top + 2, 6, h - 4);
      // Nose cone taper (narrower at bottom)
      rect(ctx, left + 5, top + h - 12, w - 10, 10, obs.color);
      // Windshield
      ctx.fillStyle = '#335577';
      ctx.fillRect(left + 6, top + 4, w - 12, 8);
      // Wide rear wing (extends beyond body)
      rect(ctx, left - 2, top - 3, w + 4, 4, obs.colorDark);
      // Side air channels
      ctx.fillStyle = '#222';
      ctx.fillRect(left + 3, top + Math.floor(h * 0.4), 3, 6);
      ctx.fillRect(left + w - 6, top + Math.floor(h * 0.4), 3, 6);
      break;
    }
    case 'van': {
      // Muscle car
      rect(ctx, left + 2, top, w - 4, h, obs.color);
      // Wide fender flares (darker sides)
      rect(ctx, left + 2, top, 5, h, obs.colorDark);
      rect(ctx, left + w - 7, top, 5, h, obs.colorDark);
      // Parallel racing stripes
      ctx.fillStyle = obs.colorAccent;
      ctx.fillRect(cx - 6, top, 3, h);
      ctx.fillRect(cx + 3, top, 3, h);
      // Hood scoop
      rect(ctx, cx - 5, top + h - 12, 10, 6, obs.colorAccent);
      // Windshield
      ctx.fillStyle = '#335577';
      ctx.fillRect(left + 7, top + h - 18, w - 14, 8);
      // Rear spoiler lip
      rect(ctx, left + 2, top, w - 4, 3, obs.colorDark);
      break;
    }
  }

  // Exhaust glow at rear
  glow(ctx, '#FF6600', 4);
  circle(ctx, cx - 4, top - 1, 2, '#FF6600');
  circle(ctx, cx + 4, top - 1, 2, '#FF6600');
  noGlow(ctx);

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
