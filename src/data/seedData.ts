import {
  getTodayIsoDate,
  isoDateToDayNumber,
  type MilestoneItem,
  type RepositoryInsight,
  type StreakLogItem,
  type UserProfileStats,
  type GameScoreItem,
} from '../utils/portfolioLogic.ts';

function daysAgoIso(daysAgo: number): string {
  const todayNum = isoDateToDayNumber(getTodayIsoDate()) ?? Math.floor(Date.now() / 86_400_000);
  return getTodayIsoDate(new Date((todayNum - daysAgo) * 86_400_000));
}

export const INITIAL_SEED_PROFILE: UserProfileStats = {
  displayName: 'Youssef Grissa',
  email: 'youssef.grissa.yg@gmail.com',
  photoUrl: null,
  githubHandle: 'youssef-dev',
  currentStreak: 12,
  longestStreak: 19,
  totalXp: 2480,
  lastActiveDate: daysAgoIso(0),
};

export const INITIAL_SEED_MILESTONES: MilestoneItem[] = [
  {
    id: 101,
    title: 'Deterministic ECS Combat Loop in C#',
    track: 'csharp_game',
    phase: 'Phase 01 · Engine Core',
    status: 'completed',
    xpReward: 250,
    description:
      'Implemented a fixed-timestep Entity Component System in Unity C# with zero-allocation object pooling, input buffering, and deterministic replay snapshots.',
    techStack: ['C# 12', 'Unity DOTS', 'Burst Compiler', 'HLSL'],
    targetQuarter: 'Q1 2026',
    orderIndex: 1,
  },
  {
    id: 102,
    title: 'Procedural Dungeon Generator & NavMesh Baking',
    track: 'csharp_game',
    phase: 'Phase 02 · Spatial Systems',
    status: 'completed',
    xpReward: 220,
    description:
      'Built runtime cellular-automata and BSP room stitching with async NavMesh triangulation and multi-archetype enemy steering policies.',
    techStack: ['C#', 'Unity 6', 'Job System', 'Behavior Trees'],
    targetQuarter: 'Q2 2026',
    orderIndex: 2,
  },
  {
    id: 103,
    title: 'Authoritative Netcode & Client Prediction',
    track: 'csharp_game',
    phase: 'Phase 03 · Multiplayer',
    status: 'in_progress',
    xpReward: 320,
    description:
      'Architecting UDP snapshot interpolation, server reconciliation, and lag-compensated hitboxes for 8-player tactical arena sessions.',
    techStack: ['C#', 'Netcode for GameObjects', 'LiteNetLib', 'Protobuf'],
    targetQuarter: 'Q4 2026',
    orderIndex: 3,
  },
  {
    id: 104,
    title: 'Design System & Smooth Scroll Motion Architecture',
    track: 'web_frontend',
    phase: 'Phase 01 · Interface Craft',
    status: 'completed',
    xpReward: 200,
    description:
      'Engineered an accessible React 19 + Tailwind v4 component architecture with compositor-only motion choreography and offline PWA precaching.',
    techStack: ['React 19', 'TypeScript', 'Tailwind CSS', 'Vite PWA'],
    targetQuarter: 'Q2 2026',
    orderIndex: 4,
  },
  {
    id: 105,
    title: 'PostgreSQL Relational Sync & Auth Gateway',
    track: 'web_backend',
    phase: 'Phase 02 · Data & Security',
    status: 'completed',
    xpReward: 280,
    description:
      'Designed normalized PostgreSQL schemas with Drizzle ORM, parameterized queries, Bearer JWT token verification, and low-latency REST endpoints.',
    techStack: ['Node.js', 'Express', 'PostgreSQL', 'Drizzle ORM'],
    targetQuarter: 'Q3 2026',
    orderIndex: 5,
  },
  {
    id: 106,
    title: 'Event-Driven Telemetry & Webhook Worker Pool',
    track: 'web_backend',
    phase: 'Phase 03 · Scale & Resilience',
    status: 'in_progress',
    xpReward: 300,
    description:
      'Building idempotent webhook ingestion, rate-limited background queues, and structured observability pipelines for distributed APIs.',
    techStack: ['TypeScript', 'PostgreSQL', 'Redis Streams', 'Docker'],
    targetQuarter: 'Q4 2026',
    orderIndex: 6,
  },
  {
    id: 107,
    title: 'Offline-First Mobile Companion & Local SQLite Sync',
    track: 'mobile',
    phase: 'Phase 01 · Mobile Foundations',
    status: 'completed',
    xpReward: 240,
    description:
      'Shipped a cross-platform mobile client with optimistic mutations, delta-conflict resolution, and background connectivity replay.',
    techStack: ['React Native', 'TypeScript', 'SQLite', 'Expo'],
    targetQuarter: 'Q3 2026',
    orderIndex: 7,
  },
  {
    id: 108,
    title: 'Native Gesture Physics & 60fps Mobile Shaders',
    track: 'mobile',
    phase: 'Phase 02 · Native Performance',
    status: 'planned',
    xpReward: 290,
    description:
      'Developing worklet-driven spring physics, Skia GPU canvas rendering, and biometric-secured offline vault sync for iOS and Android.',
    techStack: ['React Native', 'Reanimated', 'Skia', 'Swift/Kotlin'],
    targetQuarter: 'Q1 2027',
    orderIndex: 8,
  },
];

export const INITIAL_SEED_REPOS: RepositoryInsight[] = [
  {
    id: 201,
    repoUrl: 'https://github.com/youssef-dev/shard-ecs-engine',
    owner: 'youssef-dev',
    repoName: 'shard-ecs-engine',
    category: 'csharp_game',
    primaryLanguage: 'C#',
    stars: 42,
    summary:
      'A data-oriented 2D/3D tactical arena engine module in C# showcasing struct-based component pools, fixed-step physics integration, and decoupled AI steering states.',
    architecturePattern: 'Data-Oriented ECS + Command Buffer Event Bus',
    codebaseHighlights: [
      'Zero-GC ring-buffer particle system and pre-allocated projectile pools eliminate frame spikes during heavy combat waves.',
      'Modular enemy behavior state machine cleanly separates Swarmer, Ranged Kiter, and Telegraphed Charger policies.',
      'Deterministic fixed-dt accumulator with hitstop freeze timer decouples visual juice from simulation math.',
    ],
    techStack: ['C# 12', 'Unity Engine', 'Burst / Jobs', 'HLSL Shaders'],
    nextSteps: [
      'Extract spatial hash grid into a standalone NuGet package with BenchmarkDotNet regression suites.',
      'Add deterministic rollback serialization for networked co-op testing.',
    ],
    complexityLevel: 'Senior Systems',
    analyzedAt: new Date().toISOString(),
  },
  {
    id: 202,
    repoUrl: 'https://github.com/youssef-dev/forgepath-cloud-platform',
    owner: 'youssef-dev',
    repoName: 'forgepath-cloud-platform',
    category: 'web',
    primaryLanguage: 'TypeScript',
    stars: 31,
    summary:
      'Full-stack React and Express monorepo combining a type-safe Drizzle PostgreSQL persistence layer, Firebase Auth verification middleware, and offline-first PWA caching.',
    architecturePattern: 'Clean Layered API + Offline-First Optimistic Client',
    codebaseHighlights: [
      'Strict separation between pure domain logic modules, typed Drizzle query repositories, and Express HTTP controllers.',
      'Service worker precaching paired with a client-side mutation queue preserves full interactivity in zero-connectivity environments.',
      'Server-side AI orchestration routes keep credentials strictly isolated from browser bundles.',
    ],
    techStack: ['React 19', 'TypeScript', 'Express', 'PostgreSQL', 'Drizzle ORM'],
    nextSteps: [
      'Introduce OpenAPI schema generation from shared Zod validators for end-to-end contract testing.',
      'Add PostgreSQL partial indexes on high-frequency user timeline queries.',
    ],
    complexityLevel: 'Production Full-Stack',
    analyzedAt: new Date().toISOString(),
  },
  {
    id: 203,
    repoUrl: 'https://github.com/youssef-dev/nomad-sync-mobile',
    owner: 'youssef-dev',
    repoName: 'nomad-sync-mobile',
    category: 'mobile',
    primaryLanguage: 'TypeScript',
    stars: 24,
    summary:
      'Cross-platform mobile productivity and field-logging companion engineered for low-connectivity travel with local-first SQLite caching and incremental cloud sync.',
    architecturePattern: 'Offline-First Repository Pattern + Delta Sync Queue',
    codebaseHighlights: [
      'Optimistic local writes update the UI in under 16ms while queuing batched idempotent mutations for background upload.',
      'Shared TypeScript domain models enforce identical validation rules across mobile screens and backend REST endpoints.',
      'Worklet-driven navigation transitions maintain consistent 60fps gestures on mid-tier Android hardware.',
    ],
    techStack: ['React Native', 'TypeScript', 'SQLite', 'Reanimated', 'REST Sync'],
    nextSteps: [
      'Implement conflict-free CRDT merging for simultaneous multi-device offline edits.',
      'Add automated Detox E2E tests covering airplane-mode recovery scenarios.',
    ],
    complexityLevel: 'Production Mobile',
    analyzedAt: new Date().toISOString(),
  },
];

export const INITIAL_SEED_STREAK_LOGS: StreakLogItem[] = [
  { id: 301, logDate: daysAgoIso(0), track: 'csharp_game', minutesSpent: 75, xpEarned: 110, note: 'Tuned enemy attack-token cooldowns and hitstop frames in C# combat loop.' },
  { id: 302, logDate: daysAgoIso(1), track: 'web_backend', minutesSpent: 90, xpEarned: 130, note: 'Designed PostgreSQL relational schema and Drizzle upsert helpers.' },
  { id: 303, logDate: daysAgoIso(2), track: 'web_frontend', minutesSpent: 65, xpEarned: 95, note: 'Refined dark-mode typography scale and smooth scroll section anchoring.' },
  { id: 304, logDate: daysAgoIso(3), track: 'mobile', minutesSpent: 60, xpEarned: 90, note: 'Implemented offline mutation queue replay on reconnect.' },
  { id: 305, logDate: daysAgoIso(4), track: 'csharp_game', minutesSpent: 105, xpEarned: 150, note: 'Built pooled particle ring buffer and decaying camera trauma shake.' },
  { id: 306, logDate: daysAgoIso(5), track: 'web_backend', minutesSpent: 55, xpEarned: 80, note: 'Added Firebase ID token verification middleware and input validation.' },
  { id: 307, logDate: daysAgoIso(6), track: 'mobile', minutesSpent: 45, xpEarned: 70, note: 'Profiled React Native list virtualization on Android mid-tier emulator.' },
  { id: 308, logDate: daysAgoIso(7), track: 'csharp_game', minutesSpent: 85, xpEarned: 120, note: 'Wrote unit tests for wave difficulty ramp and raycast collision math.' },
  { id: 309, logDate: daysAgoIso(8), track: 'web_frontend', minutesSpent: 50, xpEarned: 75, note: 'Configured Vite PWA Workbox runtime caching for fonts and assets.' },
  { id: 310, logDate: daysAgoIso(9), track: 'web_backend', minutesSpent: 70, xpEarned: 100, note: 'Structured server-side Gemini high-thinking repository analyzer route.' },
  { id: 311, logDate: daysAgoIso(10), track: 'csharp_game', minutesSpent: 95, xpEarned: 135, note: 'Added windup sight-line telegraphs for ranged kiter enemies.' },
  { id: 312, logDate: daysAgoIso(11), track: 'mobile', minutesSpent: 40, xpEarned: 60, note: 'Audited mobile touch target sizing and sticky header viewport budget.' },
  { id: 313, logDate: daysAgoIso(15), track: 'web_frontend', minutesSpent: 80, xpEarned: 115, note: 'Prototyped interactive milestone timeline drawer with keyboard navigation.' },
  { id: 314, logDate: daysAgoIso(19), track: 'csharp_game', minutesSpent: 60, xpEarned: 85, note: 'Benchmarked struct-of-arrays memory layout in Unity Burst.' },
];

export const INITIAL_SEED_GAME_SCORES: GameScoreItem[] = [
  { id: 401, score: 4250, waveReached: 5, enemiesDefeated: 48, createdAt: daysAgoIso(2) },
  { id: 402, score: 2890, waveReached: 4, enemiesDefeated: 31, createdAt: daysAgoIso(5) },
];
