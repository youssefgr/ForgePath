import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Trophy } from 'lucide-react';
import {
  ARENA_PADDING,
  circleIntersects,
  clampDt,
  createEnemy,
  getWaveDifficulty,
  MAX_ATTACK_TOKENS,
  pickArchetype,
  scoreForKill,
  stepEnemyBehavior,
  type EnemyEntity,
} from '../game/engineLogic';
import { soundSynth } from '../game/soundSynth';
import type { GameScoreItem } from '../utils/portfolioLogic';

type GamePhase = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

interface Projectile {
  active: boolean;
  fromPlayer: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

interface HudSnapshot {
  score: number;
  bestScore: number;
  wave: number;
  maxWaves: number;
  hp: number;
  maxHp: number;
  combo: number;
  enemiesDefeated: number;
  dashReadyRatio: number;
}

interface ShardBreakerGameProps {
  isOpen: boolean;
  autostart: boolean;
  onOpen: () => void;
  onClose: () => void;
  gameScores: GameScoreItem[];
  onRecordScore: (payload: { score: number; waveReached: number; enemiesDefeated: number }) => Promise<void>;
  customTrackUrl: string | null;
}

const MAX_WAVES = 5;
const MAX_HP = 5;
const PARTICLE_POOL_SIZE = 180;
const PROJECTILE_POOL_SIZE = 120;

export const ShardBreakerGame: React.FC<ShardBreakerGameProps> = ({
  isOpen,
  autostart,
  onOpen,
  onClose,
  gameScores,
  onRecordScore,
  customTrackUrl,
}) => {
  const [phase, setPhase] = useState<GamePhase>(autostart ? 'playing' : 'title');
  const [muted, setMuted] = useState(false);
  const [cardImgFailed, setCardImgFailed] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>(() => ({
    score: 0,
    bestScore: gameScores[0]?.score ?? 4250,
    wave: 1,
    maxWaves: MAX_WAVES,
    hp: MAX_HP,
    maxHp: MAX_HP,
    combo: 0,
    enemiesDefeated: 0,
    dashReadyRatio: 1,
  }));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const phaseRef = useRef<GamePhase>(phase);
  const startLoopRef = useRef<(() => void) | null>(null);
  const onRecordScoreRef = useRef(onRecordScore);
  const bestScoreRef = useRef(gameScores[0]?.score ?? 4250);

  onRecordScoreRef.current = onRecordScore;
  bestScoreRef.current = Math.max(bestScoreRef.current, gameScores[0]?.score ?? 0);

  const simRef = useRef({
    width: 1280,
    height: 720,
    playerX: 640,
    playerY: 360,
    playerVx: 0,
    playerVy: 0,
    playerAngle: 0,
    playerScaleX: 1,
    playerScaleY: 1,
    hp: MAX_HP,
    invulnTimer: 0,
    hitFlashTimer: 0,
    fireCooldown: 0,
    dashCooldown: 0,
    dashActiveTimer: 0,
    dashBufferTimer: 0,
    dashDirX: 1,
    dashDirY: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    wave: 1,
    waveRemainingToSpawn: 6,
    spawnTimer: 1.1,
    enemiesDefeated: 0,
    nextEnemyId: 1,
    hitstopTimer: 0,
    trauma: 0,
    pendingDefeatTimer: 0,
    enemies: [] as EnemyEntity[],
    projectiles: Array.from({ length: PROJECTILE_POOL_SIZE }, (): Projectile => ({
      active: false,
      fromPlayer: true,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 4,
      life: 0,
    })),
    projCursor: 0,
    particles: Array.from({ length: PARTICLE_POOL_SIZE }, (): Particle => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 2,
      life: 0,
      maxLife: 0.3,
      color: '#F59E0B',
    })),
    partCursor: 0,
    keysHeld: new Set<string>(),
    mouseDown: false,
    mouseX: 780,
    mouseY: 360,
  });

  const syncBodyState = useCallback((next: GamePhase, open: boolean) => {
    if (!open) {
      delete document.body.dataset.state;
      return;
    }
    document.body.dataset.state = next === 'victory' ? 'gameover' : next;
  }, []);

  const resetRun = useCallback(() => {
    const s = simRef.current;
    const cfg = getWaveDifficulty(1);
    s.playerX = s.width * 0.5;
    s.playerY = s.height * 0.5;
    s.playerVx = 0;
    s.playerVy = 0;
    s.playerScaleX = 1;
    s.playerScaleY = 1;
    s.hp = MAX_HP;
    s.invulnTimer = 1.0;
    s.hitFlashTimer = 0;
    s.fireCooldown = 0;
    s.dashCooldown = 0;
    s.dashActiveTimer = 0;
    s.dashBufferTimer = 0;
    s.score = 0;
    s.combo = 0;
    s.comboTimer = 0;
    s.wave = 1;
    s.waveRemainingToSpawn = cfg.enemiesInWave;
    s.spawnTimer = 1.25; // Safe opening moment so simulation survives first seconds cleanly
    s.enemiesDefeated = 0;
    s.nextEnemyId = 1;
    s.hitstopTimer = 0;
    s.trauma = 0;
    s.pendingDefeatTimer = 0;
    s.enemies = [];
    s.keysHeld.clear();
    s.mouseDown = false;
    for (const p of s.projectiles) p.active = false;
    for (const pt of s.particles) pt.active = false;

    setHud({
      score: 0,
      bestScore: bestScoreRef.current,
      wave: 1,
      maxWaves: MAX_WAVES,
      hp: MAX_HP,
      maxHp: MAX_HP,
      combo: 0,
      enemiesDefeated: 0,
      dashReadyRatio: 1,
    });
  }, []);

  const startGame = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    resetRun();
    phaseRef.current = 'playing';
    setPhase('playing');
    syncBodyState('playing', true);
    startLoopRef.current?.();
    if (bgAudioRef.current && customTrackUrl && !muted) {
      bgAudioRef.current.play().catch(() => {});
    }
  }, [resetRun, syncBodyState, customTrackUrl, muted]);

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') {
      phaseRef.current = 'paused';
      setPhase('paused');
      syncBodyState('paused', true);
      simRef.current.keysHeld.clear();
      simRef.current.mouseDown = false;
      bgAudioRef.current?.pause();
    } else if (phaseRef.current === 'paused') {
      phaseRef.current = 'playing';
      setPhase('playing');
      syncBodyState('playing', true);
      startLoopRef.current?.();
      if (bgAudioRef.current && customTrackUrl && !muted) {
        bgAudioRef.current.play().catch(() => {});
      }
    }
  }, [syncBodyState, customTrackUrl, muted]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundSynth.setMuted(next);
      if (bgAudioRef.current) {
        if (next) bgAudioRef.current.pause();
        else if (phaseRef.current === 'playing' && customTrackUrl) {
          bgAudioRef.current.play().catch(() => {});
        }
      }
      return next;
    });
  }, [customTrackUrl]);

  // Sync phase when opening/closing the full-viewport Game Shell
  useEffect(() => {
    if (!isOpen) {
      delete document.body.dataset.state;
      bgAudioRef.current?.pause();
      return;
    }
    if (autostart) {
      startGame();
    } else {
      phaseRef.current = 'title';
      setPhase('title');
      syncBodyState('title', true);
    }
    return () => {
      delete document.body.dataset.state;
    };
  }, [isOpen, autostart, startGame, syncBodyState]);

  // Isolated 60fps Canvas simulation loop mounted only while Game Shell is open
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = simRef.current;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(320, Math.round(rect.width));
      const h = Math.max(240, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.width = w;
      s.height = h;
      s.playerX = Math.min(w - ARENA_PADDING, Math.max(ARENA_PADDING, s.playerX));
      s.playerY = Math.min(h - ARENA_PADDING, Math.max(ARENA_PADDING, s.playerY));
    };

    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas);

    const spawnBurst = (x: number, y: number, count: number, color: string, speed = 190) => {
      for (let i = 0; i < count; i++) {
        const pt = s.particles[s.partCursor];
        s.partCursor = (s.partCursor + 1) % PARTICLE_POOL_SIZE;
        const ang = Math.random() * Math.PI * 2;
        const spd = speed * (0.35 + Math.random() * 0.85);
        pt.active = true;
        pt.x = x;
        pt.y = y;
        pt.vx = Math.cos(ang) * spd;
        pt.vy = Math.sin(ang) * spd;
        pt.size = 2 + Math.random() * 3.5;
        pt.maxLife = 0.22 + Math.random() * 0.26;
        pt.life = pt.maxLife;
        pt.color = color;
      }
    };

    const spawnProjectile = (
      fromPlayer: boolean,
      x: number,
      y: number,
      vx: number,
      vy: number,
      radius: number
    ) => {
      const p = s.projectiles[s.projCursor];
      s.projCursor = (s.projCursor + 1) % PROJECTILE_POOL_SIZE;
      p.active = true;
      p.fromPlayer = fromPlayer;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.radius = radius;
      p.life = fromPlayer ? 1.15 : 2.1;
    };

    const pushHud = () => {
      const best = Math.max(bestScoreRef.current, s.score);
      bestScoreRef.current = best;
      setHud({
        score: Math.round(s.score),
        bestScore: Math.round(best),
        wave: s.wave,
        maxWaves: MAX_WAVES,
        hp: s.hp,
        maxHp: MAX_HP,
        combo: s.combo,
        enemiesDefeated: s.enemiesDefeated,
        dashReadyRatio: Math.max(0, Math.min(1, 1 - s.dashCooldown / 1.1)),
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (phaseRef.current === 'title' && (code === 'Enter' || code === 'Space')) {
        e.preventDefault();
        startGame();
        return;
      }
      if (code === 'Escape' || code === 'KeyP') {
        if (phaseRef.current === 'playing' || phaseRef.current === 'paused') {
          e.preventDefault();
          togglePause();
        }
        return;
      }
      if (code === 'KeyM') {
        toggleMute();
        return;
      }
      if (code === 'KeyR' && (phaseRef.current === 'playing' || phaseRef.current === 'paused' || phaseRef.current === 'gameover' || phaseRef.current === 'victory')) {
        e.preventDefault();
        startGame();
        return;
      }
      if (phaseRef.current !== 'playing') return;
      if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'Space') {
        e.preventDefault();
        if (!s.keysHeld.has(code)) {
          s.dashBufferTimer = 0.13; // 130ms input buffer
        }
      }
      s.keysHeld.add(code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      s.keysHeld.delete(e.code);
    };

    const clearInputs = () => {
      s.keysHeld.clear();
      s.mouseDown = false;
    };

    const screenToWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      s.mouseX = clientX - rect.left;
      s.mouseY = clientY - rect.top;
    };

    const onPointerMove = (e: PointerEvent) => screenToWorld(e.clientX, e.clientY);
    const onPointerDown = (e: PointerEvent) => {
      if (phaseRef.current !== 'playing') return;
      screenToWorld(e.clientX, e.clientY);
      s.mouseDown = true;
    };
    const onPointerUp = () => {
      s.mouseDown = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', clearInputs);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    let rafId = 0;
    let loopRunning = false;
    let lastTs = performance.now();
    let hudTick = 0;

    const finishRun = (won: boolean) => {
      const nextPhase: GamePhase = won ? 'victory' : 'gameover';
      phaseRef.current = nextPhase;
      setPhase(nextPhase);
      syncBodyState(nextPhase, true);
      pushHud();
      if (won) soundSynth.playWaveClear();
      else soundSynth.playPlayerHurt();
      if (s.score > 0) {
        onRecordScoreRef.current({
          score: Math.round(s.score),
          waveReached: s.wave,
          enemiesDefeated: s.enemiesDefeated,
        });
      }
    };

    const frame = (now: number) => {
      const dt = clampDt((now - lastTs) / 1000);
      lastTs = now;

      // Always decay visual trauma & hit flash in real dt
      s.trauma = Math.max(0, s.trauma - dt * 1.9);
      s.hitFlashTimer = Math.max(0, s.hitFlashTimer - dt);

      // Update particles even during hitstop for crisp impact feel
      for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const pt = s.particles[i];
        if (!pt.active) continue;
        pt.life -= dt;
        if (pt.life <= 0) {
          pt.active = false;
          continue;
        }
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= Math.pow(0.08, dt);
        pt.vy *= Math.pow(0.08, dt);
      }

      if (phaseRef.current === 'playing') {
        if (s.pendingDefeatTimer > 0) {
          s.pendingDefeatTimer -= dt;
          if (s.pendingDefeatTimer <= 0) {
            finishRun(false);
          }
        } else if (s.hitstopTimer > 0) {
          s.hitstopTimer = Math.max(0, s.hitstopTimer - dt);
        } else {
          // 1. Movement & Dash Buffering
          let ix = 0;
          let iy = 0;
          if (s.keysHeld.has('KeyW') || s.keysHeld.has('ArrowUp')) iy -= 1;
          if (s.keysHeld.has('KeyS') || s.keysHeld.has('ArrowDown')) iy += 1;
          if (s.keysHeld.has('KeyA') || s.keysHeld.has('ArrowLeft')) ix -= 1;
          if (s.keysHeld.has('KeyD') || s.keysHeld.has('ArrowRight')) ix += 1;

          const inputLen = Math.hypot(ix, iy);
          if (inputLen > 0) {
            ix /= inputLen;
            iy /= inputLen;
          }

          s.dashCooldown = Math.max(0, s.dashCooldown - dt);
          s.dashBufferTimer = Math.max(0, s.dashBufferTimer - dt);
          s.invulnTimer = Math.max(0, s.invulnTimer - dt);
          s.fireCooldown = Math.max(0, s.fireCooldown - dt);

          if (s.comboTimer > 0) {
            s.comboTimer -= dt;
            if (s.comboTimer <= 0) {
              s.combo = 0;
            }
          }

          if (s.dashBufferTimer > 0 && s.dashCooldown <= 0 && s.dashActiveTimer <= 0) {
            s.dashBufferTimer = 0;
            s.dashCooldown = 1.1;
            s.dashActiveTimer = 0.16;
            s.invulnTimer = Math.max(s.invulnTimer, 0.24);
            s.dashDirX = inputLen > 0 ? ix : Math.cos(s.playerAngle);
            s.dashDirY = inputLen > 0 ? iy : Math.sin(s.playerAngle);
            s.playerScaleX = 1.32;
            s.playerScaleY = 0.72;
            soundSynth.playDash();
            spawnBurst(s.playerX, s.playerY, 10, '#F59E0B', 150);
          }

          if (s.dashActiveTimer > 0) {
            s.dashActiveTimer -= dt;
            s.playerVx = s.dashDirX * 680;
            s.playerVy = s.dashDirY * 680;
          } else {
            const targetVx = ix * 275;
            const targetVy = iy * 275;
            const accel = 1 - Math.pow(0.001, dt);
            s.playerVx += (targetVx - s.playerVx) * accel;
            s.playerVy += (targetVy - s.playerVy) * accel;
          }

          s.playerX = Math.min(
            s.width - ARENA_PADDING,
            Math.max(ARENA_PADDING, s.playerX + s.playerVx * dt)
          );
          s.playerY = Math.min(
            s.height - ARENA_PADDING,
            Math.max(ARENA_PADDING, s.playerY + s.playerVy * dt)
          );
          s.playerAngle = Math.atan2(s.mouseY - s.playerY, s.mouseX - s.playerX);

          // Exponentially damp squash-and-stretch back to 1
          const stretchDamp = 1 - Math.pow(0.0005, dt);
          s.playerScaleX += (1 - s.playerScaleX) * stretchDamp;
          s.playerScaleY += (1 - s.playerScaleY) * stretchDamp;

          // 2. Player Fire (mouse hold or Space/J auto-assist fallback)
          const wantsFire = s.mouseDown || s.keysHeld.has('KeyJ');
          if (wantsFire && s.fireCooldown <= 0) {
            s.fireCooldown = 0.145;
            const cos = Math.cos(s.playerAngle);
            const sin = Math.sin(s.playerAngle);
            spawnProjectile(
              true,
              s.playerX + cos * 18,
              s.playerY + sin * 18,
              cos * 640,
              sin * 640,
              4.5
            );
            s.playerScaleX = 0.88;
            s.playerScaleY = 1.12;
            soundSynth.playShot();
            spawnBurst(s.playerX + cos * 16, s.playerY + sin * 16, 4, '#FCD34D', 90);
          }

          // 3. Wave Spawner
          const waveCfg = getWaveDifficulty(s.wave);
          if (s.waveRemainingToSpawn > 0) {
            s.spawnTimer -= dt;
            if (s.spawnTimer <= 0) {
              s.spawnTimer = waveCfg.spawnInterval;
              s.waveRemainingToSpawn -= 1;
              const edge = Math.floor(Math.random() * 4);
              let sx = ARENA_PADDING;
              let sy = ARENA_PADDING;
              if (edge === 0) {
                sx = ARENA_PADDING + Math.random() * (s.width - ARENA_PADDING * 2);
                sy = ARENA_PADDING;
              } else if (edge === 1) {
                sx = s.width - ARENA_PADDING;
                sy = ARENA_PADDING + Math.random() * (s.height - ARENA_PADDING * 2);
              } else if (edge === 2) {
                sx = ARENA_PADDING + Math.random() * (s.width - ARENA_PADDING * 2);
                sy = s.height - ARENA_PADDING;
              } else {
                sx = ARENA_PADDING;
                sy = ARENA_PADDING + Math.random() * (s.height - ARENA_PADDING * 2);
              }
              const archetype = pickArchetype(Math.random(), waveCfg.archetypeWeights);
              s.enemies.push(createEnemy(s.nextEnemyId++, archetype, sx, sy, s.wave));
            }
          }

          // 4. Enemy AI & Attack Token Pool
          let activeTokens = 0;
          for (const e of s.enemies) {
            if (e.hasAttackToken) activeTokens++;
          }

          for (let i = s.enemies.length - 1; i >= 0; i--) {
            const enemy = s.enemies[i];
            enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
            const events = stepEnemyBehavior(
              enemy,
              s.playerX,
              s.playerY,
              dt,
              waveCfg.enemySpeedScale,
              Math.max(0, MAX_ATTACK_TOKENS - activeTokens)
            );
            if (events.acquiredToken) activeTokens++;
            if (events.releasedToken) activeTokens = Math.max(0, activeTokens - 1);
            if (events.telegraphStarted) soundSynth.playTelegraph();
            if (events.spawnEnemyBolt) {
              const b = events.spawnEnemyBolt;
              spawnProjectile(false, b.x, b.y, b.vx, b.vy, 5.5);
            }

            // Clamp live enemies inside arena
            enemy.x = Math.min(s.width - 18, Math.max(18, enemy.x));
            enemy.y = Math.min(s.height - 18, Math.max(18, enemy.y));

            if (enemy.state === 'ko' && enemy.koTimer <= 0) {
              s.enemies.splice(i, 1);
              continue;
            }

            // Contact damage check
            if (
              enemy.state !== 'ko' &&
              s.invulnTimer <= 0 &&
              circleIntersects(s.playerX, s.playerY, 13, enemy.x, enemy.y, enemy.radius)
            ) {
              s.hp = Math.max(0, s.hp - 1);
              s.invulnTimer = 0.85;
              s.hitFlashTimer = 0.14;
              s.trauma = Math.min(1, s.trauma + 0.58);
              s.hitstopTimer = 0.055;
              s.combo = 0;
              soundSynth.playPlayerHurt();
              spawnBurst(s.playerX, s.playerY, 18, '#F43F5E', 240);
              pushHud();
              if (s.hp <= 0) {
                s.pendingDefeatTimer = 0.45;
              }
            }
          }

          // 5. Projectiles & Collisions
          for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) {
            const p = s.projectiles[i];
            if (!p.active) continue;
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (
              p.life <= 0 ||
              p.x < 0 ||
              p.x > s.width ||
              p.y < 0 ||
              p.y > s.height
            ) {
              p.active = false;
              continue;
            }

            if (p.fromPlayer) {
              for (const enemy of s.enemies) {
                if (enemy.state === 'ko') continue;
                if (circleIntersects(p.x, p.y, p.radius, enemy.x, enemy.y, enemy.radius + 2)) {
                  p.active = false;
                  enemy.hp -= 1;
                  enemy.hitFlashTimer = 0.06;
                  const len = Math.hypot(p.vx, p.vy) || 1;
                  enemy.x += (p.vx / len) * 6;
                  enemy.y += (p.vy / len) * 6;

                  if (enemy.hp <= 0) {
                    enemy.state = 'ko';
                    enemy.koTimer = 0.32;
                    enemy.vx = (p.vx / len) * 190;
                    enemy.vy = (p.vy / len) * 190;
                    enemy.hasAttackToken = false;
                    s.combo += 1;
                    s.comboTimer = 3.2;
                    s.enemiesDefeated += 1;
                    s.score += scoreForKill(enemy.archetype, s.combo);
                    s.hitstopTimer = 0.045;
                    s.trauma = Math.min(1, s.trauma + 0.34);
                    soundSynth.playKill();
                    spawnBurst(
                      enemy.x,
                      enemy.y,
                      18,
                      enemy.archetype === 'charger' ? '#FB7185' : '#F59E0B',
                      240
                    );
                    pushHud();
                  } else {
                    soundSynth.playHit();
                    spawnBurst(p.x, p.y, 6, '#FDE68A', 140);
                  }
                  break;
                }
              }
            } else if (
              s.invulnTimer <= 0 &&
              circleIntersects(p.x, p.y, p.radius, s.playerX, s.playerY, 13)
            ) {
              p.active = false;
              s.hp = Math.max(0, s.hp - 1);
              s.invulnTimer = 0.85;
              s.hitFlashTimer = 0.14;
              s.trauma = Math.min(1, s.trauma + 0.55);
              s.hitstopTimer = 0.05;
              s.combo = 0;
              soundSynth.playPlayerHurt();
              spawnBurst(s.playerX, s.playerY, 16, '#F43F5E', 220);
              pushHud();
              if (s.hp <= 0) {
                s.pendingDefeatTimer = 0.45;
              }
            }
          }

          // 6. Wave Clear Check
          const livingEnemies = s.enemies.filter((e) => e.state !== 'ko').length;
          if (s.waveRemainingToSpawn === 0 && livingEnemies === 0 && s.pendingDefeatTimer <= 0) {
            if (s.wave >= MAX_WAVES) {
              finishRun(true);
            } else {
              s.wave += 1;
              const nextCfg = getWaveDifficulty(s.wave);
              s.waveRemainingToSpawn = nextCfg.enemiesInWave;
              s.spawnTimer = 1.1;
              s.score += 350;
              soundSynth.playWaveClear();
              pushHud();
            }
          }

          hudTick += dt;
          if (hudTick >= 0.12) {
            hudTick = 0;
            pushHud();
          }
        }
      }

      // === RENDER ARENA ===
      ctx.save();
      ctx.fillStyle = '#08090C';
      ctx.fillRect(0, 0, s.width, s.height);

      // Camera trauma shake
      const shakeMag = s.trauma * s.trauma * 14;
      if (shakeMag > 0.2) {
        ctx.translate(
          (Math.random() * 2 - 1) * shakeMag,
          (Math.random() * 2 - 1) * shakeMag
        );
      }

      // Subtle obsidian architectural grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;
      const gridStep = 56;
      ctx.beginPath();
      for (let gx = 0; gx < s.width; gx += gridStep) {
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, s.height);
      }
      for (let gy = 0; gy < s.height; gy += gridStep) {
        ctx.moveTo(0, gy);
        ctx.lineTo(s.width, gy);
      }
      ctx.stroke();

      // Arena perimeter conduit frame
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        ARENA_PADDING - 14,
        ARENA_PADDING - 14,
        s.width - (ARENA_PADDING - 14) * 2,
        s.height - (ARENA_PADDING - 14) * 2
      );

      // Render enemy attack telegraphs FIRST (below entities)
      for (const enemy of s.enemies) {
        if (enemy.state === 'windup') {
          if (enemy.archetype === 'kiter') {
            ctx.save();
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.72)';
            ctx.setLineDash([7, 5]);
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.lineTo(
              enemy.x + Math.cos(enemy.aimAngle) * 420,
              enemy.y + Math.sin(enemy.aimAngle) * 420
            );
            ctx.stroke();
            ctx.restore();
          } else if (enemy.archetype === 'charger') {
            ctx.save();
            ctx.strokeStyle = 'rgba(251, 146, 60, 0.8)';
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.globalAlpha = 0.24;
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.lineTo(
              enemy.x + enemy.chargeDirX * 260,
              enemy.y + enemy.chargeDirY * 260
            );
            ctx.stroke();
            ctx.globalAlpha = 0.85;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // Render Particles
      for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const pt = s.particles[i];
        if (!pt.active) continue;
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - pt.size * 0.5, pt.y - pt.size * 0.5, pt.size, pt.size);
      }
      ctx.globalAlpha = 1;

      // Render Enemies (distinct silhouettes per archetype + KO dissolve)
      for (const enemy of s.enemies) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(enemy.aimAngle);
        if (enemy.state === 'ko') {
          const alpha = Math.max(0, enemy.koTimer / 0.32);
          ctx.globalAlpha = alpha;
          ctx.scale(1 + (1 - alpha) * 0.5, 1 + (1 - alpha) * 0.5);
        }

        const isFlashing = enemy.hitFlashTimer > 0;

        if (enemy.archetype === 'swarmer') {
          ctx.fillStyle = isFlashing ? '#FFFFFF' : '#E11D48';
          ctx.strokeStyle = '#FDA4AF';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(enemy.radius, 0);
          ctx.lineTo(-enemy.radius * 0.8, -enemy.radius * 0.78);
          ctx.lineTo(-enemy.radius * 0.4, 0);
          ctx.lineTo(-enemy.radius * 0.8, enemy.radius * 0.78);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (enemy.archetype === 'kiter') {
          ctx.fillStyle = isFlashing ? '#FFFFFF' : '#0284C7';
          ctx.strokeStyle = enemy.state === 'windup' ? '#F43F5E' : '#7DD3FC';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let side = 0; side < 6; side++) {
            const a = (side / 6) * Math.PI * 2;
            const px = Math.cos(a) * enemy.radius;
            const py = Math.sin(a) * enemy.radius;
            if (side === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Charger: heavy armored diamond wedge
          ctx.fillStyle = isFlashing ? '#FFFFFF' : enemy.state === 'windup' ? '#F97316' : '#B91C1C';
          ctx.strokeStyle = '#FDBA74';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(enemy.radius * 1.15, 0);
          ctx.lineTo(0, -enemy.radius * 0.9);
          ctx.lineTo(-enemy.radius, -enemy.radius * 0.5);
          ctx.lineTo(-enemy.radius, enemy.radius * 0.5);
          ctx.lineTo(0, enemy.radius * 0.9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      // Render Projectiles
      for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) {
        const p = s.projectiles[i];
        if (!p.active) continue;
        ctx.fillStyle = p.fromPlayer ? '#FBBF24' : '#FB7185';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render Player Interceptor Craft
      ctx.save();
      ctx.translate(s.playerX, s.playerY);
      ctx.rotate(s.playerAngle);
      ctx.scale(s.playerScaleX, s.playerScaleY);
      if (s.invulnTimer > 0 && Math.floor(s.invulnTimer * 18) % 2 === 0) {
        ctx.globalAlpha = 0.55;
      }
      ctx.fillStyle = s.hitFlashTimer > 0 ? '#FFFFFF' : '#F4F4F6';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(19, 0);
      ctx.lineTo(-13, -12);
      ctx.lineTo(-7, 0);
      ctx.lineTo(-13, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Core thruster highlight
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(-6, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Low HP subtle crimson edge vignette
      if (s.hp <= 2 && phaseRef.current === 'playing') {
        const grad = ctx.createRadialGradient(
          s.width * 0.5,
          s.height * 0.5,
          Math.min(s.width, s.height) * 0.3,
          s.width * 0.5,
          s.height * 0.5,
          Math.max(s.width, s.height) * 0.65
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(225, 29, 72, 0.25)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, s.width, s.height);
      }

      ctx.restore();
      if (phaseRef.current === 'playing') {
        rafId = requestAnimationFrame(frame);
      } else {
        loopRunning = false;
        rafId = 0;
      }
    };

    const startLoop = () => {
      if (loopRunning) return;
      loopRunning = true;
      lastTs = performance.now();
      rafId = requestAnimationFrame(frame);
    };
    startLoopRef.current = startLoop;

    if (phaseRef.current === 'playing') {
      startLoop();
    }

    return () => {
      startLoopRef.current = null;
      loopRunning = false;
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', clearInputs);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isOpen, startGame, togglePause, toggleMute, syncBodyState]);

  return (
    <>
      {/* Portfolio Section Card (#arcade) */}
      <section id="arcade" className="border-t border-white/[0.08] py-20 lg:py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-amber-400">04. Playable C# Architecture Showcase</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#F4F4F6] sm:text-4xl">
              Shard Breaker — Tactical Arena Build
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              A live browser port of my C# Unity ECS gameplay architecture: fixed-step delta clamping, zero-GC pooled particles, 45ms impact hitstop, dash input buffering, and three distinct enemy behavior policies with windup telegraphs.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12141A] lg:col-span-8">
              {!cardImgFailed ? (
                <img
                  src="/src/assets/images/game_title_bg_1795379820835.jpg"
                  alt="Shard Breaker tactical arena key art depicting an interceptor craft over a hexagonal monolith canyon"
                  referrerPolicy="no-referrer"
                  onError={() => setCardImgFailed(true)}
                  className="h-full min-h-[300px] w-full object-cover"
                />
              ) : (
                <div className="flex min-h-[300px] items-center justify-center bg-[#0F1117] text-zinc-400">
                  Shard Breaker Arena Key Art
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#08090C]/95 via-[#08090C]/55 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-between p-7 sm:p-9">
                <div>
                  <p className="font-mono text-xs text-amber-400">60 FPS Canvas ECS Port</p>
                  <h3 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">
                    SHARD BREAKER
                  </h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-300">
                    Clear 5 escalating waves of Swarmers, Ranged Kiters, and Armored Chargers. Every run awards engineering XP toward your dashboard rank.
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    data-open-game="true"
                    onClick={onOpen}
                    className="inline-flex items-center gap-2.5 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-[#0A0B0E] transition-colors hover:bg-amber-400 cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    Launch Playable Build
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#12141A] p-6 lg:col-span-4">
              <div>
                <h3 className="font-display text-base font-semibold text-[#F4F4F6]">
                  Engineered Mechanics
                </h3>
                <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-zinc-400">
                  <li>01. Zero-GC 180-slot particle & 120-slot projectile ring buffers</li>
                  <li>02. Attack token pool limiting simultaneous ranged/charge windups</li>
                  <li>03. 130ms dash input buffering with invulnerability frames</li>
                  <li>04. Procedural Web Audio synth + optional Lyria soundtrack</li>
                </ul>
              </div>

              <div className="mt-6 border-t border-white/[0.08] pt-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-zinc-300">Top Recorded Runs</p>
                  <Trophy className="h-4 w-4 text-amber-400" aria-hidden="true" />
                </div>
                <div className="mt-3 space-y-2">
                  {gameScores.slice(0, 3).map((g, idx) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between text-xs font-mono tabular-nums"
                    >
                      <span className="text-zinc-400">
                        #{idx + 1} · Wave {g.waveReached}
                      </span>
                      <span className="font-semibold text-zinc-100">
                        {g.score.toLocaleString()} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Viewport Game Shell (Zero Website Navbars/Footers, Zero backdrop-filter over canvas) */}
      {isOpen && (
        <div
          data-testid="game-shell"
          className="fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-[#08090C] select-none"
        >
          {customTrackUrl && (
            <audio ref={bgAudioRef} src={customTrackUrl} loop preload="auto" />
          )}

          {/* Isolated Canvas Surface */}
          <canvas
            ref={canvasRef}
            data-testid="shard-breaker-canvas"
            className="block h-full w-full cursor-crosshair"
          />

          {/* TITLE SCREEN OVERLAY */}
          {phase === 'title' && (
            <div className="fixed inset-0 z-10 flex flex-col justify-between bg-[#08090C]">
              <img
                src="/src/assets/images/game_title_bg_1795379820835.jpg"
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(8,9,12,0.94) 0%, rgba(8,9,12,0.72) 42%, rgba(8,9,12,0.12) 100%)',
                }}
              />

              <div className="relative z-10 flex flex-1 items-center px-8 sm:px-14 lg:px-20">
                <div className="max-w-lg">
                  {/* Bespoke Inline SVG Title Lockup */}
                  <svg
                    viewBox="0 0 460 118"
                    className="w-full max-w-[430px]"
                    role="img"
                    aria-label="Shard Breaker"
                  >
                    <polygon
                      points="10,22 36,6 54,24 34,58 10,48"
                      fill="#F59E0B"
                    />
                    <polygon
                      points="42,36 62,18 68,54 44,64"
                      fill="#F4F4F6"
                    />
                    <line x1="10" y1="76" x2="430" y2="76" stroke="#F59E0B" strokeOpacity="0.45" strokeWidth="1.5" />
                    <text
                      x="82"
                      y="52"
                      fill="#F4F4F6"
                      fontFamily="Bricolage Grotesque, sans-serif"
                      fontWeight="700"
                      fontSize="44"
                      letterSpacing="-1.2"
                    >
                      SHARD BREAKER
                    </text>
                    <text
                      x="12"
                      y="102"
                      fill="#A1A1AA"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="500"
                      fontSize="13"
                      letterSpacing="2.4"
                    >
                      TACTICAL ARENA · 5-WAVE ASSAULT
                    </text>
                  </svg>

                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      data-start="true"
                      onClick={startGame}
                      className="rounded-lg bg-amber-500 px-7 py-3.5 font-display text-base font-bold text-[#08090C] shadow-lg transition-transform duration-150 hover:scale-[1.02] hover:bg-amber-400 cursor-pointer"
                    >
                      Start Mission
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg border border-white/15 bg-[#12141A] px-5 py-3.5 text-sm font-medium text-zinc-200 transition-colors hover:border-white/30 hover:text-white cursor-pointer"
                    >
                      Return to Portfolio
                    </button>
                  </div>
                </div>
              </div>

              {/* Single Flat Control-Hint Line in Bottom Safe Margin */}
              <div className="relative z-10 px-8 pb-7 sm:px-14 lg:px-20">
                <p className="font-mono text-xs tracking-wide text-zinc-400">
                  WASD Move · Mouse Aim &amp; Fire · Shift Dash · Esc Pause
                </p>
              </div>
            </div>
          )}

          {/* ACTIVE PLAYING HUD (pointer-events-none wrapper, >=85% clear playfield, zero backdrop-filter) */}
          {phase !== 'title' && (
            <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-5">
              <div className="flex items-start justify-between gap-4">
                {/* Top-Left World-Matched Vitality Sockets + Score/Wave */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-5">
                    <div>
                      <p className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
                        SCORE
                      </p>
                      <p
                        data-testid="hud-score"
                        className="font-mono text-3xl font-bold leading-none tabular-nums text-[#F4F4F6]"
                        style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}
                      >
                        {Math.round(hud.score)}
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
                        WAVE
                      </p>
                      <p
                        className="font-mono text-2xl font-bold leading-none tabular-nums text-amber-400"
                        style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}
                      >
                        {hud.wave}/{hud.maxWaves}
                      </p>
                    </div>

                    {hud.combo > 1 && (
                      <div>
                        <p className="font-mono text-[10px] tracking-widest text-amber-300 uppercase">
                          COMBO
                        </p>
                        <p className="font-mono text-2xl font-bold leading-none tabular-nums text-amber-300">
                          {hud.combo}x
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Custom Inline SVG Vitality Pips (Full / Empty Socket) */}
                  <div className="flex items-center gap-1.5" aria-label={`Hull Integrity ${hud.hp} of ${hud.maxHp}`}>
                    <span className="mr-1 font-mono text-[10px] tracking-wider text-zinc-400 uppercase">
                      HULL
                    </span>
                    {Array.from({ length: hud.maxHp }).map((_, idx) => {
                      const filled = idx < hud.hp;
                      return (
                        <svg key={idx} viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                          <polygon
                            points="12,2 22,12 12,22 2,12"
                            fill={filled ? '#F59E0B' : '#14161D'}
                            stroke={filled ? '#FDE68A' : '#3F4454'}
                            strokeWidth="2"
                          />
                          {filled && (
                            <polygon points="12,6 16,12 12,15 8,12" fill="#FFFBEB" opacity="0.65" />
                          )}
                        </svg>
                      );
                    })}

                    <span className="ml-3 font-mono text-[10px] tracking-wider text-zinc-400 uppercase">
                      DASH
                    </span>
                    <div className="h-2 w-16 overflow-hidden rounded-sm bg-[#1A1D26] border border-white/15">
                      <div
                        className="h-full bg-amber-400 origin-left"
                        style={{ transform: `scaleX(${hud.dashReadyRatio})` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Top-Right Compact Square Utility Icon Controls */}
                <div className="pointer-events-auto flex items-center gap-2">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      toggleMute();
                    }}
                    aria-label={muted ? 'Unmute audio [M]' : 'Mute audio [M]'}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-[#12141A] text-zinc-200 hover:border-amber-500/60 hover:text-white cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      {muted ? (
                        <line x1="23" y1="9" x2="17" y2="15" />
                      ) : (
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      )}
                    </svg>
                  </button>

                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      togglePause();
                    }}
                    aria-label="Pause mission [P]"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-[#12141A] text-zinc-200 hover:border-amber-500/60 hover:text-white cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      startGame();
                    }}
                    aria-label="Restart mission [R]"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-[#12141A] text-zinc-200 hover:border-amber-500/60 hover:text-white cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                      <polyline points="3 3 3 8 8 8" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onClose();
                    }}
                    aria-label="Exit to portfolio"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-[#12141A] text-zinc-200 hover:border-rose-500/60 hover:text-rose-300 cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PAUSE MODAL */}
          {phase === 'paused' && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pause-modal-title"
              className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4"
            >
              <div className="w-full max-w-sm rounded-xl border border-amber-500/30 bg-[#12141A] p-7">
                <h2 id="pause-modal-title" className="font-display text-2xl font-bold text-[#F4F4F6]">
                  Mission Paused
                </h2>
                <div className="mt-5 grid grid-cols-2 gap-3 border-y border-white/[0.08] py-4 font-mono tabular-nums">
                  <div>
                    <p className="text-[11px] text-zinc-400">SCORE</p>
                    <p className="mt-1 text-xl font-bold text-white">{hud.score}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400">WAVE</p>
                    <p className="mt-1 text-xl font-bold text-amber-400">
                      {hud.wave}/{hud.maxWaves}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={togglePause}
                    className="w-full rounded-lg bg-amber-500 py-3 text-sm font-semibold text-[#08090C] hover:bg-amber-400 cursor-pointer"
                  >
                    Resume
                  </button>
                  <button
                    type="button"
                    onClick={startGame}
                    className="w-full rounded-lg border border-white/12 bg-[#181B24] py-2.5 text-sm font-medium text-zinc-200 hover:text-white cursor-pointer"
                  >
                    Restart
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-lg border border-white/10 py-2.5 text-sm font-medium text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Return to Portfolio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VICTORY / GAME OVER MODAL */}
          {(phase === 'gameover' || phase === 'victory') && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="end-modal-title"
              className="fixed inset-0 z-20 flex items-center justify-center bg-black/75 p-4"
            >
              <div className="w-full max-w-md rounded-xl border border-amber-500/35 bg-[#12141A] p-7">
                <p className="font-mono text-xs text-amber-400">
                  {phase === 'victory' ? 'ALL 5 WAVES CLEARED' : 'HULL BREACHED'}
                </p>
                <h2 id="end-modal-title" className="mt-1 font-display text-3xl font-bold text-[#F4F4F6]">
                  {phase === 'victory' ? 'Sector Secured' : 'Run Complete'}
                </h2>

                <div className="mt-6 grid grid-cols-3 gap-3 border-y border-white/[0.08] py-4 font-mono tabular-nums">
                  <div>
                    <p className="text-[10px] text-zinc-400">FINAL SCORE</p>
                    <p className="mt-1 text-xl font-bold text-white">{hud.score}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400">BEST</p>
                    <p className="mt-1 text-xl font-bold text-amber-400">{hud.bestScore}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400">CLEARED</p>
                    <p className="mt-1 text-xl font-bold text-zinc-200">{hud.enemiesDefeated}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    data-start="true"
                    onClick={startGame}
                    className="flex-1 rounded-lg bg-amber-500 py-3 text-sm font-semibold text-[#08090C] hover:bg-amber-400 cursor-pointer"
                  >
                    Play Again
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-lg border border-white/12 bg-[#181B24] py-3 text-sm font-medium text-zinc-200 hover:text-white cursor-pointer"
                  >
                    Return to Portfolio
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
