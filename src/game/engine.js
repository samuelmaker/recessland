import {
  BASE_W, BASE_H,
  LANE_COUNT, LANE_WIDTH, ROAD_LEFT, ROAD_WIDTH,
  INITIAL_SPEED, MAX_SPEED, SPEED_RAMP_SECONDS,
  OBSTACLE_SPAWN_INTERVAL_START, OBSTACLE_SPAWN_INTERVAL_MIN,
  LANE_SWITCH_FRAMES,
  LANE_CHANGE_CHANCE, LANE_CHANGE_FRAMES, LANE_CHANGE_MIN_DIST_FROM_PLAYER,
  PLAYER_Y,
  DECO_SPAWN_INTERVAL,
  FINISH_TIME,
  CELEBRATION_DURATION,
  TICKET_SPAWN_CHANCE, STAR_SPAWN_CHANCE,
  COMBO_DECAY_FRAMES, COMBO_MAX,
  NITRO_MAX, NITRO_COST_PER_FRAME, NITRO_BOOST_MULT,
  NITRO_GAIN_PER_TICKET, NITRO_GAIN_PER_STAR,
  MISSION_TARGET, TOTAL_RACERS,
} from './constants.js';
import { consumeInput } from './input.js';
import {
  createPlayer, createObstacle, createDecoration, laneX,
  createTicket, createStar,
} from './entities.js';
import {
  initRenderer,
  drawSky, drawGround, drawRoad, drawDecorations,
  drawPlayer, drawCar, drawExplosion,
  drawBackgroundFerrisWheel, drawFinishArch,
  drawCollectible,
  emitExhaust, drawExhaustParticles, stepExhaustParticles, resetExhaustParticles,
  createCelebration, stepCelebration, drawCelebration,
} from './renderer.js';

// ─── Game state ───

let player = null;
let obstacles = [];
let collectibles = [];
let decorations = [];
let explosion = null;
let scrollY = 0;
let speed = INITIAL_SPEED;
let distance = 0;
let elapsed = 0;
let frameCount = 0;
let spawnTimer = 0;
let decoTimer = 0;
let gameOver = false;
let finished = false;
let finishLineY = -9999;
let immuneFrames = 0;
let attractMode = false;
let celebration = null;
let shakeFrames = 0;

// New gameplay systems
let tickets = 0;
let combo = 0;
let comboTimer = 0;
let nitro = 0;
let nitroActive = false;
let missionCount = 0;
let missionCleared = false;
let hudPushTimer = 0; // throttle store writes

let storeRef = null;
let rafId = null;
let lastTime = 0;

// ─── Public API ───

export function initEngine(store) {
  storeRef = store;
  initRenderer();
}

export function startGame() {
  player = createPlayer();
  obstacles = [];
  collectibles = [];
  decorations = [];
  explosion = null;
  scrollY = 0;
  speed = INITIAL_SPEED;
  distance = 0;
  elapsed = 0;
  frameCount = 0;
  spawnTimer = 0;
  decoTimer = 0;
  gameOver = false;
  finished = false;
  finishLineY = -9999;
  immuneFrames = 90;
  attractMode = false;
  celebration = null;
  shakeFrames = 0;
  tickets = 0;
  combo = 0;
  comboTimer = 0;
  nitro = 0;
  nitroActive = false;
  missionCount = 0;
  missionCleared = false;
  hudPushTimer = 0;
  resetExhaustParticles();
}

export function startAttractMode() {
  player = null;
  obstacles = [];
  collectibles = [];
  decorations = [];
  explosion = null;
  scrollY = 0;
  speed = 1.5;
  distance = 0;
  elapsed = 0;
  frameCount = 0;
  spawnTimer = 0;
  decoTimer = 0;
  gameOver = false;
  attractMode = true;
  celebration = null;
  shakeFrames = 0;
  resetExhaustParticles();
}

export function startLoop(canvas) {
  const ctx = canvas.getContext('2d');
  lastTime = performance.now();

  function loop(now) {
    const dt = Math.min((now - lastTime) / 16.667, 3);
    lastTime = now;

    update(dt);
    render(ctx, canvas);

    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}

export function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// ─── Update ───

function update(dt) {
  frameCount++;

  if (attractMode) {
    scrollY += speed * dt;
    updateDecorations(dt);
    return;
  }

  elapsed += dt / 60;

  // Speed ramp
  const progress = Math.min(elapsed / SPEED_RAMP_SECONDS, 1);
  const baseSpeed = INITIAL_SPEED + (MAX_SPEED - INITIAL_SPEED) * progress;

  // Nitro: held + available → boost
  const input = consumeInput();
  nitroActive = input.nitro && nitro > 0 && !gameOver;
  if (nitroActive) {
    nitro = Math.max(0, nitro - NITRO_COST_PER_FRAME * dt);
  }
  speed = baseSpeed * (nitroActive ? NITRO_BOOST_MULT : 1);

  scrollY += speed * dt;

  // Distance
  distance += speed * dt * 0.3;
  if (storeRef) storeRef.getState().setDistance(distance);

  // Finish line — spawn it when time is nearly up
  if (!finished && elapsed >= FINISH_TIME - 3 && finishLineY < -9000) {
    finishLineY = -40; // spawn above screen
  }
  // Scroll finish line down
  if (finishLineY > -9000) {
    finishLineY += speed * dt * 0.85;
    // Player crosses the finish line
    if (!finished && player && finishLineY >= PLAYER_Y) {
      finished = true;
      gameOver = true;
      celebration = createCelebration();
      setTimeout(() => {
        if (storeRef) storeRef.getState().finishGame();
      }, CELEBRATION_DURATION);
    }
  }

  // Step celebration particles
  if (celebration) stepCelebration(celebration, dt);

  // Immunity countdown
  if (immuneFrames > 0) immuneFrames -= dt;

  // Input → player lane switch
  if (player) {
    if (player.switchTimer <= 0) {
      if (input.left && player.lane > 0) {
        player.switchFrom = player.x;
        player.lane--;
        player.targetX = laneX(player.lane);
        player.switchTimer = LANE_SWITCH_FRAMES;
      } else if (input.right && player.lane < LANE_COUNT - 1) {
        player.switchFrom = player.x;
        player.lane++;
        player.targetX = laneX(player.lane);
        player.switchTimer = LANE_SWITCH_FRAMES;
      }
    }

    // Animate player lane switch
    if (player.switchTimer > 0) {
      player.switchTimer -= dt;
      const t = Math.max(0, 1 - player.switchTimer / LANE_SWITCH_FRAMES);
      player.x = player.switchFrom + (player.targetX - player.switchFrom) * easeOut(t);
    } else {
      player.x = player.targetX;
    }
  }

  // Spawn obstacles
  spawnTimer += dt;
  const spawnInterval = OBSTACLE_SPAWN_INTERVAL_START
    - (OBSTACLE_SPAWN_INTERVAL_START - OBSTACLE_SPAWN_INTERVAL_MIN) * progress;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnWave(progress);
  }

  // Update obstacles
  for (const obs of obstacles) {
    // Obstacle cars scroll down — player approaches them from behind
    // The speed multiplier decreases over time so player gains on them faster
    const obsSpeedMult = 0.8 - progress * 0.25; // 0.8 → 0.55 over time
    obs.y += speed * dt * obsSpeedMult;

    // Lane changing AI
    if (obs.switchTimer > 0) {
      obs.switchTimer -= dt;
      const t = Math.max(0, 1 - obs.switchTimer / LANE_CHANGE_FRAMES);
      obs.x = obs.switchFrom + (obs.targetX - obs.switchFrom) * easeOut(t);
      if (obs.switchTimer <= 0) {
        obs.x = obs.targetX;
        obs.lane = obs.targetLane;
      }
    } else if (Math.random() < LANE_CHANGE_CHANCE) {
      // Only change lane if far enough from the player to give time to react
      const distFromPlayer = PLAYER_Y - obs.y;
      if (distFromPlayer > LANE_CHANGE_MIN_DIST_FROM_PLAYER) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        const newLane = obs.lane + dir;
        if (newLane >= 0 && newLane < LANE_COUNT) {
          // Check if new lane is clear of nearby obstacles (including those mid-switch)
          const clear = !obstacles.some(other =>
            other !== obs &&
            (other.lane === newLane || (other.switchTimer > 0 && other.targetLane === newLane)) &&
            Math.abs(other.y - obs.y) < 100
          );
          if (clear) {
            obs.switchFrom = obs.x;
            obs.targetLane = newLane;
            obs.targetX = laneX(newLane);
            obs.switchTimer = LANE_CHANGE_FRAMES;
          }
        }
      }
    }
  }

  // Remove off-screen
  obstacles = obstacles.filter(o => o.y < BASE_H + 100);

  // Collision with obstacles
  if (player && immuneFrames <= 0 && !gameOver) {
    for (const obs of obstacles) {
      if (!obs.active) continue;
      if (aabb(player, obs)) {
        triggerGameOver(obs);
        break;
      }
    }
  }

  // Collectibles
  for (const c of collectibles) {
    c.y += speed * dt * 0.8;
    c.bob += dt * 0.12;
    if (c.kind === 'star') c.spin = (c.spin || 0) + dt * 0.08;
  }
  // Pickup check
  if (player && !gameOver) {
    for (const c of collectibles) {
      if (!c.active) continue;
      if (aabb(player, c)) {
        collectPickup(c);
      }
    }
  }
  collectibles = collectibles.filter(c => c.active && c.y < BASE_H + 60);

  // Combo decay
  if (combo > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) {
      combo = 0;
      comboTimer = 0;
    }
  }

  // Explosion animation
  if (explosion) {
    explosion.frame += dt;
    if (explosion.frame > 30) explosion = null;
  }

  // Screen shake decay
  if (shakeFrames > 0) shakeFrames -= dt;

  // Exhaust particles
  if (player && !gameOver) {
    const emitChance = nitroActive ? 0.9 : 0.4;
    if (Math.random() < emitChance) {
      const col = nitroActive
        ? (Math.random() < 0.5 ? '#5EE8FF' : '#FFE455')
        : '#B6F9FF';
      emitExhaust(player, col);
    }
  }
  stepExhaustParticles(dt);

  // Decorations
  updateDecorations(dt);

  // Push HUD to store (throttle ~6 Hz)
  hudPushTimer -= dt;
  if (hudPushTimer <= 0) {
    hudPushTimer = 10; // every 10 frames (~6Hz)
    pushHud(progress);
  }
}

function spawnWave(progress) {
  const lane = Math.floor(Math.random() * LANE_COUNT);

  // Harder type pool — boxies/chunkers dominate later
  let typePool;
  if (progress < 0.2) {
    typePool = ['roundie', 'roundie', 'zippy', 'roundie'];
  } else if (progress < 0.4) {
    typePool = ['roundie', 'boxie', 'zippy', 'chunker'];
  } else {
    typePool = ['boxie', 'boxie', 'chunker', 'chunker'];
  }
  const type = typePool[Math.floor(Math.random() * typePool.length)];
  obstacles.push(createObstacle(type, lane, -80));

  // Sometimes spawn a second car (always leave at least one lane open)
  let lane2 = null;
  if (progress > 0.2 && Math.random() < 0.55) {
    lane2 = (lane + (Math.random() < 0.5 ? 1 : 2)) % LANE_COUNT;
    const type2 = typePool[Math.floor(Math.random() * typePool.length)];
    obstacles.push(createObstacle(type2, lane2, -80));
  }

  // Roll for collectibles in a LANE that wasn't just populated with a car.
  // Place them well below/above so they don't spawn on top of a car.
  const usedLanes = new Set([lane]);
  if (lane2 != null) usedLanes.add(lane2);
  const freeLanes = [];
  for (let l = 0; l < LANE_COUNT; l++) if (!usedLanes.has(l)) freeLanes.push(l);

  if (freeLanes.length > 0) {
    if (Math.random() < TICKET_SPAWN_CHANCE) {
      const tl = freeLanes[Math.floor(Math.random() * freeLanes.length)];
      // Offset the ticket forward so you pick it up as you catch up.
      collectibles.push(createTicket(tl, -80 + Math.random() * 40));
    }
    if (Math.random() < STAR_SPAWN_CHANCE) {
      const sl = freeLanes[Math.floor(Math.random() * freeLanes.length)];
      collectibles.push(createStar(sl, -140 - Math.random() * 40));
    }
  }
}

function collectPickup(c) {
  c.active = false;
  if (c.kind === 'ticket') {
    tickets++;
    if (!missionCleared) {
      missionCount++;
      if (missionCount >= MISSION_TARGET) missionCleared = true;
    }
    combo = Math.min(COMBO_MAX, combo + 1);
    comboTimer = COMBO_DECAY_FRAMES;
    nitro = Math.min(NITRO_MAX, nitro + NITRO_GAIN_PER_TICKET);
  } else if (c.kind === 'star') {
    // Big boost: +3 combo, full nitro refill chunk
    combo = Math.min(COMBO_MAX, combo + 3);
    comboTimer = COMBO_DECAY_FRAMES;
    nitro = Math.min(NITRO_MAX, nitro + NITRO_GAIN_PER_STAR);
    tickets += 3; // star = 3 tickets equivalent
    if (!missionCleared) {
      missionCount = Math.min(MISSION_TARGET, missionCount + 3);
      if (missionCount >= MISSION_TARGET) missionCleared = true;
    }
  }
}

function pushHud(progress) {
  if (!storeRef) return;
  // Race position: player's "virtual" progress is time-based (we finish at FINISH_TIME).
  // Rivals are tracked by their current on-screen y: the higher the y, the further ahead
  // they are from the player. Compute a position rank based on how many active rivals
  // have y < player.y (i.e. are visually ahead).
  const playerProgress = Math.min(1, elapsed / FINISH_TIME);
  let ahead = 0;
  // Use the closest TOTAL_RACERS-1 rivals to compute position
  const rivalsByProximity = [...obstacles]
    .filter(o => o.active)
    .sort((a, b) => Math.abs(a.y - PLAYER_Y) - Math.abs(b.y - PLAYER_Y))
    .slice(0, TOTAL_RACERS - 1);
  for (const o of rivalsByProximity) {
    if (o.y < PLAYER_Y - 20) ahead++;
  }
  const rank = Math.min(TOTAL_RACERS, 1 + ahead);

  // Rival progress values for mini-tracker: blend time-based drift with
  // their on-screen position relative to the player.
  const rivalProgress = rivalsByProximity.map((o, i) => {
    const offset = (PLAYER_Y - o.y) / BASE_H * 0.15;
    return Math.max(0, Math.min(1, playerProgress + offset + (i - 2) * 0.02));
  });

  // Approx "km/h" number — purely cosmetic. Base 80 + ramp to 220 plus nitro.
  const baseKmh = 80 + 140 * progress;
  const speedKmh = Math.round(baseKmh * (nitroActive ? NITRO_BOOST_MULT : 1));

  storeRef.getState().updateHud({
    tickets,
    combo,
    comboTimer: comboTimer / COMBO_DECAY_FRAMES,
    nitro,
    nitroActive,
    missionCount,
    missionCleared,
    positionRank: rank,
    raceProgress: playerProgress,
    rivalProgress,
    speedKmh,
  });
}

function updateDecorations(dt) {
  decoTimer += dt;
  if (decoTimer >= DECO_SPAWN_INTERVAL) {
    decoTimer = 0;
    const side = Math.random() < 0.5 ? 'left' : 'right';
    decorations.push(createDecoration(side, -40));
  }
  for (const d of decorations) {
    d.y += speed * dt * 0.5;
  }
  decorations = decorations.filter(d => d.y < BASE_H + 60);
}

function triggerGameOver(obs) {
  gameOver = true;
  obs.active = false;
  shakeFrames = 18;

  const particles = [];
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI * 2 * i) / 16;
    const spd = 1 + Math.random() * 3;
    const colors = [
      { r: 255, g: 100, b: 50 },
      { r: 255, g: 215, b: 0 },
      { r: 255, g: 50, b: 50 },
      { r: 255, g: 150, b: 0 },
    ];
    const c = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      x: player.x, y: player.y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      ...c,
    });
  }
  explosion = {
    x: player.x,
    y: player.y,
    frame: 0,
    particles,
  };

  setTimeout(() => {
    if (storeRef) storeRef.getState().endGame();
  }, 500);
}

function aabb(a, b) {
  const ax = a.x - a.w / 2, ay = a.y - a.h / 2;
  const bx = b.x - b.w / 2, by = b.y - b.h / 2;
  return ax < bx + b.w && ax + a.w > bx && ay < by + b.h && ay + a.h > by;
}

function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

// ─── Render ───

function render(ctx, canvas) {
  const dpr = window.devicePixelRatio || 1;
  const containerW = canvas.clientWidth;
  const containerH = canvas.clientHeight;

  canvas.width = containerW * dpr;
  canvas.height = containerH * dpr;

  const scaleX = containerW / BASE_W;
  const scaleY = containerH / BASE_H;
  const scale = Math.min(scaleX, scaleY);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  let offsetX = (containerW - BASE_W * scale) / 2;
  let offsetY = (containerH - BASE_H * scale) / 2;

  // Screen shake
  if (shakeFrames > 0) {
    const mag = Math.min(shakeFrames, 12) * 0.8;
    offsetX += (Math.random() - 0.5) * mag;
    offsetY += (Math.random() - 0.5) * mag;
  }

  // Letterbox (dark indigo to match night sky)
  ctx.fillStyle = '#0A0628';
  ctx.fillRect(0, 0, containerW, containerH);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // ─── Layer order ───
  // 1. Sky gradient + stars + moon + skyline
  drawSky(ctx, frameCount);

  // 2. Big Ferris wheel in the distance (background)
  drawBackgroundFerrisWheel(ctx, frameCount);

  // 3. Pier side strips
  drawGround(ctx, scrollY);

  // 4. Scrolling side decorations (tents, plushies, neon signs, flags, crowds)
  drawDecorations(ctx, decorations, frameCount);

  // 5. Road / pier deck (wet neon)
  drawRoad(ctx, scrollY, frameCount);

  // 6. Exhaust particles below cars
  drawExhaustParticles(ctx);

  // 7. Collectibles (tickets + stars) — on the road, behind cars
  for (const c of collectibles) {
    if (c.active) drawCollectible(ctx, c, frameCount);
  }

  // 8. Rival cars
  for (const obs of obstacles) {
    if (obs.active) drawCar(ctx, obs, frameCount);
  }

  // 9. Finish line + arch
  if (finishLineY > -9000) {
    const flY = finishLineY;
    // Checkerboard
    const sqSize = 10;
    const cols = Math.ceil(ROAD_WIDTH / sqSize);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < 2; r++) {
        ctx.fillStyle = (c + r) % 2 === 0 ? '#FFFFFF' : '#111111';
        ctx.fillRect(ROAD_LEFT + c * sqSize, flY - sqSize * 2 + r * sqSize, sqSize, sqSize);
      }
    }
    drawFinishArch(ctx, flY);
  }

  // 10. Player
  if (player && (!gameOver || finished)) {
    drawPlayer(ctx, player, frameCount, immuneFrames > 0);
  }

  // 11. Explosion
  drawExplosion(ctx, explosion);

  // 12. Celebration (fireworks, confetti, banner)
  if (celebration) drawCelebration(ctx, celebration, frameCount);

  ctx.restore();
}
