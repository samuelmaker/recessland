import { useGameStore, computeScore } from "./store";
import { useEffect, useCallback, useState } from "react";
import { startMusic, stopMusic, playCrash } from "./game/audio.js";
import { submitScore, fetchLeaderboard } from "./lib/scoreApi.js";

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

function formatScore(n) {
  return String(Math.max(0, Math.floor(n))).padStart(6, '0');
}

function LeaderboardList({ entries, label = 'TOP 3' }) {
  if (!entries || entries.length === 0) return null;
  return (
    <div className="leaderboard">
      <div className="leaderboard-label">{label}</div>
      <ol className="leaderboard-list">
        {entries.map((e) => (
          <li key={e.rank} className="leaderboard-row">
            <span className="lb-rank">{e.rank}</span>
            <span className="lb-name">{e.name}</span>
            <span className="lb-score">{formatScore(e.score)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export const GameUI = () => {
  const gameState = useGameStore(s => s.gameState);
  const score = useGameStore(s => s.score);
  const bestScore = useGameStore(s => s.bestScore);
  const distance = useGameStore(s => s.distance);
  const tickets = useGameStore(s => s.tickets);
  const liveScore = computeScore(distance, tickets);
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

  const durationMs = useGameStore(s => s.durationMs);
  const name = useGameStore(s => s.name);
  const setName = useGameStore(s => s.setName);
  const leaderboard = useGameStore(s => s.leaderboard);
  const setLeaderboard = useGameStore(s => s.setLeaderboard);
  const submitting = useGameStore(s => s.submitting);
  const setSubmitting = useGameStore(s => s.setSubmitting);
  const submitError = useGameStore(s => s.submitError);
  const setSubmitError = useGameStore(s => s.setSubmitError);
  const submittedRank = useGameStore(s => s.submittedRank);
  const setSubmittedRank = useGameStore(s => s.setSubmittedRank);

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
    const text = `I ${verb} Recessland with a score of ${score}! Tag @rec_ess to enter — highest score wins 2 FREE tickets!`;
    const url = 'https://www.recess.land';
    if (navigator.share) {
      navigator.share({ title: 'Recessland Arcade Racing', text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text + ' ' + url).then(() => {}).catch(() => {});
    }
  }, [score, gameState]);

  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = (name || '').trim();
    if (!trimmed) {
      setSubmitError('Enter a name first');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const res = await submitScore({
      name: trimmed,
      score,
      tickets,
      distance: Math.floor(distance),
      durationMs,
    });
    setSubmitting(false);
    if (res && res.ok) {
      setSubmittedRank(res.rank);
      // Refresh top-3 so the player sees their entry
      const top = await fetchLeaderboard(3);
      setLeaderboard(top);
    } else {
      setSubmitError((res && res.error) || 'Could not save score');
    }
  }, [name, score, tickets, distance, durationMs,
      setSubmitting, setSubmitError, setSubmittedRank, setLeaderboard]);

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

  // Fetch top 3 on first start-screen mount and on returning to start/end screens
  useEffect(() => {
    if (gameState === 'start' || gameState === 'gameover' || gameState === 'finished') {
      let cancelled = false;
      fetchLeaderboard(3).then((top) => {
        if (!cancelled) setLeaderboard(top);
      });
      return () => { cancelled = true; };
    }
  }, [gameState, setLeaderboard]);

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
          {/* Top bar — single unified score */}
          <div className="hud-top hud-top-score">
            <div className="top-score">
              <div className="top-label">SCORE</div>
              <div className="top-score-value">{formatScore(liveScore)}</div>
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
            <div className="start-best">
              <span className="ticket-icon" aria-hidden>🏆</span>
              <div>
                <div className="top-label">BEST SCORE</div>
                <div className="top-value">{formatScore(bestScore)}</div>
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

          <LeaderboardList entries={leaderboard} label="TOP 3" />

          <div className="prize-banner">
            <div className="prize-top">HIGHEST SCORE WINS</div>
            <div className="prize-bottom">2 FREE TICKETS!</div>
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

          <div className="end-score">
            <div className="end-score-label">SCORE</div>
            <div className="end-score-value">{formatScore(score)}</div>
          </div>

          {score >= bestScore && score > 0 && (
            <div className="new-best">NEW BEST!</div>
          )}

          {score > 0 && submittedRank == null && (
            <form className="save-form" onSubmit={handleSubmit}>
              <input
                className="save-input"
                type="text"
                maxLength={16}
                placeholder="YOUR NAME"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                autoComplete="off"
              />
              <button className="btn-save" type="submit" disabled={submitting}>
                {submitting ? 'SAVING…' : 'SAVE SCORE'}
              </button>
              {submitError && <div className="save-error">{submitError}</div>}
            </form>
          )}

          {submittedRank != null && (
            <div className="save-success">
              <div className="rank-badge">RANK #{submittedRank}</div>
              <div className="social-cta">
                Screenshot your score and tag <strong>@rec_ess</strong> on Twitter or Instagram for a chance to win 2 FREE tickets!
              </div>
            </div>
          )}

          <LeaderboardList entries={leaderboard} label="TOP 3" />

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

          <div className="end-score">
            <div className="end-score-label">SCORE</div>
            <div className="end-score-value">{formatScore(score)}</div>
          </div>

          {score >= bestScore && score > 0 && (
            <div className="new-best">NEW BEST!</div>
          )}

          {score > 0 && submittedRank == null && (
            <form className="save-form" onSubmit={handleSubmit}>
              <input
                className="save-input"
                type="text"
                maxLength={16}
                placeholder="YOUR NAME"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                autoComplete="off"
              />
              <button className="btn-save" type="submit" disabled={submitting}>
                {submitting ? 'SAVING…' : 'SAVE SCORE'}
              </button>
              {submitError && <div className="save-error">{submitError}</div>}
            </form>
          )}

          {submittedRank != null && (
            <div className="save-success">
              <div className="rank-badge">RANK #{submittedRank}</div>
              <div className="social-cta">
                Screenshot your score and tag <strong>@rec_ess</strong> on Twitter or Instagram for a chance to win 2 FREE tickets!
              </div>
            </div>
          )}

          <LeaderboardList entries={leaderboard} label="TOP 3" />

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
