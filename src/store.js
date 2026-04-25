import { create } from "zustand";
import {
  MISSION_TARGET, NITRO_MAX, TOTAL_RACERS,
} from "./game/constants.js";

const bestScoreFromStorage = parseInt(localStorage.getItem('recessland_best') || '0');

// Score formula: 1 point per metre + 100 points per ticket.
export const TICKET_SCORE_VALUE = 100;
export const computeScore = (distance, tickets) =>
  Math.floor(distance) + tickets * TICKET_SCORE_VALUE;

export const useGameStore = create((set, get) => ({
  gameState: 'start',
  setGameState: (gameState) => set({ gameState }),

  score: 0,
  setScore: (score) => set({ score }),
  bestScore: bestScoreFromStorage,

  distance: 0,
  setDistance: (d) => set({ distance: d }),

  // HUD
  tickets: 0,
  combo: 0,
  comboTimer: 0,           // 0..1 remaining fraction (for bar)
  nitro: 0,                // 0..NITRO_MAX
  nitroMax: NITRO_MAX,
  nitroActive: false,
  missionCount: 0,
  missionTarget: MISSION_TARGET,
  missionCleared: false,
  positionRank: TOTAL_RACERS, // starts last
  totalRacers: TOTAL_RACERS,
  raceProgress: 0,         // 0..1 (player progress toward finish)
  rivalProgress: [],       // array of 0..1 values for each tracked rival
  speedKmh: 0,

  // One shallow setter to minimise renders
  updateHud: (patch) => set(patch),

  startGame: () => set({
    gameState: 'playing',
    score: 0,
    distance: 0,
    tickets: 0,
    combo: 0,
    comboTimer: 0,
    nitro: 0,
    nitroActive: false,
    missionCount: 0,
    missionCleared: false,
    positionRank: TOTAL_RACERS,
    raceProgress: 0,
    rivalProgress: [],
    speedKmh: 0,
  }),

  endGame: () => {
    const state = get();
    const finalScore = computeScore(state.distance, state.tickets);
    const newBest = finalScore > state.bestScore;
    if (newBest) {
      localStorage.setItem('recessland_best', finalScore.toString());
    }
    set({
      gameState: 'gameover',
      score: finalScore,
      bestScore: newBest ? finalScore : state.bestScore,
    });
  },

  finishGame: () => {
    const state = get();
    const finalScore = computeScore(state.distance, state.tickets);
    const newBest = finalScore > state.bestScore;
    if (newBest) {
      localStorage.setItem('recessland_best', finalScore.toString());
    }
    set({
      gameState: 'finished',
      score: finalScore,
      bestScore: newBest ? finalScore : state.bestScore,
    });
  },
}));
