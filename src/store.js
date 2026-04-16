import { create } from "zustand";

const bestScoreFromStorage = parseInt(localStorage.getItem('recessland_best') || '0');

export const useGameStore = create((set, get) => ({
  gameState: 'start',
  setGameState: (gameState) => set({ gameState }),

  score: 0,
  setScore: (score) => set({ score }),
  bestScore: bestScoreFromStorage,

  distance: 0,
  setDistance: (d) => set({ distance: d }),

  startGame: () => set({
    gameState: 'playing',
    score: 0,
    distance: 0,
  }),

  endGame: () => {
    const state = get();
    const finalScore = Math.floor(state.distance);
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
    const finalScore = Math.floor(state.distance);
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
