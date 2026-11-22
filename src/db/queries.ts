import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { gameScores, milestones, repositories, streakLogs, users } from './schema.ts';
import {
  INITIAL_SEED_MILESTONES,
  INITIAL_SEED_REPOS,
  INITIAL_SEED_STREAK_LOGS,
} from '../data/seedData.ts';
import {
  computeUpdatedStreak,
  getTodayIsoDate,
  type DisciplineTrack,
  type MilestoneStatus,
  type RepoCategory,
} from '../utils/portfolioLogic.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
  photoUrl?: string | null
) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      const updated = await db
        .update(users)
        .set({
          email,
          displayName: displayName ?? existing[0].displayName,
          photoUrl: photoUrl ?? existing[0].photoUrl,
        })
        .where(eq(users.uid, uid))
        .returning();
      return updated[0];
    }

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName ?? email.split('@')[0],
        photoUrl: photoUrl ?? null,
        githubHandle: null,
        currentStreak: 12,
        longestStreak: 19,
        totalXp: 2480,
        lastActiveDate: getTodayIsoDate(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();

    const newUser = inserted[0];

    // Seed initial starter portfolio data for first-time authenticated users
    const existingMilestones = await db
      .select({ id: milestones.id })
      .from(milestones)
      .where(eq(milestones.userId, newUser.id))
      .limit(1);

    if (existingMilestones.length === 0) {
      await db.insert(milestones).values(
        INITIAL_SEED_MILESTONES.map((m) => ({
          userId: newUser.id,
          title: m.title,
          track: m.track,
          phase: m.phase,
          status: m.status,
          xpReward: m.xpReward,
          description: m.description,
          techStack: m.techStack,
          targetQuarter: m.targetQuarter,
          orderIndex: m.orderIndex,
        }))
      );

      await db.insert(repositories).values(
        INITIAL_SEED_REPOS.map((r) => ({
          userId: newUser.id,
          repoUrl: r.repoUrl,
          owner: r.owner,
          repoName: r.repoName,
          category: r.category,
          primaryLanguage: r.primaryLanguage,
          stars: r.stars,
          summary: r.summary,
          architecturePattern: r.architecturePattern,
          codebaseHighlights: r.codebaseHighlights,
          techStack: r.techStack,
          nextSteps: r.nextSteps,
          complexityLevel: r.complexityLevel,
        }))
      );

      await db.insert(streakLogs).values(
        INITIAL_SEED_STREAK_LOGS.map((s) => ({
          userId: newUser.id,
          logDate: s.logDate,
          track: s.track,
          minutesSpent: s.minutesSpent,
          xpEarned: s.xpEarned,
          note: s.note,
        }))
      );
    }

    return newUser;
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('Unable to synchronize user profile at this time.', { cause: error });
  }
}

export async function getFullPortfolioByUid(
  uid: string,
  email: string,
  displayName?: string | null,
  photoUrl?: string | null
) {
  try {
    const user = await getOrCreateUser(uid, email, displayName, photoUrl);
    const [userMilestones, userRepos, userLogs, userScores] = await Promise.all([
      db
        .select()
        .from(milestones)
        .where(eq(milestones.userId, user.id))
        .orderBy(asc(milestones.orderIndex), asc(milestones.id)),
      db
        .select()
        .from(repositories)
        .where(eq(repositories.userId, user.id))
        .orderBy(desc(repositories.analyzedAt)),
      db
        .select()
        .from(streakLogs)
        .where(eq(streakLogs.userId, user.id))
        .orderBy(desc(streakLogs.logDate), desc(streakLogs.id))
        .limit(90),
      db
        .select()
        .from(gameScores)
        .where(eq(gameScores.userId, user.id))
        .orderBy(desc(gameScores.score))
        .limit(10),
    ]);

    return {
      profile: {
        displayName: user.displayName ?? user.email.split('@')[0],
        email: user.email,
        photoUrl: user.photoUrl,
        githubHandle: user.githubHandle,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        totalXp: user.totalXp,
        lastActiveDate: user.lastActiveDate,
      },
      milestones: userMilestones.map((m) => ({
        id: m.id,
        title: m.title,
        track: m.track as DisciplineTrack,
        phase: m.phase,
        status: m.status as MilestoneStatus,
        xpReward: m.xpReward,
        description: m.description,
        techStack: m.techStack ?? [],
        targetQuarter: m.targetQuarter,
        orderIndex: m.orderIndex,
      })),
      repositories: userRepos.map((r) => ({
        id: r.id,
        repoUrl: r.repoUrl,
        owner: r.owner,
        repoName: r.repoName,
        category: r.category as RepoCategory,
        primaryLanguage: r.primaryLanguage,
        stars: r.stars,
        summary: r.summary,
        architecturePattern: r.architecturePattern,
        codebaseHighlights: r.codebaseHighlights ?? [],
        techStack: r.techStack ?? [],
        nextSteps: r.nextSteps ?? [],
        complexityLevel: r.complexityLevel,
        analyzedAt: r.analyzedAt ? r.analyzedAt.toISOString() : new Date().toISOString(),
      })),
      streakLogs: userLogs.map((l) => ({
        id: l.id,
        logDate: l.logDate,
        track: l.track as DisciplineTrack,
        minutesSpent: l.minutesSpent,
        xpEarned: l.xpEarned,
        note: l.note,
      })),
      gameScores: userScores.map((g) => ({
        id: g.id,
        score: g.score,
        waveReached: g.waveReached,
        enemiesDefeated: g.enemiesDefeated,
        createdAt: g.createdAt ? g.createdAt.toISOString() : new Date().toISOString(),
      })),
    };
  } catch (error) {
    console.error('Database error in getFullPortfolioByUid:', error);
    throw new Error('Failed to load portfolio data.', { cause: error });
  }
}

export async function createMilestoneForUser(
  uid: string,
  email: string,
  payload: {
    title: string;
    track: DisciplineTrack;
    phase: string;
    status: MilestoneStatus;
    xpReward: number;
    description: string;
    techStack: string[];
    targetQuarter: string;
  }
) {
  try {
    const user = await getOrCreateUser(uid, email);
    const existing = await db
      .select({ id: milestones.id })
      .from(milestones)
      .where(eq(milestones.userId, user.id));

    const [created] = await db
      .insert(milestones)
      .values({
        userId: user.id,
        title: payload.title,
        track: payload.track,
        phase: payload.phase,
        status: payload.status,
        xpReward: payload.xpReward,
        description: payload.description,
        techStack: payload.techStack,
        targetQuarter: payload.targetQuarter,
        orderIndex: existing.length + 1,
      })
      .returning();

    let totalXp = user.totalXp;
    if (payload.status === 'completed') {
      totalXp += payload.xpReward;
      await db.update(users).set({ totalXp }).where(eq(users.id, user.id));
    }

    return { milestone: created, totalXp };
  } catch (error) {
    console.error('Database error in createMilestoneForUser:', error);
    throw new Error('Failed to create milestone.', { cause: error });
  }
}

export async function updateMilestoneStatusForUser(
  uid: string,
  email: string,
  milestoneId: number,
  status: MilestoneStatus
) {
  try {
    const user = await getOrCreateUser(uid, email);
    const existing = await db
      .select()
      .from(milestones)
      .where(and(eq(milestones.id, milestoneId), eq(milestones.userId, user.id)))
      .limit(1);

    if (existing.length === 0) {
      return null;
    }

    const prevStatus = existing[0].status as MilestoneStatus;
    const [updated] = await db
      .update(milestones)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(milestones.id, milestoneId), eq(milestones.userId, user.id)))
      .returning();

    let xpDelta = 0;
    if (prevStatus !== 'completed' && status === 'completed') {
      xpDelta = existing[0].xpReward;
    } else if (prevStatus === 'completed' && status !== 'completed') {
      xpDelta = -existing[0].xpReward;
    }

    const totalXp = Math.max(0, user.totalXp + xpDelta);
    if (xpDelta !== 0) {
      await db.update(users).set({ totalXp }).where(eq(users.id, user.id));
    }

    return { milestone: updated, totalXp };
  } catch (error) {
    console.error('Database error in updateMilestoneStatusForUser:', error);
    throw new Error('Failed to update milestone status.', { cause: error });
  }
}

export async function deleteMilestoneForUser(uid: string, email: string, milestoneId: number) {
  try {
    const user = await getOrCreateUser(uid, email);
    const deleted = await db
      .delete(milestones)
      .where(and(eq(milestones.id, milestoneId), eq(milestones.userId, user.id)))
      .returning();
    return deleted.length > 0;
  } catch (error) {
    console.error('Database error in deleteMilestoneForUser:', error);
    throw new Error('Failed to delete milestone.', { cause: error });
  }
}

export async function addStreakLogForUser(
  uid: string,
  email: string,
  payload: {
    logDate: string;
    track: DisciplineTrack;
    minutesSpent: number;
    note: string;
  }
) {
  try {
    const user = await getOrCreateUser(uid, email);
    const xpEarned = Math.min(300, Math.max(20, Math.round(payload.minutesSpent * 1.5)));

    const [createdLog] = await db
      .insert(streakLogs)
      .values({
        userId: user.id,
        logDate: payload.logDate,
        track: payload.track,
        minutesSpent: payload.minutesSpent,
        xpEarned,
        note: payload.note,
      })
      .returning();

    const streakNext = computeUpdatedStreak(
      user.currentStreak,
      user.longestStreak,
      user.lastActiveDate,
      payload.logDate
    );
    const totalXp = user.totalXp + xpEarned;

    await db
      .update(users)
      .set({
        currentStreak: streakNext.currentStreak,
        longestStreak: streakNext.longestStreak,
        lastActiveDate: streakNext.lastActiveDate,
        totalXp,
      })
      .where(eq(users.id, user.id));

    return {
      log: createdLog,
      profile: {
        currentStreak: streakNext.currentStreak,
        longestStreak: streakNext.longestStreak,
        lastActiveDate: streakNext.lastActiveDate,
        totalXp,
      },
    };
  } catch (error) {
    console.error('Database error in addStreakLogForUser:', error);
    throw new Error('Failed to record daily learning session.', { cause: error });
  }
}

export async function saveAnalyzedRepositoryForUser(
  uid: string,
  email: string,
  payload: {
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
  }
) {
  try {
    const user = await getOrCreateUser(uid, email);
    const [created] = await db
      .insert(repositories)
      .values({
        userId: user.id,
        ...payload,
      })
      .returning();

    const totalXp = user.totalXp + 120;
    await db.update(users).set({ totalXp }).where(eq(users.id, user.id));

    return { repository: created, totalXp };
  } catch (error) {
    console.error('Database error in saveAnalyzedRepositoryForUser:', error);
    throw new Error('Failed to save repository analysis.', { cause: error });
  }
}

export async function deleteRepositoryForUser(uid: string, email: string, repoId: number) {
  try {
    const user = await getOrCreateUser(uid, email);
    const deleted = await db
      .delete(repositories)
      .where(and(eq(repositories.id, repoId), eq(repositories.userId, user.id)))
      .returning();
    return deleted.length > 0;
  } catch (error) {
    console.error('Database error in deleteRepositoryForUser:', error);
    throw new Error('Failed to delete repository insight.', { cause: error });
  }
}

export async function recordGameScoreForUser(
  uid: string,
  email: string,
  payload: { score: number; waveReached: number; enemiesDefeated: number }
) {
  try {
    const user = await getOrCreateUser(uid, email);
    const [created] = await db
      .insert(gameScores)
      .values({
        userId: user.id,
        score: payload.score,
        waveReached: payload.waveReached,
        enemiesDefeated: payload.enemiesDefeated,
      })
      .returning();

    const xpBonus = Math.min(150, Math.max(15, Math.floor(payload.score / 80)));
    const totalXp = user.totalXp + xpBonus;
    await db.update(users).set({ totalXp }).where(eq(users.id, user.id));

    return { scoreRecord: created, xpBonus, totalXp };
  } catch (error) {
    console.error('Database error in recordGameScoreForUser:', error);
    throw new Error('Failed to save game score.', { cause: error });
  }
}
