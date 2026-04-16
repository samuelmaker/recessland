import {
  LANE_COUNT, LANE_WIDTH, ROAD_LEFT,
  PLAYER_W, PLAYER_H, PLAYER_Y,
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

// Car color schemes: [body, bodyDark, accent]
const CAR_COLORS = [
  ['#E74C3C', '#C0392B', '#F5B7B1'], // red
  ['#3498DB', '#2471A3', '#AED6F1'], // blue
  ['#F39C12', '#D68910', '#F9E79F'], // orange
  ['#9B59B6', '#7D3C98', '#D2B4DE'], // purple
  ['#1ABC9C', '#148F77', '#A3E4D7'], // teal
  ['#2ECC71', '#229954', '#A9DFBF'], // green
  ['#E67E22', '#CA6F1E', '#F5CBA7'], // dark orange
  ['#FFD700', '#CC9900', '#FFEE88'], // racing gold
  ['#111111', '#000000', '#FF0000'], // black + red racing
];

export function createObstacle(type, lane, y) {
  let w, h;
  switch (type) {
    case 'sedan':  w = 38; h = 52; break;
    case 'truck':  w = 38; h = 62; break;
    case 'sports': w = 36; h = 50; break;
    case 'van':    w = 40; h = 58; break;
    default:       w = 38; h = 52;
  }
  const scheme = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
  return {
    type,
    lane,
    x: laneX(lane),
    y,
    w,
    h,
    active: true,
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

const TENT_COLORS = [
  ['#C0634A', '#F0E6D6'],  // recessland red + cream
  ['#E74C3C', '#FFFFFF'],  // red + white
  ['#FFD700', '#C0634A'],  // gold + red
  ['#0091CE', '#FFFFFF'],  // blue + white
  ['#FF6600', '#FFFFFF'],  // orange + white
  ['#9B59B6', '#F0E6D6'],  // purple + cream
  ['#2ECC71', '#FFFFFF'],  // green + white
  ['#55BBDD', '#FFFFFF'],  // sky blue + white (beach hut)
  ['#FF9999', '#FFFFFF'],  // pink + white (beach hut)
  ['#FFDD55', '#FFFFFF'],  // sandy yellow + white (beach hut)
];

export function createDecoration(side, y) {
  const colors = TENT_COLORS[Math.floor(Math.random() * TENT_COLORS.length)];
  // Weighted random: 30% tent, 20% flagpole, 15% van, 20% beachHut, 15% bunting
  const r = Math.random();
  let type;
  if (r < 0.30) type = 'tent';
  else if (r < 0.50) type = 'flagpole';
  else if (r < 0.65) type = 'van';
  else if (r < 0.85) type = 'beachHut';
  else type = 'bunting';
  return {
    type,
    side,
    y,
    canopyColor1: colors[0],
    canopyColor2: colors[1],
  };
}
