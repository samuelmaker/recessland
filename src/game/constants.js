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
export const OBSTACLE_TYPES = ['roundie', 'boxie', 'zippy', 'chunker'];

// Obstacle lane changing
export const LANE_CHANGE_CHANCE = 0.005; // per-frame probability
export const LANE_CHANGE_FRAMES = 20;
export const LANE_CHANGE_MIN_DIST_FROM_PLAYER = 300; // px — won't change lane if closer than this to player

// Lane switch (player)
export const LANE_SWITCH_FRAMES = 8;

// Finish line (seconds)
export const FINISH_TIME = 120;

// Decoration spawn
export const DECO_SPAWN_INTERVAL = 160;

// Finish-line celebration window (ms)
export const CELEBRATION_DURATION = 1500;

// Collectibles
export const TICKET_SPAWN_CHANCE = 0.55;  // per obstacle-spawn tick
export const STAR_SPAWN_CHANCE = 0.08;    // rare bonus
export const COLLECTIBLE_W = 26;
export const COLLECTIBLE_H = 20;

// Combo
export const COMBO_DECAY_FRAMES = 140; // ~2.3s at 60fps
export const COMBO_MAX = 99;

// Nitro
export const NITRO_MAX = 10;              // bars
export const NITRO_COST_PER_FRAME = 0.05; // empties ~3.3s of hold
export const NITRO_BOOST_MULT = 1.6;
export const NITRO_GAIN_PER_TICKET = 0.8;
export const NITRO_GAIN_PER_STAR = 3;

// Mission
export const MISSION_TARGET = 20;

// Field size
export const TOTAL_RACERS = 6; // player + 5 rivals tracked

// Night-pier color palette (neon arcade)
export const COL = {
  // Brand
  red: '#C0634A',
  redDark: '#9E4F3A',
  blue: '#0091CE',
  blueDark: '#006B9E',
  cream: '#F0E6D6',
  gold: '#FFD700',
  white: '#FFFFFF',
  black: '#1a1a1a',

  // Night-pier sky gradient stops
  nightSky1: '#0A0628', // deep indigo top
  nightSky2: '#2A1250', // royal purple
  nightSky3: '#7A1F78', // magenta haze
  nightSky4: '#D04A9A', // hot pink band
  nightSky5: '#2E7BA8', // cyan haze
  nightSky6: '#0D3D5C', // dark cyan waterline

  // Neon
  neonPink: '#FF00FF',
  neonCyan: '#00FFFF',
  neonGreen: '#39FF14',
  neonOrange: '#FF6600',
  neonMagenta: '#FF3FA0',
  neonCyanSoft: '#B6F9FF',
  neonYellow: '#FFE455',

  // Ferris-wheel bulbs
  wheelWarm: '#FFE6A6',
  wheelCool: '#9EEBFF',

  // Pier deck
  road: '#2A1540',    // dark magenta-purple deck
  roadDark: '#1A0A2A',
  roadLine: '#B6F9FF', // cyan dashes
  deckEdge: '#0D3D5C',
  warmGlow: '#FFAA44',

  // Wet neon road (redesign)
  deckWetDark: '#120A24',
  deckWetMid: '#2B0F3A',
  roadReflectMagenta: '#8A1F7A',
  roadReflectCyan: '#1F5A8A',

  // Carnival tents
  tentStripeA: '#6C2BA8',
  tentStripeB: '#B32A7A',
  tentTip: '#F2C94C',
  tentGlow: '#FFB347',

  // Tickets / stars
  ticketGold: '#F4B942',
  ticketGoldDark: '#C1902D',
  ticketEdge: '#6A4B18',

  // Legacy (unused after redesign, kept for any stragglers)
  sky: '#1a1a5e',
  skyLight: '#FF7744',
  ground: '#2d7a1e',
  groundLight: '#3a8828',
  groundPath: '#302820',
};
