import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react';
import { panicRevokeAllLinks } from '../services/db';
import { terminateUserSession } from '../services/auth';

interface PanicModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onPanicTriggered: (revokedCount: number) => void;
}

export const PanicModal: React.FC<PanicModalProps> = ({
  userId,
  isOpen,
  onClose,
  onPanicTriggered,
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirmPanic = async () => {
    setLoading(true);
    try {
      sessionStorage.setItem('stulock_panic_triggered', 'true');
      const revokedCount = await panicRevokeAllLinks(userId);
      terminateUserSession();
      onPanicTriggered(revokedCount);
    } catch (e) {
      sessionStorage.setItem('stulock_panic_triggered', 'true');
      console.error('Panic execution error:', e);
      terminateUserSession();
      onPanicTriggered(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Emergency Panic Protocol
            </h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              Zero-Trust Lockdown
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6 text-sm text-neutral-600 dark:text-neutral-300">
          <p>
            Triggering the Panic kill-switch will immediately:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <li><strong className="text-neutral-800 dark:text-neutral-200">Revoke every active share link</strong> across all your documents permanently.</li>
            <li>Block anyone attempting to view or download previously shared files.</li>
            <li><strong className="text-neutral-800 dark:text-neutral-200">Terminate your current session</strong> across this device.</li>
            <li>Require full credential re-verification to regain locker access.</li>
          </ul>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>This action cannot be undone. Active viewers will lose access immediately.</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmPanic}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Locking Down...</span>
              </>
            ) : (
              <span>Initiate Panic Lockdown</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
