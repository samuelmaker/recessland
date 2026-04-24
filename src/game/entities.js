import {
  LANE_COUNT, LANE_WIDTH, ROAD_LEFT,
  PLAYER_W, PLAYER_H, PLAYER_Y,
  COLLECTIBLE_W, COLLECTIBLE_H,
} from './constants.js';

export function laneX(lane) {
  return ROAD_LEFT + lane * LANE_WIDTH + LANE_WIDTH / 2;
}

export function createPlayer() {
  const lane = 1; // center
  return {
    lane,
    x: laneX(lane),
    targetX: laneX(lane),
    y: PLAYER_Y,
    w: PLAYER_W,
    h: PLAYER_H,
    switchTimer: 0,
    switchFrom: laneX(lane),
  };
}

// Bumper-car palette schemes: [body1, body2, body3, accent]
// Used by rivalSpriteCache lookup by palette index.
export const BUMPER_PALETTES = [
  ['#C0634A', '#F0E6D6', '#FFD700', '#FFFFFF'], // brand red
  ['#E8B949', '#F0E6D6', '#FFFFFF', '#1A0A2E'], // warm mustard yellow
  ['#4A9EC2', '#F0E6D6', '#FFFFFF', '#B6F9FF'], // seaside teal-blue
  ['#7A4FA8', '#F0E6D6', '#FFE455', '#FFFFFF'], // muted purple
];

export function createObstacle(type, lane, y) {
  let w, h;
  switch (type) {
    case 'roundie': w = 38; h = 52; break;
    case 'boxie':   w = 38; h = 62; break;
    case 'zippy':   w = 36; h = 50; break;
    case 'chunker': w = 40; h = 58; break;
    // Legacy aliases — keep working in case any code still calls old names
    case 'sedan':   w = 38; h = 52; type = 'roundie'; break;
    case 'truck':   w = 38; h = 62; type = 'boxie'; break;
    case 'sports':  w = 36; h = 50; type = 'zippy'; break;
    case 'van':     w = 40; h = 58; type = 'chunker'; break;
    default:        w = 38; h = 52; type = 'roundie';
  }
  const paletteIndex = Math.floor(Math.random() * BUMPER_PALETTES.length);
  const scheme = BUMPER_PALETTES[paletteIndex];
  return {
    type,
    lane,
    x: laneX(lane),
    y,
    w,
    h,
    active: true,
    paletteIndex,
    color: scheme[0],
    colorDark: scheme[1],
    colorAccent: scheme[2],
    // Lane changing
    switchTimer: 0,
    switchFrom: laneX(lane),
    targetLane: lane,
    targetX: laneX(lane),
  };
}

// Road collectibles (tickets + stars)
export function createTicket(lane, y) {
  return {
    kind: 'ticket',
    lane,
    x: laneX(lane),
    y,
    w: COLLECTIBLE_W,
    h: COLLECTIBLE_H,
    active: true,
    bob: Math.random() * Math.PI * 2,
  };
}

export function createStar(lane, y) {
  return {
    kind: 'star',
    lane,
    x: laneX(lane),
    y,
    w: COLLECTIBLE_W + 4,
    h: COLLECTIBLE_H + 8,
    active: true,
    bob: Math.random() * Math.PI * 2,
    spin: 0,
  };
}

// Neon decoration palettes: [primary, secondary, accent]
const NEON_PALETTES = [
  ['#FF3FA0', '#5EE8FF', '#FFE455'], // magenta/cyan/yellow
  ['#FFE455', '#FF3FA0', '#FFFFFF'], // yellow/pink/white
  ['#5EE8FF', '#FFFFFF', '#FF3FA0'], // cyan/white/pink
  ['#9A50FF', '#FFE455', '#5EE8FF'], // purple/yellow/cyan
  ['#FF6600', '#FFE455', '#FFFFFF'], // orange/yellow/white
  ['#C0634A', '#F0E6D6', '#FFD700'], // brand red/cream/gold
];

export function createDecoration(side, y) {
  const palette = NEON_PALETTES[Math.floor(Math.random() * NEON_PALETTES.length)];
  // Carnival strip: tents + neon signs + plushie stalls dominate, with
  // occasional brand billboards, flags, and party crowds.
  const r = Math.random();
  let type;
  if (r < 0.30) type = 'carnivalTent';
  else if (r < 0.50) type = 'plushieStall';
  else if (r < 0.62) type = 'neonSignFun';
  else if (r < 0.72) type = 'neonSignGto';
  else if (r < 0.80) type = 'balloonCluster';
  else if (r < 0.88) type = 'brandBillboard';
  else if (r < 0.94) type = 'partyCrowd';
  else type = 'flagPole';
  return {
    type,
    side,
    y,
    phaseOffset: Math.random() * Math.PI * 2,
    palette,
    // Deterministic per-decoration variations
    variant: Math.floor(Math.random() * 1000),
  };
}
