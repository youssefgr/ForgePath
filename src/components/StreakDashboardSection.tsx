import React, { useMemo, useState } from 'react';
import { Award, Flame, Plus } from 'lucide-react';
import {
  calculateLevelProgress,
  generateLast28DaysHeatmap,
  TRACK_LABELS,
  type DisciplineTrack,
  type MilestoneItem,
  type StreakLogItem,
  type UserProfileStats,
} from '../utils/portfolioLogic';

interface StreakDashboardSectionProps {
  profile: UserProfileStats;
  streakLogs: StreakLogItem[];
  milestones: MilestoneItem[];
  onLogSession: (payload: {
    track: DisciplineTrack;
    minutesSpent: number;
    note: string;
  }) => Promise<unknown>;
}

const HEATMAP_STYLES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-[#191C25] border-white/[0.05]',
  1: 'bg-amber-950/80 border-amber-800/40',
  2: 'bg-amber-800/70 border-amber-600/40',
  3: 'bg-amber-600/80 border-amber-500/50',
  4: 'bg-amber-400 border-amber-300',
};

export const StreakDashboardSection: React.FC<StreakDashboardSectionProps> = ({
  profile,
  streakLogs,
  milestones,
  onLogSession,
}) => {
  const [track, setTrack] = useState<DisciplineTrack>('csharp_game');
  const [minutesSpent, setMinutesSpent] = useState('45');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);

  const levelInfo = useMemo(() => calculateLevelProgress(profile.totalXp), [profile.totalXp]);
  const heatmap = useMemo(() => generateLast28DaysHeatmap(streakLogs), [streakLogs]);
  const selectedDay = useMemo(
    () => heatmap.find((d) => d.date === selectedDayIso) ?? heatmap[heatmap.length - 1],
    [heatmap, selectedDayIso]
  );

  const totalMinutes = useMemo(
    () => streakLogs.reduce((acc, l) => acc + l.minutesSpent, 0),
    [streakLogs]
  );

  const unlockedAchievements = useMemo(() => {
    const completedMilestones = milestones.filter((m) => m.status === 'completed').length;
    const distinctTracks = new Set(streakLogs.map((l) => l.track)).size;
    return [
      {
        title: '7-Day Consistency',
        unlocked: profile.longestStreak >= 7,
        detail: `${profile.longestStreak} day peak streak`,
      },
      {
        title: 'Polyglot Builder',
        unlocked: distinctTracks >= 4,
        detail: `${distinctTracks}/4 tracks logged`,
      },
      {
        title: 'Shipping Cadence',
        unlocked: completedMilestones >= 4,
        detail: `${completedMilestones} milestones shipped`,
      },
      {
        title: 'Deep Focus Craft',
        unlocked: totalMinutes >= 600,
        detail: `${Math.round(totalMinutes / 60)} hrs logged`,
      },
    ];
  }, [milestones, streakLogs, profile.longestStreak, totalMinutes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const mins = Number(minutesSpent);
    if (!Number.isFinite(mins) || mins < 5 || mins > 720) {
      setError('Enter session duration between 5 and 720 minutes.');
      return;
    }
    if (note.trim().length < 4) {
      setError('Add a short summary of what you built or studied (at least 4 characters).');
      return;
    }

    setSubmitting(true);
    try {
      await onLogSession({
        track,
        minutesSpent: Math.round(mins),
        note: note.trim(),
      });
      setNote('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="dashboard" className="border-t border-white/[0.08] py-20 lg:py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-amber-400">03. Real-Time Progress Dashboard</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#F4F4F6] sm:text-4xl">
            Gamified Learning Streaks & Mastery
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Log daily engineering sessions across C#, frontend, backend, and mobile development. Updates persist immediately to your profile and remain available offline while traveling.
          </p>
        </div>

        {/* Top Rank & Streak Overview */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Level & XP Bar */}
          <div className="rounded-xl border border-white/[0.08] bg-[#12141A] p-6 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-400">Current Engineering Rank</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-[#F4F4F6]">
                  Level <span className="font-mono tabular-nums text-amber-400">{levelInfo.level}</span> · {levelInfo.rankTitle}
                </h3>
              </div>
              <div className="text-right">
                <p className="font-mono text-xl font-semibold tabular-nums text-[#F4F4F6]">
                  {profile.totalXp.toLocaleString()} XP
                </p>
                <p className="font-mono text-xs tabular-nums text-zinc-500">
                  {levelInfo.xpIntoLevel}/{levelInfo.xpForNextLevel} XP to Level {levelInfo.level + 1}
                </p>
              </div>
            </div>

            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-amber-500 transition-transform duration-300 origin-left"
                style={{ transform: `scaleX(${Math.max(0.03, levelInfo.progressPercent / 100)})` }}
              />
            </div>

            {/* 28-Day Streak Heatmap */}
            <div className="mt-7 border-t border-white/[0.08] pt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-zinc-300">28-Day Engineering Cadence</p>
                {selectedDay && (
                  <p className="font-mono text-xs tabular-nums text-zinc-400">
                    {selectedDay.date} · {selectedDay.minutes}m · +{selectedDay.xp} XP
                  </p>
                )}
              </div>

              <div
                className="mt-3 grid grid-cols-7 gap-2 sm:grid-cols-14"
                role="grid"
                aria-label="28 day learning activity heatmap"
              >
                {heatmap.map((day) => {
                  const isSelected = selectedDay?.date === day.date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedDayIso(day.date)}
                      aria-label={`${day.date}: ${day.minutes} minutes, ${day.xp} XP`}
                      className={`h-8 rounded-md border transition-transform duration-150 hover:scale-105 cursor-pointer ${
                        HEATMAP_STYLES[day.intensity]
                      } ${isSelected ? 'ring-2 ring-white/70 ring-offset-1 ring-offset-[#12141A]' : ''}`}
                    />
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <span className="inline-flex items-center gap-1.5 text-zinc-200">
                    <Flame className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    <strong className="font-mono tabular-nums">{profile.currentStreak}</strong> current streak
                  </span>
                  <span>
                    Best: <strong className="font-mono tabular-nums text-zinc-300">{profile.longestStreak}</strong> days
                  </span>
                  <span>
                    Logged: <strong className="font-mono tabular-nums text-zinc-300">{Math.round(totalMinutes / 60)}h</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Less</span>
                  {([0, 1, 2, 3, 4] as const).map((lvl) => (
                    <span
                      key={lvl}
                      className={`inline-block h-3 w-3 rounded-sm border ${HEATMAP_STYLES[lvl]}`}
                      aria-hidden="true"
                    />
                  ))}
                  <span>More</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Check-In Form */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#12141A] p-6 lg:col-span-5"
          >
            <div>
              <h3 className="font-display text-lg font-semibold text-[#F4F4F6]">
                Log Daily Learning Session
              </h3>
              <p className="mt-1 text-xs text-zinc-400">
                Keep your streak active and earn XP across your technical tracks.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="log-track" className="block text-xs font-medium text-zinc-300">
                    Track
                  </label>
                  <select
                    id="log-track"
                    value={track}
                    onChange={(e) => setTrack(e.target.value as DisciplineTrack)}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0A0B0E] px-3 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="csharp_game">C# Game Dev</option>
                    <option value="web_frontend">Web Frontend</option>
                    <option value="web_backend">Web Backend</option>
                    <option value="mobile">Mobile Dev</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="log-minutes" className="block text-xs font-medium text-zinc-300">
                    Duration (min)
                  </label>
                  <input
                    id="log-minutes"
                    type="number"
                    min={5}
                    max={720}
                    value={minutesSpent}
                    onChange={(e) => setMinutesSpent(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0A0B0E] px-3 py-2.5 font-mono text-sm tabular-nums text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="log-note" className="block text-xs font-medium text-zinc-300">
                  What did you build or refine?
                </label>
                <textarea
                  id="log-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., Profiled C# physics collision queries and reduced GC allocations..."
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {error && (
                <p role="alert" className="mt-2.5 text-xs font-medium text-rose-400">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-[#0A0B0E] transition-colors hover:bg-amber-400 disabled:opacity-60 cursor-pointer"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {submitting ? 'Recording…' : 'Log Session & Claim XP'}
            </button>
          </form>
        </div>

        {/* Achievements & Recent Feed */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-white/[0.08] bg-[#12141A] p-6 lg:col-span-5">
            <h3 className="font-display text-base font-semibold text-[#F4F4F6]">
              Engineering Milestones Unlocked
            </h3>
            <div className="mt-4 divide-y divide-white/[0.08]">
              {unlockedAchievements.map((ach) => (
                <div key={ach.title} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Award
                      className={`h-4 w-4 shrink-0 ${ach.unlocked ? 'text-amber-400' : 'text-zinc-600'}`}
                      aria-hidden="true"
                    />
                    <div>
                      <p className={`text-sm font-medium ${ach.unlocked ? 'text-zinc-100' : 'text-zinc-500'}`}>
                        {ach.title}
                      </p>
                      <p className="text-xs text-zinc-500">{ach.detail}</p>
                    </div>
                  </div>
                  <span
                    className={`font-mono text-xs ${
                      ach.unlocked ? 'text-emerald-400' : 'text-zinc-600'
                    }`}
                  >
                    {ach.unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#12141A] p-6 lg:col-span-7">
            <h3 className="font-display text-base font-semibold text-[#F4F4F6]">
              Recent Learning Log
            </h3>
            <div className="mt-4 divide-y divide-white/[0.08]">
              {streakLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                    <span>
                      <span className="font-mono tabular-nums text-zinc-300">{log.logDate}</span>
                      <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
                      <span className="text-amber-400">{TRACK_LABELS[log.track]}</span>
                      <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{log.minutesSpent} min</span>
                    </span>
                    <span className="font-mono tabular-nums text-emerald-400">+{log.xpEarned} XP</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-200">{log.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
