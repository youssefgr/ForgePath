import { relations } from 'drizzle-orm';
import { integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  githubHandle: text('github_handle'),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  totalXp: integer('total_xp').notNull().default(0),
  lastActiveDate: text('last_active_date'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const milestones = pgTable('milestones', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  track: text('track').notNull(), // 'csharp_game' | 'web_frontend' | 'web_backend' | 'mobile'
  phase: text('phase').notNull(),
  status: text('status').notNull().default('planned'), // 'planned' | 'in_progress' | 'completed'
  xpReward: integer('xp_reward').notNull().default(150),
  description: text('description').notNull(),
  techStack: jsonb('tech_stack').$type<string[]>().notNull().default([]),
  targetQuarter: text('target_quarter').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const repositories = pgTable('repositories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  repoUrl: text('repo_url').notNull(),
  owner: text('owner').notNull(),
  repoName: text('repo_name').notNull(),
  category: text('category').notNull(), // 'csharp_game' | 'web' | 'mobile'
  primaryLanguage: text('primary_language').notNull(),
  stars: integer('stars').notNull().default(0),
  summary: text('summary').notNull(),
  architecturePattern: text('architecture_pattern').notNull(),
  codebaseHighlights: jsonb('codebase_highlights').$type<string[]>().notNull().default([]),
  techStack: jsonb('tech_stack').$type<string[]>().notNull().default([]),
  nextSteps: jsonb('next_steps').$type<string[]>().notNull().default([]),
  complexityLevel: text('complexity_level').notNull(),
  analyzedAt: timestamp('analyzed_at').defaultNow(),
});

export const streakLogs = pgTable('streak_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  logDate: text('log_date').notNull(), // YYYY-MM-DD
  track: text('track').notNull(),
  minutesSpent: integer('minutes_spent').notNull(),
  xpEarned: integer('xp_earned').notNull(),
  note: text('note').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const gameScores = pgTable('game_scores', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  score: integer('score').notNull(),
  waveReached: integer('wave_reached').notNull(),
  enemiesDefeated: integer('enemies_defeated').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  milestones: many(milestones),
  repositories: many(repositories),
  streakLogs: many(streakLogs),
  gameScores: many(gameScores),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  user: one(users, {
    fields: [milestones.userId],
    references: [users.id],
  }),
}));

export const repositoriesRelations = relations(repositories, ({ one }) => ({
  user: one(users, {
    fields: [repositories.userId],
    references: [users.id],
  }),
}));

export const streakLogsRelations = relations(streakLogs, ({ one }) => ({
  user: one(users, {
    fields: [streakLogs.userId],
    references: [users.id],
  }),
}));

export const gameScoresRelations = relations(gameScores, ({ one }) => ({
  user: one(users, {
    fields: [gameScores.userId],
    references: [users.id],
  }),
}));
