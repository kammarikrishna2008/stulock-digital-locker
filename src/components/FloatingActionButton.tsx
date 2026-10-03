import React, { useState, useEffect, useRef } from 'react';
import { Plus, UploadCloud, Briefcase, Camera, X } from 'lucide-react';

interface FloatingActionButtonProps {
  onUploadFile: () => void;
  onCreatePack: () => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onUploadFile,
  onCreatePack,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 sm:right-10 z-40 flex flex-col items-end"
    >
      {/* Background backdrop blur when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-neutral-950/40 backdrop-blur-2xs -z-10 animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Pop-up Options positioned directly above the + button */}
      {isOpen && (
        <div className="mb-3 flex flex-col gap-2.5 items-end animate-in fade-in slide-in-from-bottom-3 duration-200">
          
          {/* Option 2: Create an application pack */}
          <button
            onClick={() => {
              setIsOpen(false);
              onCreatePack();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group"
          >
            <div className="text-right">
              <span className="block text-xs font-bold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Create an application pack
              </span>
              <span className="block text-[11px] text-neutral-500">
                Compile verified PDF dossier
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Briefcase className="w-4 h-4" />
            </div>
          </button>

          {/* Option 1: Upload a file */}
          <button
            onClick={() => {
              setIsOpen(false);
              onUploadFile();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group"
          >
            <div className="text-right">
              <span className="block text-xs font-bold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Upload a file
              </span>
              <span className="block text-[11px] text-neutral-500">
                Local upload or CamScanner camera
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <UploadCloud className="w-4 h-4" />
            </div>
          </button>

        </div>
      )}

      {/* Main Single '+' FAB Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Add new document or application pack"
        className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 ${
          isOpen
            ? 'bg-neutral-900 dark:bg-white dark:text-neutral-900 rotate-45 scale-95'
            : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105'
        }`}
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

    </div>
  );
};
