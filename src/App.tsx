/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { usePortfolioStore } from './hooks/usePortfolioStore';
import { TopNav } from './components/TopNav';
import { HeroSection } from './components/HeroSection';
import { RoadmapSection } from './components/RoadmapSection';
import { RepoAnalyzerSection } from './components/RepoAnalyzerSection';
import { StreakDashboardSection } from './components/StreakDashboardSection';
import { ShardBreakerGame } from './components/ShardBreakerGame';
import { CreativeStudioSection } from './components/CreativeStudioSection';
import { OfflineIndicator } from './components/PWAWidgets';

function PortfolioWorkspace() {
  const { authError } = useAuth();
  const store = usePortfolioStore();

  const initialQuery = useMemo(() => {
    if (typeof window === 'undefined') return { game: false, autostart: false };
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';
    const game = params.get('game') === '1' || autostart;
    return { game, autostart };
  }, []);

  const [gameOpen, setGameOpen] = useState(initialQuery.game);
  const [gameAutostart, setGameAutostart] = useState(initialQuery.autostart);
  const [customGameTrackUrl, setCustomGameTrackUrl] = useState<string | null>(null);

  const handleOpenGame = () => {
    setGameAutostart(false);
    setGameOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#F4F4F6]">
      <TopNav onOpenGame={handleOpenGame} />

      {authError && (
        <div
          role="alert"
          className="mx-auto mt-4 max-w-[1200px] px-6"
        >
          <div className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {authError}
          </div>
        </div>
      )}

      <main>
        <HeroSection
          profile={store.profile}
          milestones={store.milestones}
          repositories={store.repositories}
          onOpenGame={handleOpenGame}
        />

        <RoadmapSection
          milestones={store.milestones}
          onUpdateStatus={store.updateMilestoneStatus}
          onAddMilestone={store.addMilestone}
        />

        <RepoAnalyzerSection
          repositories={store.repositories}
          isOnline={store.isOnline}
          onAnalyzeRepo={store.analyzeRepository}
          onRemoveRepo={store.removeRepository}
        />

        <StreakDashboardSection
          profile={store.profile}
          streakLogs={store.streakLogs}
          milestones={store.milestones}
          onLogSession={store.logDailyStreak}
        />

        <ShardBreakerGame
          isOpen={gameOpen}
          autostart={gameAutostart}
          onOpen={handleOpenGame}
          onClose={() => setGameOpen(false)}
          gameScores={store.gameScores}
          onRecordScore={store.recordGameScore}
          customTrackUrl={customGameTrackUrl}
        />

        <CreativeStudioSection
          isOnline={store.isOnline}
          activeGameTrackUrl={customGameTrackUrl}
          onSelectGameTrack={setCustomGameTrackUrl}
        />
      </main>

      <footer className="border-t border-white/[0.08] py-10">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-4 px-6 text-xs text-zinc-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} ForgePath · {store.profile.displayName}</p>
          <div className="flex flex-wrap items-center gap-6">
            <a href="#roadmap" className="hover:text-zinc-300">Roadmap</a>
            <a href="#repositories" className="hover:text-zinc-300">Repositories</a>
            <a href="#dashboard" className="hover:text-zinc-300">Dashboard</a>
            <a href="#arcade" className="hover:text-zinc-300">Arcade</a>
            <a href="#studio" className="hover:text-zinc-300">Studio</a>
          </div>
        </div>
      </footer>

      <OfflineIndicator pendingCount={store.pendingCount} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PortfolioWorkspace />
    </AuthProvider>
  );
}
