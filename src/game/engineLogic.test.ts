import test from 'node:test';
import assert from 'node:assert/strict';
import {
  circleIntersects,
  clampDt,
  createEnemy,
  getWaveDifficulty,
  scoreForKill,
  stepEnemyBehavior,
} from './engineLogic';

test('clampDt enforces upper bound of 0.05s', () => {
  assert.equal(clampDt(0.016), 0.016);
  assert.equal(clampDt(0.45), 0.05);
  assert.equal(clampDt(-1), 0);
});

test('circleIntersects detects overlapping and separated circles', () => {
  assert.equal(circleIntersects(0, 0, 10, 15, 0, 10), true);
  assert.equal(circleIntersects(0, 0, 10, 25, 0, 10), false);
});

test('getWaveDifficulty ramps across 3 knobs (spawnInterval, speed, archetype mix)', () => {
  const w1 = getWaveDifficulty(1);
  const w3 = getWaveDifficulty(3);
  assert.ok(w3.spawnInterval < w1.spawnInterval);
  assert.ok(w3.enemySpeedScale > w1.enemySpeedScale);
  assert.equal(w1.archetypeWeights.charger, 0);
  assert.ok(w3.archetypeWeights.charger > 0);
});

test('charger archetype transitions from move -> windup telegraph -> attack lunge with attack token', () => {
  const charger = createEnemy(1, 'charger', 200, 100, 2);
  charger.stateTimer = 0.01;
  // Player within 310px range, token available
  const e1 = stepEnemyBehavior(charger, 360, 100, 0.02, 1, 2);
  assert.equal(charger.state, 'windup');
  assert.equal(e1.telegraphStarted, true);
  assert.equal(e1.acquiredToken, true);

  // Advance past windup duration (0.52s)
  let launched = false;
  for (let i = 0; i < 15; i++) {
    const ev = stepEnemyBehavior(charger, 360, 100, 0.04, 1, 1);
    if (ev.chargeLaunched) launched = true;
  }
  assert.equal(launched, true);
  assert.equal(charger.state, 'attack');
});

test('kiter archetype fires projectile only after windup telegraph completes', () => {
  const kiter = createEnemy(2, 'kiter', 100, 100, 1);
  kiter.stateTimer = 0.01;
  const e1 = stepEnemyBehavior(kiter, 360, 100, 0.02, 1, 1);
  assert.equal(kiter.state, 'windup');
  assert.equal(e1.telegraphStarted, true);

  let fired = false;
  for (let i = 0; i < 20; i++) {
    const ev = stepEnemyBehavior(kiter, 360, 100, 0.04, 1, 0);
    if (ev.spawnEnemyBolt) fired = true;
  }
  assert.equal(fired, true);
  assert.equal(kiter.state, 'recover');
  assert.equal(kiter.hasAttackToken, false);
});

test('scoreForKill scales with enemy archetype and combo', () => {
  assert.ok(scoreForKill('charger', 0) > scoreForKill('swarmer', 0));
  assert.ok(scoreForKill('swarmer', 6) > scoreForKill('swarmer', 0));
});
