import React, { useState, useRef, useEffect } from 'react';
import { ActivePage, UserAccount } from '../types';
import {
  LayoutDashboard,
  Plus,
  Share2,
  ShieldAlert,
  User,
  LogOut,
  UploadCloud,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';

interface BottomFloatingBarProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  user: UserAccount | null;
  onOpenPanicModal: () => void;
  onLogout: () => void;
  onOpenCreatePackModal?: () => void;
}

export const BottomFloatingBar: React.FC<BottomFloatingBarProps> = ({
  activePage,
  setActivePage,
  user,
  onOpenPanicModal,
  onLogout,
  onOpenCreatePackModal,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    if (showAddMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showAddMenu]);

  // Only display if user is logged in
  if (!user) return null;

  return (
    <>
      {/* Click-away backdrop when Add (+) menu is open */}
      {showAddMenu && (
        <div
          className="fixed inset-0 z-30 pointer-events-auto bg-black/10 dark:bg-black/30 backdrop-blur-2xs transition-opacity"
          onClick={() => setShowAddMenu(false)}
        />
      )}

      <div
        ref={menuRef}
        className="fixed bottom-4 sm:bottom-6 inset-x-0 mx-auto w-fit z-40 flex flex-col items-center pointer-events-none max-w-[calc(100vw-1.5rem)] px-2"
      >
        {/* Popover options when clicking the Add (+) button */}
        {showAddMenu && (
          <div className="mb-3 p-2 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200/90 dark:border-neutral-800/90 rounded-2xl shadow-2xl flex flex-col gap-1.5 w-56 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto z-40">
            <button
              type="button"
              onClick={() => {
                setShowAddMenu(false);
                setActivePage('upload');
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
            >
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-bold">Upload a File</span>
                <span className="text-[10px] text-neutral-500 font-normal">Scan or import document</span>
              </div>
            </button>

            {onOpenCreatePackModal && (
              <button
                type="button"
                onClick={() => {
                  setShowAddMenu(false);
                  onOpenCreatePackModal();
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
              >
                <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold">Application Pack</span>
                  <span className="text-[10px] text-neutral-500 font-normal">Internship & scholarship</span>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Floating Bar with Rounded Edges & Blur Theme */}
        <nav
          aria-label="Floating bottom navigation bar"
          className="pointer-events-auto flex items-center gap-1.5 sm:gap-3 px-3 sm:px-4 py-2 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200/90 dark:border-neutral-800/90 rounded-full shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transition-all hover:shadow-indigo-500/10"
        >
          {/* 1. Dashboard / Locker Button */}
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            title="Dashboard & Locker Documents"
            aria-label="Dashboard"
            className={`p-2.5 rounded-full transition-all flex items-center justify-center shrink-0 ${
              activePage === 'dashboard'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md scale-105'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>

          {/* 2. Add Button (+) Prominent center action */}
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            title="Add New Document or Pack"
            aria-label="Add Document or Application Pack"
            className={`p-2.5 sm:p-3 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center shrink-0 ${
              showAddMenu || activePage === 'upload' ? 'ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-neutral-900' : ''
            }`}
          >
            {showAddMenu ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5 stroke-[2.5]" />}
          </button>

          {/* 3. Share Button */}
          <button
            type="button"
            onClick={() => setActivePage('share')}
            title="Share Links & Access Logs"
            aria-label="Share Links"
            className={`p-2.5 rounded-full transition-all flex items-center justify-center shrink-0 ${
              activePage === 'share'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md scale-105'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 my-auto shrink-0"></div>

          {/* 4. Panic Button (Emergency Killswitch) */}
          <button
            type="button"
            onClick={onOpenPanicModal}
            title="Panic Killswitch: Revoke all share links and lock vault"
            aria-label="Panic Killswitch"
            className="p-2.5 rounded-full text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/60 dark:border-rose-900/50 active:scale-95 transition-all flex items-center justify-center shrink-0"
          >
            <ShieldAlert className="w-5 h-5" />
          </button>

          {/* 5. Profile Vault Button */}
          <button
            type="button"
            onClick={() => setActivePage('profile')}
            title={`Profile Vault: ${user.name} (${user.rollNumber})`}
            aria-label="Profile Vault"
            className={`p-2.5 rounded-full transition-all flex items-center justify-center shrink-0 ${
              activePage === 'profile'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md scale-105'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <User className="w-5 h-5" />
          </button>

          {/* 6. Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            title="Sign Out of Student Locker"
            aria-label="Sign Out"
            className="p-2.5 rounded-full text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all flex items-center justify-center shrink-0"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </nav>
      </div>
    </>
  );
};
