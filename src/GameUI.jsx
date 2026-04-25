import { useGameStore } from "./store";
import { useEffect, useCallback, useState } from "react";
import { startMusic, stopMusic, playCrash } from "./game/audio.js";

const MARQUEE_LETTERS = 'RECESSLAND'.split('');

function MarqueeTitle({ size = 'lg' }) {
  return (
    <div className={`marquee marquee-${size}`}>
      {MARQUEE_LETTERS.map((ch, i) => (
        <span key={i} className="marquee-tile">{ch}</span>
      ))}
    </div>
  );
}

function MarqueeRow({ text, size = 'xl' }) {
  return (
    <div className={`marquee marquee-${size}`}>
      {text.split('').map((ch, i) => (
        <span key={i} className="marquee-tile">{ch}</span>
      ))}
    </div>
  );
}

function comboMood(combo) {
  if (combo >= 20) return 'INFERNO!';
  if (combo >= 10) return 'HOT!';
  if (combo >= 5) return 'NICE!';
  return 'GO!';
}

function formatDistanceKm(distanceM) {
  const km = distanceM / 1000;
  return km.toFixed(2) + ' KM';
}

function formatTickets(n) {
  return String(n).padStart(5, '0');
}

export const GameUI = () => {
  const gameState = useGameStore(s => s.gameState);
  const score = useGameStore(s => s.score);
  const bestScore = useGameStore(s => s.bestScore);
  const bestTickets = useGameStore(s => s.bestTickets);
  const distance = useGameStore(s => s.distance);
  const tickets = useGameStore(s => s.tickets);
  const combo = useGameStore(s => s.combo);
  const comboTimer = useGameStore(s => s.comboTimer);
  const nitro = useGameStore(s => s.nitro);
  const nitroActive = useGameStore(s => s.nitroActive);
  const missionCount = useGameStore(s => s.missionCount);
  const missionTarget = useGameStore(s => s.missionTarget);
  const missionCleared = useGameStore(s => s.missionCleared);
  const raceProgress = useGameStore(s => s.raceProgress);
  const rivalProgress = useGameStore(s => s.rivalProgress);
  const startGame = useGameStore(s => s.startGame);

  const [hintVisible, setHintVisible] = useState(true);

  const handleStart = useCallback(() => {
    startGame();
    startMusic();
  }, [startGame]);

  const handleRestart = useCallback(() => {
    startGame();
    startMusic();
  }, [startGame]);

  const handleShare = useCallback(() => {
    const verb = gameState === 'finished' ? 'completed' : 'raced through';
    const text = `I ${verb} Recessland and grabbed ${tickets} tickets! Can you beat me? Play now and win 2 FREE tickets to Recessland!`;
    const url = 'https://www.recess.land';
    if (navigator.share) {
      navigator.share({ title: 'Recessland Arcade Racing', text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text + ' ' + url).then(() => {}).catch(() => {});
    }
  }, [tickets, gameState]);

  // Stop music + play crash on game over
  useEffect(() => {
    if (gameState === 'gameover') {
      stopMusic();
      playCrash();
    }
    if (gameState === 'finished') {
      stopMusic();
    }
  }, [gameState]);

  // Fade swipe hint after a few seconds of play
  useEffect(() => {
    if (gameState !== 'playing') {
      setHintVisible(true);
      return;
    }
    const t = setTimeout(() => setHintVisible(false), 4500);
    return () => clearTimeout(t);
  }, [gameState]);

  // Keyboard shortcut for start/restart
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        if (gameState === 'start') {
          e.preventDefault();
          handleStart();
        } else if (gameState === 'gameover' || gameState === 'finished') {
          e.preventDefault();
          handleRestart();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, handleStart, handleRestart]);

  const comboPct = Math.min(1, combo / 10);
  const missionPct = Math.min(1, missionCount / missionTarget);

  return (
    <div className="game-ui">
      {/* ──────── PLAYING HUD ──────── */}
      {gameState === 'playing' && (
        <>
          {/* Top bar */}
          <div className="hud-top">
            <div className="top-tickets">
              <span className="ticket-icon" aria-hidden>🎫</span>
              <div className="top-tickets-col">
                <div className="top-label">TICKETS</div>
                <div className="top-value">{formatTickets(tickets)}</div>
              </div>
            </div>
            <div className="top-marquee">
              <MarqueeTitle size="sm" />
            </div>
            <div className="top-distance">
              <div className="top-label">DISTANCE</div>
              <div className="top-value">{formatDistanceKm(distance)}</div>
            </div>
          </div>

          {/* Left combo card */}
          {combo >= 2 && (
            <div className="combo-card">
              <div className="combo-header">COMBO</div>
              <div className="combo-value">x{combo}</div>
              <div className="combo-mood">{comboMood(combo)}</div>
              <div className="combo-bar">
                <div className="combo-bar-fill" style={{ width: `${comboPct * 100}%` }} />
              </div>
              <div className="combo-timer-track">
                <div className="combo-timer-fill" style={{ width: `${Math.max(0, comboTimer) * 100}%` }} />
              </div>
            </div>
          )}

          {/* Right mission card */}
          <div className="mission-card">
            <div className="mission-head">MISSION</div>
            <div className="mission-body">
              <span className="ticket-icon" aria-hidden>🎫</span>
              <div>
                <div className="mission-text">
                  {missionCleared ? 'MISSION' : 'COLLECT'}
                </div>
                <div className="mission-text-strong">
                  {missionCleared ? 'CLEARED!' : `${missionTarget} TICKETS`}
                </div>
              </div>
            </div>
            <div className="mission-progress">
              <div className="mission-progress-fill" style={{ width: `${missionPct * 100}%` }} />
              <div className="mission-progress-label">{missionCount}/{missionTarget}</div>
            </div>
          </div>

          {/* Nitro button */}
          <button
            id="nitro-btn"
            className={`nitro-btn ${nitroActive ? 'active' : ''} ${nitro <= 0 ? 'empty' : ''}`}
            aria-label="Nitro"
          >
            <span className="nitro-bolt" aria-hidden>⚡</span>
            <span className="nitro-label">NITRO</span>
          </button>

          {/* Tap-to-steer hint */}
          {hintVisible && (
            <div className="swipe-hint">
              <span className="swipe-arrow">←</span>
              <span>TAP TO STEER</span>
              <span className="swipe-arrow">→</span>
            </div>
          )}

          {/* Bottom mini race tracker */}
          <div className="race-tracker">
            <span className="race-flag" aria-hidden>🏁</span>
            <div className="race-line">
              {(rivalProgress || []).map((rp, i) => (
                <span
                  key={i}
                  className="race-dot rival"
                  style={{ left: `${Math.min(100, Math.max(0, rp * 100))}%` }}
                />
              ))}
              <span
                className="race-dot you"
                style={{ left: `${Math.min(100, Math.max(0, (raceProgress || 0) * 100))}%` }}
              >
                <span className="race-you-label">YOU</span>
              </span>
            </div>
            <span className="race-flag" aria-hidden>🏁</span>
          </div>
        </>
      )}

      {/* ──────── START SCREEN ──────── */}
      {gameState === 'start' && (
        <div className="screen start-screen">
          <div className="start-top">
            <div className="start-tickets">
              <span className="ticket-icon" aria-hidden>🎫</span>
              <div>
                <div className="top-label">TICKETS</div>
                <div className="top-value">{formatTickets(bestTickets)}</div>
              </div>
            </div>
            <div className="start-date">23<sup>RD</sup> MAY 2026</div>
          </div>

          <div className="start-title start-title-stack">
            <MarqueeRow text="ROAD" size="xl" />
            <MarqueeRow text="2" size="xl" />
            <MarqueeRow text="RECESSLAND" size="xl" />
            <div className="start-subtitle">ARCADE RACING</div>
            <div className="start-sub-small">FESTIVAL EDITION</div>
          </div>

          <div className="prize-banner">
            <div className="prize-top">HIGHEST SCORE WINS</div>
            <div className="prize-bottom">2 FREE TICKETS!</div>
          </div>

          <div className="start-middle">
            <div className="start-card start-card-left">
              <div className="start-card-icon">🏆</div>
              <div className="start-card-title">HIGH SCORE</div>
              <div className="start-card-value">{String(bestScore).padStart(6, '0')}</div>
            </div>
            <div className="start-card start-card-right">
              <div className="start-card-icon">📖</div>
              <div className="start-card-title">HOW TO</div>
              <div className="start-card-sub">PLAY</div>
            </div>
          </div>

          <button className="btn-start" onClick={handleStart}>
            <span className="btn-flag" aria-hidden>🏁</span>
            TAP TO START
            <span className="btn-flag" aria-hidden>🏁</span>
          </button>

          <div className="footer-ribbon">
            MARGATE • 23-24 MAY 2026
          </div>
        </div>
      )}

      {/* ──────── GAME OVER ──────── */}
      {gameState === 'gameover' && (
        <div className="screen end-screen">
          <div className="end-title end-title-crash">CRASHED!</div>

          <div className="end-stats">
            <div className="end-stat">
              <div className="end-stat-label">TICKETS</div>
              <div className="end-stat-value gold">{tickets}</div>
            </div>
            <div className="end-stat">
              <div className="end-stat-label">DISTANCE</div>
              <div className="end-stat-value">{score}m</div>
            </div>
          </div>

          {tickets >= bestTickets && tickets > 0 && (
            <div className="new-best">NEW BEST!</div>
          )}

          <div className="best-score">BEST: {bestTickets} tickets • {bestScore}m</div>

          <button className="btn-retry" onClick={handleRestart}>RUN IT BACK</button>
          <button className="btn-share" onClick={handleShare}>SHARE WITH A FRIEND</button>

          <div className="prize-footer">
            <div className="prize-footer-top">HIGHEST SCORE WINS</div>
            <div className="prize-footer-bottom">2 FREE TICKETS!</div>
          </div>
          <div className="recess-link">RECESS.LAND</div>
        </div>
      )}

      {/* ──────── FINISHED ──────── */}
      {gameState === 'finished' && (
        <div className="screen end-screen">
          <div className="end-title end-title-finish">YOU MADE IT!</div>

          <div className="end-stats">
            <div className="end-stat">
              <div className="end-stat-label">TICKETS</div>
              <div className="end-stat-value gold">{tickets}</div>
            </div>
            <div className="end-stat">
              <div className="end-stat-label">DISTANCE</div>
              <div className="end-stat-value">{score}m</div>
            </div>
          </div>

          {tickets >= bestTickets && tickets > 0 && (
            <div className="new-best">NEW BEST!</div>
          )}

          <div className="best-score">BEST: {bestTickets} tickets • {bestScore}m</div>

          <button className="btn-retry" onClick={handleRestart}>RUN IT BACK</button>
          <button className="btn-share" onClick={handleShare}>SHARE WITH A FRIEND</button>

          <div className="prize-footer">
            <div className="prize-footer-top">HIGHEST SCORE WINS</div>
            <div className="prize-footer-bottom">2 FREE TICKETS!</div>
          </div>
          <div className="recess-link">RECESS.LAND</div>
        </div>
      )}
    </div>
  );
};
