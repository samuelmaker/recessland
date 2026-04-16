import {
  BASE_W, BASE_H,
  LANE_COUNT, LANE_WIDTH, ROAD_LEFT,
  INITIAL_SPEED, MAX_SPEED, SPEED_RAMP_SECONDS,
  OBSTACLE_SPAWN_INTERVAL_START, OBSTACLE_SPAWN_INTERVAL_MIN,
  LANE_SWITCH_FRAMES,
  LANE_CHANGE_CHANCE, LANE_CHANGE_FRAMES, LANE_CHANGE_MIN_DIST_FROM_PLAYER,
  PLAYER_Y,
  DECO_SPAWN_INTERVAL,
  FINISH_TIME,
} from './constants.js';
import { consumeInput } from './input.js';
import {
  createPlayer, createObstacle, createDecoration, laneX,
} from './entities.js';
import {
  drawSky, drawGround, drawRoad, drawDecorations,
  drawPlayer, drawCar, drawExplosion,
} from './renderer.js';

// ─── Game state ───

let player = null;
let obstacles = [];
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

let storeRef = null;
let rafId = null;
let lastTime = 0;

// ─── Public API ───

export function initEngine(store) {
  storeRef = store;
}

export function startGame() {
  player = createPlayer();
  obstacles = [];
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
}

export function startAttractMode() {
  player = null;
  obstacles = [];
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
  scrollY += speed * dt;

  if (attractMode) {
    updateDecorations(dt);
    return;
  }

  elapsed += dt / 60;

  // Speed ramp
  const progress = Math.min(elapsed / SPEED_RAMP_SECONDS, 1);
  speed = INITIAL_SPEED + (MAX_SPEED - INITIAL_SPEED) * progress;

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
      setTimeout(() => {
        if (storeRef) storeRef.getState().finishGame();
      }, 500);
    }
  }

  // Immunity countdown
  if (immuneFrames > 0) immuneFrames -= dt;

  // Input → player lane switch
  if (player) {
    const input = consumeInput();
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
    spawnObstacle(progress);
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

  // Collision
  if (player && immuneFrames <= 0 && !gameOver) {
    for (const obs of obstacles) {
      if (!obs.active) continue;
      if (aabb(player, obs)) {
        triggerGameOver(obs);
        break;
      }
    }
  }

  // Explosion animation
  if (explosion) {
    explosion.frame += dt;
    if (explosion.frame > 30) explosion = null;
  }

  // Decorations
  updateDecorations(dt);
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

function spawnObstacle(progress) {
  const lane = Math.floor(Math.random() * LANE_COUNT);

  // Harder type pool — trucks/vans dominate earlier
  let typePool;
  if (progress < 0.2) {
    typePool = ['sedan', 'sedan', 'sports', 'sedan'];
  } else if (progress < 0.4) {
    typePool = ['sedan', 'truck', 'sports', 'van'];
  } else {
    typePool = ['truck', 'truck', 'van', 'van'];
  }
  const type = typePool[Math.floor(Math.random() * typePool.length)];
  obstacles.push(createObstacle(type, lane, -80));

  // Sometimes spawn a second car (earlier and more often)
  if (progress > 0.2 && Math.random() < 0.55) {
    let lane2 = (lane + (Math.random() < 0.5 ? 1 : 2)) % LANE_COUNT;
    const type2 = typePool[Math.floor(Math.random() * typePool.length)];
    obstacles.push(createObstacle(type2, lane2, -80));

    // Sometimes spawn a third car (all lanes blocked)
    if (progress > 0.5 && Math.random() < 0.25) {
      const usedLanes = new Set([lane, lane2]);
      for (let l = 0; l < LANE_COUNT; l++) {
        if (!usedLanes.has(l)) {
          const type3 = typePool[Math.floor(Math.random() * typePool.length)];
          obstacles.push(createObstacle(type3, l, -80));
          break;
        }
      }
    }
  }
}

function triggerGameOver(obs) {
  gameOver = true;
  obs.active = false;

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

  const offsetX = (containerW - BASE_W * scale) / 2;
  const offsetY = (containerH - BASE_H * scale) / 2;

  // Letterbox
  ctx.fillStyle = '#0d0d30';
  ctx.fillRect(0, 0, containerW, containerH);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Draw layers
  drawSky(ctx, frameCount);
  drawGround(ctx, scrollY);
  drawDecorations(ctx, decorations, frameCount);
  drawRoad(ctx, scrollY);

  // Obstacles (cars)
  for (const obs of obstacles) {
    if (obs.active) drawCar(ctx, obs, false);
  }

  // Finish line
  if (finishLineY > -9000) {
    const flY = finishLineY;
    // Checkerboard pattern
    const sqSize = 10;
    const cols = Math.ceil(ROAD_WIDTH / sqSize);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < 2; r++) {
        ctx.fillStyle = (c + r) % 2 === 0 ? '#FFFFFF' : '#111111';
        ctx.fillRect(ROAD_LEFT + c * sqSize, flY - sqSize * 2 + r * sqSize, sqSize, sqSize);
      }
    }
    // "FINISH" text
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF8800';
    ctx.shadowBlur = 10;
    ctx.fillText('FINISH', BASE_W / 2, flY - sqSize * 2 - 8);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // Player
  if (player && (!gameOver || finished)) {
    drawPlayer(ctx, player, frameCount, immuneFrames > 0);
  }

  // Explosion
  drawExplosion(ctx, explosion);

  ctx.restore();
}
