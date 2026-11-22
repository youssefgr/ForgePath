import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from './useOnlineStatus';
import {
  INITIAL_SEED_GAME_SCORES,
  INITIAL_SEED_MILESTONES,
  INITIAL_SEED_PROFILE,
  INITIAL_SEED_REPOS,
  INITIAL_SEED_STREAK_LOGS,
} from '../data/seedData';
import {
  computeUpdatedStreak,
  getTodayIsoDate,
  type DisciplineTrack,
  type GameScoreItem,
  type MilestoneItem,
  type MilestoneStatus,
  type RepoCategory,
  type RepositoryInsight,
  type StreakLogItem,
  type UserProfileStats,
} from '../utils/portfolioLogic';

const CACHE_KEY = 'forgepath_offline_cache_v1';
const QUEUE_KEY = 'forgepath_sync_queue_v1';

interface CachedPortfolioState {
  profile: UserProfileStats;
  milestones: MilestoneItem[];
  repositories: RepositoryInsight[];
  streakLogs: StreakLogItem[];
  gameScores: GameScoreItem[];
}

type PendingMutation =
  | { type: 'UPDATE_MILESTONE'; id: number; status: MilestoneStatus }
  | {
      type: 'CREATE_MILESTONE';
      payload: {
        title: string;
        track: DisciplineTrack;
        phase: string;
        status: MilestoneStatus;
        xpReward: number;
        description: string;
        techStack: string[];
        targetQuarter: string;
      };
    }
  | {
      type: 'LOG_STREAK';
      payload: {
        logDate: string;
        track: DisciplineTrack;
        minutesSpent: number;
        note: string;
      };
    }
  | {
      type: 'RECORD_GAME_SCORE';
      payload: { score: number; waveReached: number; enemiesDefeated: number };
    };

function loadCachedState(): CachedPortfolioState {
  if (typeof window === 'undefined') {
    return {
      profile: INITIAL_SEED_PROFILE,
      milestones: INITIAL_SEED_MILESTONES,
      repositories: INITIAL_SEED_REPOS,
      streakLogs: INITIAL_SEED_STREAK_LOGS,
      gameScores: INITIAL_SEED_GAME_SCORES,
    };
  }
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CachedPortfolioState>;
      if (parsed.profile && Array.isArray(parsed.milestones) && Array.isArray(parsed.repositories)) {
        return {
          profile: parsed.profile,
          milestones: parsed.milestones,
          repositories: parsed.repositories,
          streakLogs: Array.isArray(parsed.streakLogs) ? parsed.streakLogs : INITIAL_SEED_STREAK_LOGS,
          gameScores: Array.isArray(parsed.gameScores) ? parsed.gameScores : INITIAL_SEED_GAME_SCORES,
        };
      }
    }
  } catch {
    // Fallback to initial seed data if storage is unavailable
  }
  return {
    profile: INITIAL_SEED_PROFILE,
    milestones: INITIAL_SEED_MILESTONES,
    repositories: INITIAL_SEED_REPOS,
    streakLogs: INITIAL_SEED_STREAK_LOGS,
    gameScores: INITIAL_SEED_GAME_SCORES,
  };
}

function loadPendingQueue(): PendingMutation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingMutation[]) : [];
  } catch {
    return [];
  }
}

export function usePortfolioStore() {
  const { user, getIdToken } = useAuth();
  const isOnline = useOnlineStatus();

  const [state, setState] = useState<CachedPortfolioState>(() => loadCachedState());
  const [pendingQueue, setPendingQueue] = useState<PendingMutation[]>(() => loadPendingQueue());
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Persist local offline mirror whenever state changes
  useEffect(() => {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state]);

  useEffect(() => {
    try {
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(pendingQueue));
    } catch {
      // Ignore quota errors
    }
  }, [pendingQueue]);

  const fetchServerPortfolio = useCallback(async () => {
    if (!user || !isOnline) return;
    const token = await getIdToken();
    if (!token) return;

    setSyncing(true);
    try {
      const res = await fetch('/api/portfolio', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as CachedPortfolioState;
      setState(data);
      setSyncNotice(null);
    } catch {
      // Retain offline cache transparently
    } finally {
      setSyncing(false);
    }
  }, [user, isOnline, getIdToken]);

  // Flush queued offline mutations when authenticated & back online
  useEffect(() => {
    if (!user || !isOnline) return;
    let cancelled = false;

    async function syncAll() {
      const token = await getIdToken();
      if (!token || cancelled) return;

      if (pendingQueue.length > 0) {
        setSyncing(true);
        const remaining: PendingMutation[] = [];
        for (const op of pendingQueue) {
          try {
            if (op.type === 'UPDATE_MILESTONE') {
              await fetch(`/api/milestones/${op.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: op.status }),
              });
            } else if (op.type === 'CREATE_MILESTONE') {
              await fetch('/api/milestones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(op.payload),
              });
            } else if (op.type === 'LOG_STREAK') {
              await fetch('/api/streaks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(op.payload),
              });
            } else if (op.type === 'RECORD_GAME_SCORE') {
              await fetch('/api/game-scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(op.payload),
              });
            }
          } catch {
            remaining.push(op);
          }
        }
        if (!cancelled) {
          setPendingQueue(remaining);
        }
      }

      if (!cancelled) {
        await fetchServerPortfolio();
      }
    }

    syncAll();
    return () => {
      cancelled = true;
    };
  }, [user, isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMilestoneStatus = useCallback(
    async (id: number, status: MilestoneStatus) => {
      setState((prev) => {
        const target = prev.milestones.find((m) => m.id === id);
        if (!target) return prev;
        let xpDelta = 0;
        if (target.status !== 'completed' && status === 'completed') xpDelta = target.xpReward;
        else if (target.status === 'completed' && status !== 'completed') xpDelta = -target.xpReward;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            totalXp: Math.max(0, prev.profile.totalXp + xpDelta),
          },
          milestones: prev.milestones.map((m) => (m.id === id ? { ...m, status } : m)),
        };
      });

      if (!user) return;
      if (!isOnline) {
        setPendingQueue((q) => [...q, { type: 'UPDATE_MILESTONE', id, status }]);
        setSyncNotice('Saved locally — will sync automatically when back online.');
        return;
      }

      const token = await getIdToken();
      if (!token) return;
      try {
        const res = await fetch(`/api/milestones/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status }),
        });
        if (res.ok) {
          const data = (await res.json()) as { totalXp?: number };
          if (typeof data.totalXp === 'number') {
            setState((prev) => ({ ...prev, profile: { ...prev.profile, totalXp: data.totalXp! } }));
          }
        }
      } catch {
        setPendingQueue((q) => [...q, { type: 'UPDATE_MILESTONE', id, status }]);
      }
    },
    [user, isOnline, getIdToken]
  );

  const addMilestone = useCallback(
    async (payload: {
      title: string;
      track: DisciplineTrack;
      phase: string;
      status: MilestoneStatus;
      xpReward: number;
      description: string;
      techStack: string[];
      targetQuarter: string;
    }) => {
      const tempId = Date.now();
      const optimistic: MilestoneItem = {
        id: tempId,
        ...payload,
        orderIndex: state.milestones.length + 1,
      };

      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          totalXp:
            payload.status === 'completed'
              ? prev.profile.totalXp + payload.xpReward
              : prev.profile.totalXp,
        },
        milestones: [...prev.milestones, optimistic],
      }));

      if (!user) return optimistic;
      if (!isOnline) {
        setPendingQueue((q) => [...q, { type: 'CREATE_MILESTONE', payload }]);
        setSyncNotice('Saved locally — will sync automatically when back online.');
        return optimistic;
      }

      const token = await getIdToken();
      if (!token) return optimistic;
      try {
        const res = await fetch('/api/milestones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = (await res.json()) as { milestone: MilestoneItem; totalXp: number };
          setState((prev) => ({
            ...prev,
            profile: { ...prev.profile, totalXp: data.totalXp },
            milestones: prev.milestones.map((m) => (m.id === tempId ? data.milestone : m)),
          }));
          return data.milestone;
        }
      } catch {
        setPendingQueue((q) => [...q, { type: 'CREATE_MILESTONE', payload }]);
      }
      return optimistic;
    },
    [user, isOnline, getIdToken, state.milestones.length]
  );

  const logDailyStreak = useCallback(
    async (payload: { track: DisciplineTrack; minutesSpent: number; note: string }) => {
      const logDate = getTodayIsoDate();
      const xpEarned = Math.min(300, Math.max(20, Math.round(payload.minutesSpent * 1.5)));
      const tempLog: StreakLogItem = {
        id: Date.now(),
        logDate,
        track: payload.track,
        minutesSpent: payload.minutesSpent,
        xpEarned,
        note: payload.note,
      };

      setState((prev) => {
        const nextStreak = computeUpdatedStreak(
          prev.profile.currentStreak,
          prev.profile.longestStreak,
          prev.profile.lastActiveDate,
          logDate
        );
        return {
          ...prev,
          profile: {
            ...prev.profile,
            currentStreak: nextStreak.currentStreak,
            longestStreak: nextStreak.longestStreak,
            lastActiveDate: nextStreak.lastActiveDate,
            totalXp: prev.profile.totalXp + xpEarned,
          },
          streakLogs: [tempLog, ...prev.streakLogs],
        };
      });

      if (!user) return tempLog;
      if (!isOnline) {
        setPendingQueue((q) => [
          ...q,
          { type: 'LOG_STREAK', payload: { logDate, ...payload } },
        ]);
        setSyncNotice('Session cached offline — will sync automatically on reconnect.');
        return tempLog;
      }

      const token = await getIdToken();
      if (!token) return tempLog;
      try {
        const res = await fetch('/api/streaks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ logDate, ...payload }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            log: StreakLogItem;
            profile: {
              currentStreak: number;
              longestStreak: number;
              lastActiveDate: string;
              totalXp: number;
            };
          };
          setState((prev) => ({
            ...prev,
            profile: { ...prev.profile, ...data.profile },
            streakLogs: prev.streakLogs.map((l) => (l.id === tempLog.id ? data.log : l)),
          }));
          return data.log;
        }
      } catch {
        setPendingQueue((q) => [
          ...q,
          { type: 'LOG_STREAK', payload: { logDate, ...payload } },
        ]);
      }
      return tempLog;
    },
    [user, isOnline, getIdToken]
  );

  const analyzeRepository = useCallback(
    async (repoUrl: string, category: RepoCategory): Promise<RepositoryInsight> => {
      if (!isOnline) {
        throw new Error('Repository analysis requires an active internet connection.');
      }
      const token = user ? await getIdToken() : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/repos/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({ repoUrl, category }),
      });

      const data = (await res.json()) as {
        repository?: RepositoryInsight;
        totalXp?: number;
        error?: string;
      };

      if (!res.ok || !data.repository) {
        throw new Error(data.error || 'Unable to analyze this repository.');
      }

      const insight = data.repository;
      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          totalXp: typeof data.totalXp === 'number' ? data.totalXp : prev.profile.totalXp + 120,
        },
        repositories: [insight, ...prev.repositories],
      }));
      return insight;
    },
    [user, isOnline, getIdToken]
  );

  const removeRepository = useCallback(
    async (id: number) => {
      setState((prev) => ({
        ...prev,
        repositories: prev.repositories.filter((r) => r.id !== id),
      }));

      if (!user || !isOnline) return;
      const token = await getIdToken();
      if (!token) return;
      try {
        await fetch(`/api/repos/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Already removed from local view
      }
    },
    [user, isOnline, getIdToken]
  );

  const recordGameScore = useCallback(
    async (payload: { score: number; waveReached: number; enemiesDefeated: number }) => {
      const xpBonus = Math.min(150, Math.max(15, Math.floor(payload.score / 80)));
      const localRecord: GameScoreItem = {
        id: Date.now(),
        ...payload,
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        profile: { ...prev.profile, totalXp: prev.profile.totalXp + xpBonus },
        gameScores: [localRecord, ...prev.gameScores]
          .sort((a, b) => b.score - a.score)
          .slice(0, 10),
      }));

      if (!user) return;
      if (!isOnline) {
        setPendingQueue((q) => [...q, { type: 'RECORD_GAME_SCORE', payload }]);
        return;
      }

      const token = await getIdToken();
      if (!token) return;
      try {
        const res = await fetch('/api/game-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = (await res.json()) as { totalXp?: number };
          if (typeof data.totalXp === 'number') {
            setState((prev) => ({ ...prev, profile: { ...prev.profile, totalXp: data.totalXp! } }));
          }
        }
      } catch {
        setPendingQueue((q) => [...q, { type: 'RECORD_GAME_SCORE', payload }]);
      }
    },
    [user, isOnline, getIdToken]
  );

  return {
    ...state,
    isOnline,
    syncing,
    pendingCount: pendingQueue.length,
    syncNotice,
    updateMilestoneStatus,
    addMilestone,
    logDailyStreak,
    analyzeRepository,
    removeRepository,
    recordGameScore,
  };
}
