import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLevelProgress,
  computeTrackStats,
  computeUpdatedStreak,
  generateLast28DaysHeatmap,
  parseGitHubRepoUrl,
  type MilestoneItem,
  type StreakLogItem,
} from './portfolioLogic';

test('parseGitHubRepoUrl accepts valid GitHub URLs and normalizes them', () => {
  const parsed = parseGitHubRepoUrl('https://github.com/youssef-dev/shard-ecs-engine.git');
  assert.deepEqual(parsed, {
    owner: 'youssef-dev',
    repo: 'shard-ecs-engine',
    canonicalUrl: 'https://github.com/youssef-dev/shard-ecs-engine',
  });

  const shorthand = parseGitHubRepoUrl('github.com/facebook/react/tree/main');
  assert.deepEqual(shorthand, {
    owner: 'facebook',
    repo: 'react',
    canonicalUrl: 'https://github.com/facebook/react',
  });
});

test('parseGitHubRepoUrl rejects SSRF, non-GitHub hosts, and malformed inputs', () => {
  assert.equal(parseGitHubRepoUrl('http://127.0.0.1:3000/owner/repo'), null);
  assert.equal(parseGitHubRepoUrl('http://169.254.169.254/latest/meta-data'), null);
  assert.equal(parseGitHubRepoUrl('https://evil.com/github.com/owner/repo'), null);
  assert.equal(parseGitHubRepoUrl('javascript:alert(1)'), null);
  assert.equal(parseGitHubRepoUrl('https://github.com/only-owner'), null);
});

test('computeUpdatedStreak handles consecutive days, same-day idempotency, and broken streaks', () => {
  const nextDay = computeUpdatedStreak(5, 10, '2026-11-21', '2026-11-22');
  assert.equal(nextDay.currentStreak, 6);
  assert.equal(nextDay.longestStreak, 10);

  const newRecord = computeUpdatedStreak(10, 10, '2026-11-21', '2026-11-22');
  assert.equal(newRecord.currentStreak, 11);
  assert.equal(newRecord.longestStreak, 11);

  const sameDay = computeUpdatedStreak(6, 10, '2026-11-22', '2026-11-22');
  assert.equal(sameDay.currentStreak, 6);
  assert.equal(sameDay.longestStreak, 10);

  const broken = computeUpdatedStreak(9, 14, '2026-11-18', '2026-11-22');
  assert.equal(broken.currentStreak, 1);
  assert.equal(broken.longestStreak, 14);
});

test('calculateLevelProgress computes level and percentage accurately', () => {
  const prog = calculateLevelProgress(1250);
  assert.equal(prog.level, 3);
  assert.equal(prog.xpIntoLevel, 250);
  assert.equal(prog.progressPercent, 50);
});

test('computeTrackStats summarizes milestones per track', () => {
  const items: MilestoneItem[] = [
    {
      id: 1,
      title: 'A',
      track: 'csharp_game',
      phase: 'P1',
      status: 'completed',
      xpReward: 100,
      description: '',
      techStack: [],
      targetQuarter: 'Q1',
      orderIndex: 1,
    },
    {
      id: 2,
      title: 'B',
      track: 'csharp_game',
      phase: 'P2',
      status: 'in_progress',
      xpReward: 100,
      description: '',
      techStack: [],
      targetQuarter: 'Q2',
      orderIndex: 2,
    },
  ];
  const stats = computeTrackStats(items);
  const csharp = stats.find((s) => s.track === 'csharp_game');
  assert.equal(csharp?.total, 2);
  assert.equal(csharp?.completed, 1);
  assert.equal(csharp?.completionPercent, 50);
});

test('generateLast28DaysHeatmap returns 28 ordered days with intensity levels', () => {
  const logs: StreakLogItem[] = [
    { id: 1, logDate: '2026-11-22', track: 'mobile', minutesSpent: 95, xpEarned: 140, note: 'Test' },
    { id: 2, logDate: '2026-11-21', track: 'web_backend', minutesSpent: 35, xpEarned: 55, note: 'Test' },
  ];
  const map = generateLast28DaysHeatmap(logs, '2026-11-22');
  assert.equal(map.length, 28);
  assert.equal(map[27].date, '2026-11-22');
  assert.equal(map[27].intensity, 4);
  assert.equal(map[26].date, '2026-11-21');
  assert.equal(map[26].intensity, 2);
  assert.equal(map[0].intensity, 0);
});
