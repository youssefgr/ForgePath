export type EnemyArchetype = 'swarmer' | 'kiter' | 'charger';
export type EnemyState = 'move' | 'windup' | 'attack' | 'recover' | 'ko';

export interface Vec2 {
  x: number;
  y: number;
}

export interface WaveDifficultyConfig {
  wave: number;
  spawnInterval: number;
  enemySpeedScale: number;
  enemiesInWave: number;
  archetypeWeights: {
    swarmer: number;
    kiter: number;
    charger: number;
  };
}

export interface EnemyEntity {
  id: number;
  archetype: EnemyArchetype;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  state: EnemyState;
  stateTimer: number;
  hitFlashTimer: number;
  koTimer: number;
  aimAngle: number;
  chargeDirX: number;
  chargeDirY: number;
  weavePhase: number;
  hasAttackToken: boolean;
}

export const ARENA_PADDING = 36;
export const MAX_ATTACK_TOKENS = 3;

export function clampDt(rawDt: number): number {
  if (!Number.isFinite(rawDt) || rawDt < 0) return 0;
  return Math.min(rawDt, 0.05);
}

export function circleIntersects(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const rSum = ar + br;
  return dx * dx + dy * dy <= rSum * rSum;
}

/**
 * Multi-knob difficulty ramp across waves:
 * 1) spawnInterval decreases
 * 2) enemySpeedScale increases
 * 3) archetype mix introduces Kiters (wave 1+) and Chargers (wave 2+)
 */
export function getWaveDifficulty(wave: number): WaveDifficultyConfig {
  const w = Math.max(1, Math.floor(wave));
  const spawnInterval = Math.max(0.45, 1.45 - (w - 1) * 0.14);
  const enemySpeedScale = Math.min(1.85, 1 + (w - 1) * 0.11);
  const enemiesInWave = 6 + (w - 1) * 4;

  if (w === 1) {
    return {
      wave: w,
      spawnInterval,
      enemySpeedScale,
      enemiesInWave,
      archetypeWeights: { swarmer: 0.72, kiter: 0.28, charger: 0 },
    };
  }
  if (w === 2) {
    return {
      wave: w,
      spawnInterval,
      enemySpeedScale,
      enemiesInWave,
      archetypeWeights: { swarmer: 0.5, kiter: 0.28, charger: 0.22 },
    };
  }
  return {
    wave: w,
    spawnInterval,
    enemySpeedScale,
    enemiesInWave,
    archetypeWeights: { swarmer: 0.4, kiter: 0.3, charger: 0.3 },
  };
}

export function pickArchetype(roll: number, weights: WaveDifficultyConfig['archetypeWeights']): EnemyArchetype {
  const r = Math.min(0.9999, Math.max(0, roll));
  if (r < weights.swarmer) return 'swarmer';
  if (r < weights.swarmer + weights.kiter) return 'kiter';
  return 'charger';
}

export function createEnemy(
  id: number,
  archetype: EnemyArchetype,
  x: number,
  y: number,
  wave: number
): EnemyEntity {
  const hpBonus = Math.floor((Math.max(1, wave) - 1) * 0.5);
  if (archetype === 'swarmer') {
    return {
      id,
      archetype,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 13,
      hp: 2 + hpBonus,
      maxHp: 2 + hpBonus,
      state: 'move',
      stateTimer: 0,
      hitFlashTimer: 0,
      koTimer: 0,
      aimAngle: 0,
      chargeDirX: 0,
      chargeDirY: 0,
      weavePhase: (id * 1.7) % (Math.PI * 2),
      hasAttackToken: false,
    };
  }
  if (archetype === 'kiter') {
    return {
      id,
      archetype,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 15,
      hp: 3 + hpBonus,
      maxHp: 3 + hpBonus,
      state: 'move',
      stateTimer: 0.9,
      hitFlashTimer: 0,
      koTimer: 0,
      aimAngle: 0,
      chargeDirX: 0,
      chargeDirY: 0,
      weavePhase: (id * 2.3) % (Math.PI * 2),
      hasAttackToken: false,
    };
  }
  return {
    id,
    archetype: 'charger',
    x,
    y,
    vx: 0,
    vy: 0,
    radius: 18,
    hp: 4 + hpBonus,
    maxHp: 4 + hpBonus,
    state: 'move',
    stateTimer: 1.1,
    hitFlashTimer: 0,
    koTimer: 0,
    aimAngle: 0,
    chargeDirX: 0,
    chargeDirY: 0,
    weavePhase: 0,
    hasAttackToken: false,
  };
}

export interface EnemyStepEvents {
  spawnEnemyBolt?: { x: number; y: number; vx: number; vy: number };
  telegraphStarted?: boolean;
  chargeLaunched?: boolean;
  releasedToken?: boolean;
  acquiredToken?: boolean;
}

/**
 * Pure per-enemy behavior policy:
 * - Swarmer: sinusoidal flank weave while pursuing player
 * - Kiter: maintains optimal 230-290px standoff orbit, acquires attack token, shows 0.55s sight-line telegraph, then fires bolt
 * - Charger: closes to 280px, acquires attack token, locks vector for 0.5s windup telegraph, then high-speed dash + brief recovery
 */
export function stepEnemyBehavior(
  enemy: EnemyEntity,
  playerX: number,
  playerY: number,
  dt: number,
  speedScale: number,
  availableTokens: number
): EnemyStepEvents {
  const events: EnemyStepEvents = {};

  if (enemy.state === 'ko') {
    enemy.koTimer -= dt;
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    enemy.vx *= Math.pow(0.08, dt);
    enemy.vy *= Math.pow(0.08, dt);
    return events;
  }

  const dx = playerX - enemy.x;
  const dy = playerY - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;

  if (enemy.archetype === 'swarmer') {
    enemy.weavePhase += dt * 4.2;
    const perpX = -ny;
    const perpY = nx;
    const weave = Math.sin(enemy.weavePhase) * 0.45;
    const speed = 132 * speedScale;
    const dirX = nx + perpX * weave;
    const dirY = ny + perpY * weave;
    const len = Math.hypot(dirX, dirY) || 1;
    enemy.vx = (dirX / len) * speed;
    enemy.vy = (dirY / len) * speed;
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    enemy.aimAngle = Math.atan2(enemy.vy, enemy.vx);
    return events;
  }

  if (enemy.archetype === 'kiter') {
    enemy.aimAngle = Math.atan2(dy, dx);
    if (enemy.state === 'move') {
      const speed = 104 * speedScale;
      const orbitDir = enemy.id % 2 === 0 ? 1 : -1;
      let radial = 0;
      if (dist > 290) radial = 0.85;
      else if (dist < 200) radial = -0.9;
      const moveX = nx * radial + -ny * orbitDir * 0.7;
      const moveY = ny * radial + nx * orbitDir * 0.7;
      const len = Math.hypot(moveX, moveY) || 1;
      enemy.vx = (moveX / len) * speed;
      enemy.vy = (moveY / len) * speed;
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      enemy.stateTimer -= dt;
      if (enemy.stateTimer <= 0 && dist <= 460 && availableTokens > 0) {
        enemy.state = 'windup';
        enemy.stateTimer = 0.55;
        enemy.hasAttackToken = true;
        events.acquiredToken = true;
        events.telegraphStarted = true;
      }
    } else if (enemy.state === 'windup') {
      enemy.vx *= Math.pow(0.05, dt);
      enemy.vy *= Math.pow(0.05, dt);
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.stateTimer -= dt;
      if (enemy.stateTimer <= 0) {
        const boltSpeed = 350 * Math.min(1.35, speedScale);
        events.spawnEnemyBolt = {
          x: enemy.x + nx * (enemy.radius + 6),
          y: enemy.y + ny * (enemy.radius + 6),
          vx: nx * boltSpeed,
          vy: ny * boltSpeed,
        };
        enemy.state = 'recover';
        enemy.stateTimer = 0.65;
        if (enemy.hasAttackToken) {
          enemy.hasAttackToken = false;
          events.releasedToken = true;
        }
      }
    } else if (enemy.state === 'recover') {
      enemy.stateTimer -= dt;
      if (enemy.stateTimer <= 0) {
        enemy.state = 'move';
        enemy.stateTimer = 1.25;
      }
    }
    return events;
  }

  // Charger archetype
  if (enemy.state === 'move') {
    enemy.aimAngle = Math.atan2(dy, dx);
    const speed = 94 * speedScale;
    enemy.vx = nx * speed;
    enemy.vy = ny * speed;
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;

    enemy.stateTimer -= dt;
    if (enemy.stateTimer <= 0 && dist <= 310 && availableTokens > 0) {
      enemy.state = 'windup';
      enemy.stateTimer = 0.52;
      enemy.chargeDirX = nx;
      enemy.chargeDirY = ny;
      enemy.aimAngle = Math.atan2(ny, nx);
      enemy.hasAttackToken = true;
      events.acquiredToken = true;
      events.telegraphStarted = true;
    }
  } else if (enemy.state === 'windup') {
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.stateTimer -= dt;
    if (enemy.stateTimer <= 0) {
      enemy.state = 'attack';
      enemy.stateTimer = 0.42;
      const chargeSpeed = 440 * Math.min(1.4, speedScale);
      enemy.vx = enemy.chargeDirX * chargeSpeed;
      enemy.vy = enemy.chargeDirY * chargeSpeed;
      events.chargeLaunched = true;
    }
  } else if (enemy.state === 'attack') {
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    enemy.stateTimer -= dt;
    if (enemy.stateTimer <= 0) {
      enemy.state = 'recover';
      enemy.stateTimer = 0.72;
      enemy.vx *= 0.2;
      enemy.vy *= 0.2;
      if (enemy.hasAttackToken) {
        enemy.hasAttackToken = false;
        events.releasedToken = true;
      }
    }
  } else if (enemy.state === 'recover') {
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    enemy.vx *= Math.pow(0.05, dt);
    enemy.vy *= Math.pow(0.05, dt);
    enemy.stateTimer -= dt;
    if (enemy.stateTimer <= 0) {
      enemy.state = 'move';
      enemy.stateTimer = 1.05;
    }
  }

  return events;
}

export function scoreForKill(archetype: EnemyArchetype, combo: number): number {
  const base = archetype === 'charger' ? 180 : archetype === 'kiter' ? 140 : 100;
  const multiplier = Math.min(5, 1 + Math.floor(Math.max(0, combo) / 3) * 0.5);
  return Math.round(base * multiplier);
}
