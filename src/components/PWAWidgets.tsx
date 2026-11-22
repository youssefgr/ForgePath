import React, { useState } from 'react';
import { Download, WifiOff } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-[#141720] px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors duration-150 hover:border-amber-500/40 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="h-4 w-4 text-amber-400" aria-hidden="true" />
        Install Offline App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-[#141720] px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors duration-150 hover:border-amber-500/40 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="h-4 w-4 text-amber-400" aria-hidden="true" />
          Install on iOS
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          >
            <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#12141A] p-6">
              <h3 id="ios-install-title" className="text-lg font-semibold text-white">
                Install ForgePath on iOS
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                1. Tap the <strong className="text-zinc-200">Share</strong> button in Safari.
                <br />
                2. Scroll down and choose <strong className="text-zinc-200">Add to Home Screen</strong> for uninterrupted offline access while traveling.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-[#0A0B0E] hover:bg-amber-400 cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

interface OfflineIndicatorProps {
  pendingCount: number;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ pendingCount }) => {
  const isOnline = useOnlineStatus();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-40 flex items-center gap-2.5 rounded-lg border border-amber-500/35 bg-[#171511] px-4 py-2.5 text-xs font-medium text-amber-200 shadow-lg"
    >
      <WifiOff className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
      {!isOnline ? (
        <span>
          Offline mode active — viewing cached portfolio
          {pendingCount > 0 ? ` (${pendingCount} queued to sync)` : ''}
        </span>
      ) : (
        <span>Syncing {pendingCount} offline update{pendingCount === 1 ? '' : 's'}…</span>
      )}
    </div>
  );
};
