import React, { useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { PWAInstallButton } from './PWAWidgets';
import type { MilestoneItem, RepositoryInsight, UserProfileStats } from '../utils/portfolioLogic';

interface HeroSectionProps {
  profile: UserProfileStats;
  milestones: MilestoneItem[];
  repositories: RepositoryInsight[];
  onOpenGame: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  profile,
  milestones,
  repositories,
  onOpenGame,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const completedCount = milestones.filter((m) => m.status === 'completed').length;

  return (
    <section id="top" className="mx-auto max-w-[1200px] px-6 pt-14 pb-16 lg:pt-20 lg:pb-24">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
        {/* Left Column: Editorial Typographic Hierarchy */}
        <div className="flex flex-col justify-center lg:col-span-6">
          <p className="text-xs font-medium tracking-wide text-zinc-400">
            <span>C# Game Systems</span>
            <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
            <span>Full-Stack Web</span>
            <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
            <span>Offline-First Mobile</span>
          </p>

          <h1 className="mt-5 font-display text-[clamp(2.25rem,4.1vw,3.65rem)] font-bold leading-[1.08] tracking-tight text-[#F4F4F6]">
            Engineering interactive worlds, resilient backends, and mobile craft.
          </h1>

          <p className="mt-6 max-w-[54ch] text-base leading-relaxed text-zinc-400">
            A living technical portfolio and interactive growth roadmap built by{' '}
            <span className="text-zinc-200">{profile.displayName}</span>. Inspect analyzed GitHub architectures across C#, React, Node.js, and React Native, track daily engineering streaks, or launch the playable C# ECS arcade build.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#roadmap"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-[#0A0B0E] transition-colors duration-150 hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 whitespace-nowrap shrink-0"
            >
              Explore Roadmap
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={onOpenGame}
              className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-[#12141A] px-5 py-3 text-sm font-medium text-zinc-200 transition-colors duration-150 hover:border-amber-500/40 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="h-4 w-4 text-amber-400" aria-hidden="true" />
              Play Live Build
            </button>

            <PWAInstallButton />
          </div>
        </div>

        {/* Right Column: Matching-Height Architectural Studio Visual */}
        <div className="lg:col-span-6">
          <div className="relative h-full min-h-[290px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12141A]">
            {!imgFailed ? (
              <img
                src="/src/assets/images/hero_engineering_workspace_1795379820604.jpg"
                alt="Dark architectural software and game engineering workstation showing 3D wireframe terrain and node graphs"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center bg-gradient-to-br from-[#141720] to-[#0A0B0E] p-8 text-center">
                <p className="font-display text-lg font-semibold text-zinc-200">
                  ForgePath Systems Workspace
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  C# Game Engine · Full-Stack TypeScript · Mobile Sync
                </p>
              </div>
            )}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A0B0E]/80 via-transparent to-transparent"
              aria-hidden="true"
            />
            <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-xs text-zinc-300">
              <span>Multi-Discipline Systems Showcase</span>
              <span className="font-mono tabular-nums text-zinc-400">4 Core Tracks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width 4-Column Proof Metric Strip Below Hero Split */}
      <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-4">
        <div className="bg-[#0F1117] px-6 py-5">
          <p className="text-xs font-medium text-zinc-400">Milestones Completed</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#F4F4F6]">
            {completedCount}
            <span className="text-base font-normal text-zinc-500">/{milestones.length}</span>
          </p>
        </div>

        <div className="bg-[#0F1117] px-6 py-5">
          <p className="text-xs font-medium text-zinc-400">Daily Learning Streak</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-amber-400">
            {profile.currentStreak}{' '}
            <span className="ml-1 font-sans text-xs font-normal text-zinc-500">days</span>
          </p>
        </div>

        <div className="bg-[#0F1117] px-6 py-5">
          <p className="text-xs font-medium text-zinc-400">Analyzed Codebases</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#F4F4F6]">
            {repositories.length}{' '}
            <span className="ml-1 font-sans text-xs font-normal text-zinc-500">repos</span>
          </p>
        </div>

        <div className="bg-[#0F1117] px-6 py-5">
          <p className="text-xs font-medium text-zinc-400">Engineering XP</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#F4F4F6]">
            {profile.totalXp.toLocaleString()}{' '}
            <span className="ml-1 font-sans text-xs font-normal text-zinc-500">XP</span>
          </p>
        </div>
      </div>
    </section>
  );
};
