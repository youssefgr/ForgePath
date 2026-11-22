export type DisciplineTrack = 'csharp_game' | 'web_frontend' | 'web_backend' | 'mobile';
export type MilestoneStatus = 'planned' | 'in_progress' | 'completed';
export type RepoCategory = 'csharp_game' | 'web' | 'mobile';

export interface MilestoneItem {
  id: number;
  title: string;
  track: DisciplineTrack;
  phase: string;
  status: MilestoneStatus;
  xpReward: number;
  description: string;
  techStack: string[];
  targetQuarter: string;
  orderIndex: number;
}

export interface RepositoryInsight {
  id: number;
  repoUrl: string;
  owner: string;
  repoName: string;
  category: RepoCategory;
  primaryLanguage: string;
  stars: number;
  summary: string;
  architecturePattern: string;
  codebaseHighlights: string[];
  techStack: string[];
  nextSteps: string[];
  complexityLevel: string;
  analyzedAt: string;
}

export interface StreakLogItem {
  id: number;
  logDate: string; // YYYY-MM-DD
  track: DisciplineTrack;
  minutesSpent: number;
  xpEarned: number;
  note: string;
}

export interface GameScoreItem {
  id: number;
  score: number;
  waveReached: number;
  enemiesDefeated: number;
  createdAt: string;
}

export interface UserProfileStats {
  displayName: string;
  email: string;
  photoUrl: string | null;
  githubHandle: string | null;
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  lastActiveDate: string | null;
}

export interface ParsedGitHubRepo {
  owner: string;
  repo: string;
  canonicalUrl: string;
}

const VALID_GITHUB_SEGMENT = /^[A-Za-z0-9_.-]{1,100}$/;

/**
 * Strictly parses and allowlists GitHub repository URLs to prevent SSRF or invalid host injection.
 */
export function parseGitHubRepoUrl(rawInput: string): ParsedGitHubRepo | null {
  const trimmed = rawInput.trim();
  if (!trimmed || trimmed.length > 300) return null;

  let normalized = trimmed;
  if (/^github\.com\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  } else if (/^www\.github\.com\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== 'github.com' && host !== 'www.github.com') {
    return null;
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, '');

  if (
    !VALID_GITHUB_SEGMENT.test(owner) ||
    !VALID_GITHUB_SEGMENT.test(repo) ||
    owner === '.' ||
    owner === '..' ||
    repo === '.' ||
    repo === '..'
  ) {
    return null;
  }

  return {
    owner,
    repo,
    canonicalUrl: `https://github.com/${owner}/${repo}`,
  };
}

/**
 * Converts a YYYY-MM-DD date string into UTC day index (days since epoch).
 */
export function isoDateToDayNumber(isoDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [y, m, d] = isoDate.split('-').map(Number);
  const utcMs = Date.UTC(y, m - 1, d);
  const check = new Date(utcMs);
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return Math.floor(utcMs / 86_400_000);
}

export function getTodayIsoDate(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function computeUpdatedStreak(
  currentStreak: number,
  longestStreak: number,
  lastActiveDate: string | null,
  newLogDate: string
): { currentStreak: number; longestStreak: number; lastActiveDate: string } {
  const newDay = isoDateToDayNumber(newLogDate);
  if (newDay === null) {
    return {
      currentStreak,
      longestStreak,
      lastActiveDate: lastActiveDate ?? newLogDate,
    };
  }

  if (!lastActiveDate) {
    const nextCurrent = Math.max(1, currentStreak || 1);
    return {
      currentStreak: nextCurrent,
      longestStreak: Math.max(longestStreak, nextCurrent),
      lastActiveDate: newLogDate,
    };
  }

  const prevDay = isoDateToDayNumber(lastActiveDate);
  if (prevDay === null) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(longestStreak, 1),
      lastActiveDate: newLogDate,
    };
  }

  const delta = newDay - prevDay;
  if (delta <= 0) {
    // Same day or backdated log: keep current streak intact
    const nextCurrent = Math.max(1, currentStreak);
    return {
      currentStreak: nextCurrent,
      longestStreak: Math.max(longestStreak, nextCurrent),
      lastActiveDate: delta === 0 ? newLogDate : lastActiveDate,
    };
  }

  if (delta === 1) {
    const nextCurrent = currentStreak + 1;
    return {
      currentStreak: nextCurrent,
      longestStreak: Math.max(longestStreak, nextCurrent),
      lastActiveDate: newLogDate,
    };
  }

  // Gap of > 1 day resets current streak to 1
  return {
    currentStreak: 1,
    longestStreak: Math.max(longestStreak, 1),
    lastActiveDate: newLogDate,
  };
}

export interface LevelProgress {
  level: number;
  rankTitle: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

const RANK_TITLES = [
  'Systems Apprentice',
  'Gameplay & Web Builder',
  'Full-Stack Craftsman',
  'Cross-Platform Architect',
  'Principal Engine & Platform Lead',
];

export function calculateLevelProgress(totalXp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));
  const xpPerLevel = 500;
  const level = Math.floor(safeXp / xpPerLevel) + 1;
  const xpIntoLevel = safeXp % xpPerLevel;
  const progressPercent = Math.round((xpIntoLevel / xpPerLevel) * 100);
  const rankIdx = Math.min(RANK_TITLES.length - 1, Math.floor((level - 1) / 2));

  return {
    level,
    rankTitle: RANK_TITLES[rankIdx],
    xpIntoLevel,
    xpForNextLevel: xpPerLevel,
    progressPercent,
  };
}

export interface TrackSummary {
  track: DisciplineTrack;
  label: string;
  total: number;
  completed: number;
  inProgress: number;
  planned: number;
  completionPercent: number;
}

export const TRACK_LABELS: Record<DisciplineTrack, string> = {
  csharp_game: 'C# Game Dev',
  web_frontend: 'Web Frontend',
  web_backend: 'Web Backend',
  mobile: 'Mobile Dev',
};

export function computeTrackStats(milestones: MilestoneItem[]): TrackSummary[] {
  const tracks: DisciplineTrack[] = ['csharp_game', 'web_frontend', 'web_backend', 'mobile'];
  return tracks.map((track) => {
    const items = milestones.filter((m) => m.track === track);
    const completed = items.filter((m) => m.status === 'completed').length;
    const inProgress = items.filter((m) => m.status === 'in_progress').length;
    const planned = items.filter((m) => m.status === 'planned').length;
    const completionPercent = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
    return {
      track,
      label: TRACK_LABELS[track],
      total: items.length,
      completed,
      inProgress,
      planned,
      completionPercent,
    };
  });
}

export interface HeatmapDay {
  date: string;
  minutes: number;
  xp: number;
  sessions: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export function generateLast28DaysHeatmap(
  logs: StreakLogItem[],
  referenceIsoDate: string = getTodayIsoDate()
): HeatmapDay[] {
  const refDay = isoDateToDayNumber(referenceIsoDate) ?? Math.floor(Date.now() / 86_400_000);
  const grouped = new Map<string, { minutes: number; xp: number; sessions: number }>();

  for (const log of logs) {
    const cur = grouped.get(log.logDate) ?? { minutes: 0, xp: 0, sessions: 0 };
    cur.minutes += log.minutesSpent;
    cur.xp += log.xpEarned;
    cur.sessions += 1;
    grouped.set(log.logDate, cur);
  }

  const days: HeatmapDay[] = [];
  for (let offset = 27; offset >= 0; offset--) {
    const d = new Date((refDay - offset) * 86_400_000);
    const iso = getTodayIsoDate(d);
    const stats = grouped.get(iso) ?? { minutes: 0, xp: 0, sessions: 0 };
    let intensity: 0 | 1 | 2 | 3 | 4 = 0;
    if (stats.minutes >= 90) intensity = 4;
    else if (stats.minutes >= 60) intensity = 3;
    else if (stats.minutes >= 30) intensity = 2;
    else if (stats.minutes > 0) intensity = 1;

    days.push({
      date: iso,
      minutes: stats.minutes,
      xp: stats.xp,
      sessions: stats.sessions,
      intensity,
    });
  }
  return days;
}
