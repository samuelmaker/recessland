import { create } from "zustand";
import {
  MISSION_TARGET, NITRO_MAX, TOTAL_RACERS,
} from "./game/constants.js";

const bestScoreFromStorage = parseInt(localStorage.getItem('recessland_best') || '0');
const bestTicketsFromStorage = parseInt(localStorage.getItem('recessland_best_tickets') || '0');

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
  bestTickets: bestTicketsFromStorage,
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
    const finalScore = Math.floor(state.distance);
    const newBest = finalScore > state.bestScore;
    const newBestTickets = state.tickets > state.bestTickets;
    if (newBest) {
      localStorage.setItem('recessland_best', finalScore.toString());
    }
    if (newBestTickets) {
      localStorage.setItem('recessland_best_tickets', state.tickets.toString());
    }
    set({
      gameState: 'gameover',
      score: finalScore,
      bestScore: newBest ? finalScore : state.bestScore,
      bestTickets: newBestTickets ? state.tickets : state.bestTickets,
    });
  },

  finishGame: () => {
    const state = get();
    const finalScore = Math.floor(state.distance);
    const newBest = finalScore > state.bestScore;
    const newBestTickets = state.tickets > state.bestTickets;
    if (newBest) {
      localStorage.setItem('recessland_best', finalScore.toString());
    }
    if (newBestTickets) {
      localStorage.setItem('recessland_best_tickets', state.tickets.toString());
    }
    set({
      gameState: 'finished',
      score: finalScore,
      bestScore: newBest ? finalScore : state.bestScore,
      bestTickets: newBestTickets ? state.tickets : state.bestTickets,
    });
  },
}));
