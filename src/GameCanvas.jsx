import { useEffect, useRef } from 'react';
import { useGameStore } from './store.js';
import { initEngine, startGame, startAttractMode, startLoop, stopLoop } from './game/engine.js';
import { initInput, destroyInput } from './game/input.js';

export const GameCanvas = () => {
  const canvasRef = useRef(null);
  const gameState = useGameStore(s => s.gameState);

  // Init engine + input on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    initEngine(useGameStore);
    initInput(canvas);
    // Start attract mode scrolling
    startAttractMode();
    startLoop(canvas);
    return () => {
      destroyInput();
      stopLoop();
    };
  }, []);

  // React to game state changes
  useEffect(() => {
    if (gameState === 'playing') {
      startGame();
    } else if (gameState === 'start') {
      startAttractMode();
    }
  }, [gameState]);

  return (
    <canvas
      ref={canvasRef}
      id="game"
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        touchAction: 'manipulation',
      }}
    />
  );
};
