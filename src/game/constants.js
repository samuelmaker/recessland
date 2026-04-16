// Design canvas (base resolution, scales to fit screen)
export const BASE_W = 400;
export const BASE_H = 700;

// Lanes
export const LANE_COUNT = 3;
export const LANE_WIDTH = 80;
export const ROAD_WIDTH = LANE_COUNT * LANE_WIDTH;
export const ROAD_LEFT = (BASE_W - ROAD_WIDTH) / 2;

// Player
export const PLAYER_W = 44;
export const PLAYER_H = 64;
export const PLAYER_Y = BASE_H - 140;

// Scrolling speed (px per frame at 60fps)
export const INITIAL_SPEED = 9;
export const MAX_SPEED = 20;
export const SPEED_RAMP_SECONDS = 60;

// Obstacles (cars)
export const OBSTACLE_SPAWN_INTERVAL_START = 50;
export const OBSTACLE_SPAWN_INTERVAL_MIN = 22;
export const OBSTACLE_TYPES = ['sedan', 'truck', 'sports', 'van'];

// Obstacle lane changing
export const LANE_CHANGE_CHANCE = 0.005; // per-frame probability
export const LANE_CHANGE_FRAMES = 20;
export const LANE_CHANGE_MIN_DIST_FROM_PLAYER = 300; // px — won't change lane if closer than this to player

// Lane switch (player)
export const LANE_SWITCH_FRAMES = 8;

// Finish line (seconds)
export const FINISH_TIME = 120;

// Decoration spawn
export const DECO_SPAWN_INTERVAL = 90;

// Evening seaside color palette
export const COL = {
  red: '#C0634A',
  redDark: '#9E4F3A',
  blue: '#0091CE',
  blueDark: '#006B9E',
  cream: '#F0E6D6',
  gold: '#FFD700',
  sky: '#1a1a5e',
  skyLight: '#FF7744',
  road: '#333333',
  roadDark: '#2a2a2a',
  roadLine: '#FFDD44',
  ground: '#2d7a1e',
  groundLight: '#3a8828',
  groundPath: '#302820',
  white: '#FFFFFF',
  black: '#1a1a1a',
  neonPink: '#FF00FF',
  neonCyan: '#00FFFF',
  neonGreen: '#39FF14',
  neonOrange: '#FF6600',
  warmGlow: '#FFAA44',
};
