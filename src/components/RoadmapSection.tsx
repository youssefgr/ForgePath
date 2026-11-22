import React, { useMemo, useState } from 'react';
import { Check, Circle, Clock, Plus, X } from 'lucide-react';
import {
  computeTrackStats,
  TRACK_LABELS,
  type DisciplineTrack,
  type MilestoneItem,
  type MilestoneStatus,
} from '../utils/portfolioLogic';

interface RoadmapSectionProps {
  milestones: MilestoneItem[];
  onUpdateStatus: (id: number, status: MilestoneStatus) => Promise<void>;
  onAddMilestone: (payload: {
    title: string;
    track: DisciplineTrack;
    phase: string;
    status: MilestoneStatus;
    xpReward: number;
    description: string;
    techStack: string[];
    targetQuarter: string;
  }) => Promise<unknown>;
}

const FILTER_OPTIONS: Array<{ value: 'all' | DisciplineTrack; label: string }> = [
  { value: 'all', label: 'All Tracks' },
  { value: 'csharp_game', label: 'C# Game Dev' },
  { value: 'web_frontend', label: 'Web Frontend' },
  { value: 'web_backend', label: 'Web Backend' },
  { value: 'mobile', label: 'Mobile Dev' },
];

const STATUS_META: Record<MilestoneStatus, { label: string; colorClass: string }> = {
  completed: { label: 'Completed', colorClass: 'text-emerald-400' },
  in_progress: { label: 'In Progress', colorClass: 'text-amber-400' },
  planned: { label: 'Planned', colorClass: 'text-zinc-400' },
};

export const RoadmapSection: React.FC<RoadmapSectionProps> = ({
  milestones,
  onUpdateStatus,
  onAddMilestone,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | DisciplineTrack>('all');
  const [selectedId, setSelectedId] = useState<number | null>(milestones[0]?.id ?? null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Milestone form state
  const [title, setTitle] = useState('');
  const [track, setTrack] = useState<DisciplineTrack>('csharp_game');
  const [phase, setPhase] = useState('Phase 04 · Mastery');
  const [quarter, setQuarter] = useState('Q2 2027');
  const [xpReward, setXpReward] = useState('200');
  const [stackInput, setStackInput] = useState('C#, Unity, HLSL');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [csharpImgFailed, setCsharpImgFailed] = useState(false);
  const [webImgFailed, setWebImgFailed] = useState(false);

  const filteredMilestones = useMemo(() => {
    if (activeFilter === 'all') return milestones;
    return milestones.filter((m) => m.track === activeFilter);
  }, [milestones, activeFilter]);

  const selectedMilestone = useMemo(() => {
    return (
      filteredMilestones.find((m) => m.id === selectedId) ??
      filteredMilestones[0] ??
      null
    );
  }, [filteredMilestones, selectedId]);

  const trackStats = useMemo(() => computeTrackStats(milestones), [milestones]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (title.trim().length < 3) {
      setFormError('Enter a milestone title of at least 3 characters.');
      return;
    }
    if (description.trim().length < 10) {
      setFormError('Describe the architectural scope in at least 10 characters.');
      return;
    }
    const parsedXp = Number(xpReward);
    if (!Number.isFinite(parsedXp) || parsedXp < 50 || parsedXp > 500) {
      setFormError('XP reward must be between 50 and 500.');
      return;
    }

    setSubmitting(true);
    try {
      const stack = stackInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6);

      await onAddMilestone({
        title: title.trim(),
        track,
        phase: phase.trim() || 'Phase 04 · Mastery',
        status: 'planned',
        xpReward: Math.round(parsedXp),
        description: description.trim(),
        techStack: stack.length > 0 ? stack : [TRACK_LABELS[track]],
        targetQuarter: quarter.trim() || 'Q2 2027',
      });

      setTitle('');
      setDescription('');
      setShowAddForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="roadmap" className="border-t border-white/[0.08] py-20 lg:py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-medium text-amber-400">01. Technical Growth Path</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#F4F4F6] sm:text-4xl">
              Interactive Engineering Roadmap
            </h2>
            <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-zinc-400">
              Navigate milestones across C# game systems, full-stack web architecture, and mobile engineering. Select any node to inspect deliverables or update progress in real time.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-white/12 bg-[#141720] px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-amber-500/40 hover:text-white whitespace-nowrap shrink-0 cursor-pointer lg:self-auto"
          >
            {showAddForm ? (
              <>
                <X className="h-4 w-4" aria-hidden="true" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 text-amber-400" aria-hidden="true" />
                Add Milestone
              </>
            )}
          </button>
        </div>

        {/* Visual Competency Pillars */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#12141A]">
            <div className="relative h-48 overflow-hidden bg-[#0E1015]">
              {!csharpImgFailed ? (
                <img
                  src="/src/assets/images/track_csharp_showcase_1795379820834.jpg"
                  alt="Isometric game engine level transitioning from amber wireframe mesh to textured stone architecture"
                  referrerPolicy="no-referrer"
                  onError={() => setCsharpImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[#141720] text-sm text-zinc-400">
                  C# Game Systems Architecture
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#12141A] via-[#12141A]/30 to-transparent" />
            </div>
            <div className="p-6">
              <p className="text-xs text-zinc-400">C# · Unity DOTS · HLSL · Netcode</p>
              <h3 className="mt-1.5 font-display text-xl font-semibold text-[#F4F4F6]">
                Game Engine & Gameplay Systems
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Fixed-timestep ECS combat loops, zero-GC pooled particle systems, procedural spatial generation, and deterministic enemy AI state machines.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#12141A]">
            <div className="relative h-48 overflow-hidden bg-[#0E1015]">
              {!webImgFailed ? (
                <img
                  src="/src/assets/images/track_web_mobile_showcase_1795379820274.jpg"
                  alt="Matte black laptop and smartphone on slate surface displaying dark geometric interface grids"
                  referrerPolicy="no-referrer"
                  onError={() => setWebImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[#141720] text-sm text-zinc-400">
                  Full-Stack Web & Mobile Systems
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#12141A] via-[#12141A]/30 to-transparent" />
            </div>
            <div className="p-6">
              <p className="text-xs text-zinc-400">React · Node.js · PostgreSQL · React Native</p>
              <h3 className="mt-1.5 font-display text-xl font-semibold text-[#F4F4F6]">
                Full-Stack Web & Offline Mobile
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Type-safe relational APIs, responsive React interfaces, optimistic local-first mobile sync queues, and progressive offline caching.
              </p>
            </div>
          </div>
        </div>

        {/* Inline Create Milestone Drawer */}
        {showAddForm && (
          <form
            onSubmit={handleCreate}
            className="mt-8 rounded-xl border border-amber-500/30 bg-[#12141A] p-6"
          >
            <h3 className="font-display text-lg font-semibold text-[#F4F4F6]">
              New Roadmap Milestone
            </h3>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label htmlFor="ms-title" className="block text-xs font-medium text-zinc-300">
                  Milestone Title
                </label>
                <input
                  id="ms-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Custom Shader Graph Post-Processing Pipeline"
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="ms-track" className="block text-xs font-medium text-zinc-300">
                  Discipline Track
                </label>
                <select
                  id="ms-track"
                  value={track}
                  onChange={(e) => setTrack(e.target.value as DisciplineTrack)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="csharp_game">C# Game Dev</option>
                  <option value="web_frontend">Web Frontend</option>
                  <option value="web_backend">Web Backend</option>
                  <option value="mobile">Mobile Dev</option>
                </select>
              </div>

              <div>
                <label htmlFor="ms-phase" className="block text-xs font-medium text-zinc-300">
                  Phase Label
                </label>
                <input
                  id="ms-phase"
                  type="text"
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="ms-quarter" className="block text-xs font-medium text-zinc-300">
                  Target Quarter
                </label>
                <input
                  id="ms-quarter"
                  type="text"
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="ms-xp" className="block text-xs font-medium text-zinc-300">
                  XP Reward (50–500)
                </label>
                <input
                  id="ms-xp"
                  type="number"
                  min={50}
                  max={500}
                  value={xpReward}
                  onChange={(e) => setXpReward(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 font-mono text-sm tabular-nums text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label htmlFor="ms-stack" className="block text-xs font-medium text-zinc-300">
                  Technologies (comma separated)
                </label>
                <input
                  id="ms-stack"
                  type="text"
                  value={stackInput}
                  onChange={(e) => setStackInput(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label htmlFor="ms-desc" className="block text-xs font-medium text-zinc-300">
                  Technical Deliverables
                </label>
                <textarea
                  id="ms-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline the system architecture, benchmarks, or release criteria..."
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {formError && (
              <p role="alert" className="mt-3 text-xs font-medium text-rose-400">
                {formError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-amber-500 px-5 py-2 text-xs font-semibold text-[#0A0B0E] hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Saving…' : 'Save Milestone'}
              </button>
            </div>
          </form>
        )}

        {/* Segmented Filter Controls */}
        <div
          role="tablist"
          aria-label="Filter roadmap by discipline"
          className="mt-10 flex flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#12141A] p-1.5"
        >
          {FILTER_OPTIONS.map((opt) => {
            const active = activeFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveFilter(opt.value)}
                className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-[#0A0B0E] font-semibold'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Interactive Split: Left Timeline Path, Right Architectural Inspector */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="divide-y divide-white/[0.08] rounded-xl border border-white/[0.08] bg-[#12141A]">
              {filteredMilestones.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-zinc-400">No milestones in this discipline yet.</p>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-[#0A0B0E] cursor-pointer"
                  >
                    Create First Milestone
                  </button>
                </div>
              ) : (
                filteredMilestones.map((item, idx) => {
                  const isSelected = selectedMilestone?.id === item.id;
                  const meta = STATUS_META[item.status];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors duration-150 cursor-pointer ${
                        isSelected ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                          item.status === 'completed'
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                            : item.status === 'in_progress'
                              ? 'border-amber-500/60 bg-amber-500/15 text-amber-400'
                              : 'border-white/15 bg-transparent text-zinc-500'
                        }`}
                        aria-hidden="true"
                      >
                        {item.status === 'completed' ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : item.status === 'in_progress' ? (
                          <Clock className="h-3.5 w-3.5" />
                        ) : (
                          <Circle className="h-3 w-3" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                          <span className="font-mono tabular-nums text-zinc-500">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{TRACK_LABELS[item.track]}</span>
                          <span aria-hidden="true">·</span>
                          <span className={meta.colorClass}>{meta.label}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{item.targetQuarter}</span>
                        </div>
                        <p className="mt-1 font-display text-base font-semibold text-[#F4F4F6]">
                          {item.title}
                        </p>
                      </div>

                      <span className="font-mono text-xs tabular-nums text-zinc-400 whitespace-nowrap shrink-0">
                        +{item.xpReward} XP
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Milestone Architectural Inspector + Track Progress */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            {selectedMilestone && (
              <div className="rounded-xl border border-white/[0.08] bg-[#12141A] p-6">
                <p className="text-xs text-zinc-400">
                  {selectedMilestone.phase}
                  <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
                  {TRACK_LABELS[selectedMilestone.track]}
                  <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{selectedMilestone.targetQuarter}</span>
                </p>

                <h3 className="mt-2 font-display text-2xl font-bold text-[#F4F4F6]">
                  {selectedMilestone.title}
                </h3>

                <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                  {selectedMilestone.description}
                </p>

                <div className="mt-5 border-t border-white/[0.08] pt-4">
                  <p className="text-xs font-medium text-zinc-400">Core Technologies</p>
                  <p className="mt-1.5 font-mono text-xs text-zinc-200">
                    {selectedMilestone.techStack.join('  /  ')}
                  </p>
                </div>

                <div className="mt-6 border-t border-white/[0.08] pt-5">
                  <p className="text-xs font-medium text-zinc-400">Update Milestone Status</p>
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    {(['planned', 'in_progress', 'completed'] as MilestoneStatus[]).map((st) => {
                      const isCurrent = selectedMilestone.status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => onUpdateStatus(selectedMilestone.id, st)}
                          className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors duration-150 whitespace-nowrap cursor-pointer sm:px-3 ${
                            isCurrent
                              ? st === 'completed'
                                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                                : st === 'in_progress'
                                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                                  : 'border-white/25 bg-white/10 text-white'
                              : 'border-white/10 bg-[#0A0B0E] text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {STATUS_META[st].label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Track Completion Summary */}
            <div className="rounded-xl border border-white/[0.08] bg-[#12141A] p-6">
              <h3 className="font-display text-base font-semibold text-[#F4F4F6]">
                Discipline Progress
              </h3>
              <div className="mt-4 space-y-4">
                {trackStats.map((stat) => (
                  <div key={stat.track}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-300">{stat.label}</span>
                      <span className="font-mono tabular-nums text-zinc-400">
                        {stat.completed}/{stat.total} ({stat.completionPercent}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-transform duration-300 origin-left"
                        style={{ transform: `scaleX(${stat.completionPercent / 100})` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
