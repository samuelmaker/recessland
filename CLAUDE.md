# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Recess Land Giveaway — a Flappy Bird-style browser game for a festival promotion (Recessland, 23-24 May 2026, Dreamland Margate). Highest score wins 2 free tickets. The entire game is a single `index.html` file with inline CSS and JavaScript, plus two audio files.

## Running

Open `index.html` in a browser. No build step, no dependencies, no package manager. To serve locally:

```
npx serve .
# or
python3 -m http.server
```

## Architecture

**Single-file game** — all logic lives in an IIFE inside `index.html`:

- **Game states**: `start` → `playing` → `gameover` (variable `state`)
- **Game loop**: `requestAnimationFrame(loop)` with delta-time scaling to target 60fps
- **Rendering**: Canvas 2D (`<canvas id="game">`), pixel-art style via `drawPixelRect()` helper. Background elements (ground, funfair structures) are cached to an offscreen canvas (`bgCanvas`) in `renderBackground()` for performance; only animated elements (ferris wheels, crowd, rollercoaster carts) redraw each frame.
- **Scaling**: All game constants (gravity, pipe speed, gap size, bird size) scale proportionally to screen height via `hs = H / BASE_H` (BASE_H = 700px). Recalculated on resize.
- **Audio**: Web Audio API for procedural sounds (flap, score beep) + two mp3 files: `oh.mp3` (death sound, cloned each play) and `background.mp3` (looping music with fade-in)
- **Persistence**: Best score stored in `localStorage` key `recessland_best`
- **Input**: Touch, mouse, and spacebar all trigger `flap()`/`handleInput()`
- **Collision**: AABB check against pipes and ground/ceiling boundaries

## Key color palette

Defined in `COL` object — uses Recessland brand colors (red `#C0634A`, sky blue `#0091CE`, cream `#F0E6D6`, etc.).

## Files

- `index.html` — the entire game
- `background.mp3` — looping background music
- `oh.mp3` — death sound effect

## Leaderboard / Score Persistence

A serverless leaderboard runs on Vercel + Upstash Redis (Vercel KV-compatible). Players submit a score with a name on the end screen; the user cross-references screenshots tagged `@rec_ess` against this server-side record to detect Photoshopped scores.

### API routes (in `api/`)

- `POST /api/start-run` → `{ runId, nonce }`. Creates `run:<runId>` hash with `state: 'started'`, single-use nonce (30-min TTL).
- `POST /api/submit-score` → body `{ runId, name, score, tickets, distance, durationMs, sig }`. Server verifies HMAC-SHA256 with the nonce as key, checks soft caps, and rejects if `score !== floor(distance) + tickets * 100`. On success: writes the run, `ZADD`s `leaderboard`, returns `{ ok, rank }`. Rate-limited 5/min/IP.
- `GET /api/leaderboard?limit=3` → top N entries `[{ rank, name, score }]` (15s cache).
- `GET /api/admin/runs?key=<ADMIN_KEY>&name=<lowercase>` → full run records for screenshot cross-referencing. `name` filter is optional; without it returns the top 50 by score.

### Env vars (set in Vercel)

- `KV_REST_API_URL`, `KV_REST_API_TOKEN` — auto-injected when an Upstash KV store is attached in the Vercel dashboard.
- `LEADERBOARD_SECRET` — long random string. Salts the IP hash; required (server returns 500 if missing).
- `ADMIN_KEY` — long random string. Required to access `/api/admin/runs`.

### Cross-referencing a screenshot

```
curl "https://<your-vercel-url>/api/admin/runs?key=$ADMIN_KEY&name=alex"
```

Returns all submitted runs for that name (newest first), each with `score`, `tickets`, `distance`, `durationMs`, `finishedAt`. If a tweeted screenshot's score doesn't match any row for that name, it's fake.

### Anti-tamper model

- Two-phase flow: client must call `/api/start-run` first to obtain a server-issued nonce. The nonce is the HMAC key for both client signing and server verification.
- Soft caps reject impossible runs (duration outside [5s, 180s], distance > duration × 0.13, tickets > duration / 500ms).
- Killer check: `score === floor(distance) + tickets × 100` is verified server-side, so tampering any one field breaks the formula.
- Single-use: a run's `state` flips to `submitted` after success, so the same nonce can't be replayed.
- Rate limit: 5 submits/min per hashed IP.
