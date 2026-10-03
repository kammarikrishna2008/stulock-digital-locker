import React from 'react';
import { ActivePage, UserAccount } from '../types';
import { Sun, Moon } from 'lucide-react';

interface NavbarProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  user: UserAccount | null;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  onOpenPanicModal: () => void;
  onLogout: () => void;
  onOpenEmailConfig?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  setActivePage,
  user,
  isDark,
  setIsDark,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        
        {/* Brand Wordmark */}
        <button
          onClick={() => setActivePage(user ? 'dashboard' : 'home')}
          className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-white hover:opacity-90 transition-opacity flex items-center gap-2.5 cursor-pointer"
          aria-label="StuLock Home"
        >
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-xs">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-extrabold tracking-tight text-neutral-900 dark:text-white">Stu</span>
            <span className="font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">Lock</span>
          </div>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle color theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
          </button>
        </div>

      </div>
    </header>
  );
};
