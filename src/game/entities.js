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
  ['#FFFFFF', '#CCCCCC', '#EEEEEE'], // white
];

export function createObstacle(type, lane, y) {
  let w, h;
  switch (type) {
    case 'sedan':  w = 40; h = 58; break;
    case 'truck':  w = 40; h = 70; break;
    case 'sports': w = 38; h = 54; break;
    case 'van':    w = 44; h = 66; break;
    default:       w = 40; h = 58;
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
];

export function createDecoration(side, y) {
  const colors = TENT_COLORS[Math.floor(Math.random() * TENT_COLORS.length)];
  // Weighted random: 50% tent, 30% flagpole, 20% van
  const r = Math.random();
  const type = r < 0.5 ? 'tent' : r < 0.8 ? 'flagpole' : 'van';
  return {
    type,
    side,
    y,
    canopyColor1: colors[0],
    canopyColor2: colors[1],
  };
}
