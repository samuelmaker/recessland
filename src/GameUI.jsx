import { useGameStore } from "./store";
import { useEffect, useCallback } from "react";
import { startMusic, stopMusic, playCrash } from "./game/audio.js";

export const GameUI = () => {
  const gameState = useGameStore(s => s.gameState);
  const score = useGameStore(s => s.score);
  const bestScore = useGameStore(s => s.bestScore);
  const distance = useGameStore(s => s.distance);
  const startGame = useGameStore(s => s.startGame);

  const handleStart = useCallback(() => {
    startGame();
    startMusic();
  }, [startGame]);

  const handleRestart = useCallback(() => {
    startGame();
    startMusic();
  }, [startGame]);

  const handleShare = useCallback(() => {
    const text = `I dodged ${score}m on Recess Land Racer! Can you beat me? Play now and win 2 FREE tickets to Recessland!`;
    const url = 'https://www.recess.land';
    if (navigator.share) {
      navigator.share({ title: 'Recess Land Giveaway', text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text + ' ' + url).then(() => {}).catch(() => {});
    }
  }, [score]);

  // Stop music + play crash on game over
  useEffect(() => {
    if (gameState === 'gameover') {
      stopMusic();
      playCrash();
    }
  }, [gameState]);

  // Keyboard shortcut for start/restart
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        if (gameState === 'start') {
          e.preventDefault();
          handleStart();
        } else if (gameState === 'gameover') {
          e.preventDefault();
          handleRestart();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, handleStart, handleRestart]);

  return (
    <div className="game-ui">
      {/* HUD - during gameplay */}
      {gameState === 'playing' && (
        <div className="hud">
          <div className="hud-score">
            <div className="hud-label">DISTANCE</div>
            <div className="hud-value">{Math.floor(distance)}m</div>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'start' && (
        <div className="screen start-screen">
          <div className="screen-content">
            <div className="title-blocks">
              {'RECESSLAND'.split('').map((ch, i) => (
                <span key={i} className="title-char">{ch}</span>
              ))}
            </div>
            <div className="subtitle">SUMMER STARTS HERE</div>
            <div className="subtitle-small">23-24 MAY 2026 • DREAMLAND MARGATE</div>

            <div className="prize-banner">
              <div className="prize-top">HIGHEST SCORE WINS</div>
              <div className="prize-bottom">2 FREE TICKETS!</div>
            </div>

            <button className="btn-start" onClick={handleStart}>
              TAP TO PLAY
            </button>

            <div className="controls-hint">
              Tap left/right to dodge • Arrow keys to switch lanes<br/>
              DON'T CRASH!
            </div>

            {bestScore > 0 && (
              <div className="best-score">BEST: {bestScore}m</div>
            )}
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <div className="screen gameover-screen">
          <div className="screen-content">
            <div className="gameover-title">CRASHED!</div>

            <div className="score-label">DISTANCE</div>
            <div className="score-big">{score}m</div>

            <div className="best-score">BEST: {bestScore}m</div>

            {score >= bestScore && score > 0 && (
              <div className="new-best">NEW BEST!</div>
            )}

            <button className="btn-retry" onClick={handleRestart}>
              RUN IT BACK
            </button>

            <button className="btn-share" onClick={handleShare}>
              SHARE WITH A FRIEND
            </button>

            <div className="prize-footer">
              <div className="prize-footer-top">HIGHEST SCORE WINS</div>
              <div className="prize-footer-bottom">2 FREE TICKETS!</div>
            </div>

            <div className="recess-link">RECESS.LAND</div>
          </div>
        </div>
      )}
    </div>
  );
};
