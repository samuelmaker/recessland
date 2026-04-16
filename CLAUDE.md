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
