import React, { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TopNavProps {
  onOpenGame: () => void;
}

const NAV_LINKS = [
  { href: '#roadmap', label: 'Roadmap' },
  { href: '#repositories', label: 'Repositories' },
  { href: '#dashboard', label: 'Dashboard' },
  { href: '#arcade', label: 'Arcade' },
  { href: '#studio', label: 'Studio' },
];

export const TopNav: React.FC<TopNavProps> = ({ onOpenGame }) => {
  const { user, signInWithGoogle, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0A0B0E]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#top"
          className="font-display text-lg font-bold tracking-tight text-[#F4F4F6] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
        >
          ForgePath
        </a>

        {/* Zone 2: 5 clean single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-400"
        >
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap shrink-0 py-1 transition-colors duration-150 hover:text-[#F4F4F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              type="button"
              onClick={logout}
              aria-label={`Sign out ${user.displayName ?? user.email ?? 'user'}`}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#151821] px-4 py-2 text-xs font-semibold text-zinc-200 transition-colors duration-150 hover:border-amber-500/40 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="max-w-[120px] truncate">
                {user.displayName?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Account'}
              </span>
              <LogOut className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-[#0A0B0E] transition-colors duration-150 hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0B0E] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-300 md:hidden hover:text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-white/[0.08] bg-[#0F1117] px-6 py-4 md:hidden"
        >
          <div className="flex flex-col gap-2">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-[44px] items-center text-sm font-medium text-zinc-300 hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenGame();
              }}
              className="mt-2 flex min-h-[44px] items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 text-sm font-semibold text-amber-400"
            >
              Launch Playable Build
            </button>
          </div>
        </nav>
      )}
    </header>
  );
};
