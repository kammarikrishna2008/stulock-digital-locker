import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActivePage, UserAccount } from './types';
import { Navbar } from './components/Navbar';
import { PanicModal } from './components/PanicModal';
import { BottomFloatingBar } from './components/BottomFloatingBar';
import { ToastProvider, useToast } from './components/Toast';
import { HomePage } from './features/home';
import { LoginPage, EmailConfigModal, getCurrentUser, terminateUserSession, touchSessionActivity } from './features/auth';
import { DashboardPage, CreatePackModal } from './features/dashboard';
import { ProfilePage } from './features/profile';
import { UploadPage } from './features/upload';
import { SharePage } from './features/share';
import { getActiveDocuments, initStorage, INITIAL_USER } from './services/db';
import { AlertCircle, ShieldAlert, LogOut, Clock } from 'lucide-react';

function AppContent() {
  const { toast } = useToast();
  const [activePage, setActivePage] = useState<ActivePage>('login');
  const [user, setUser] = useState<UserAccount | null>(null);
  const [userDocs, setUserDocs] = useState<any[]>([]);
  const [showCreatePackModal, setShowCreatePackModal] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('aegislock_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [showPanicModal, setShowPanicModal] = useState(false);
  const [showEmailConfigModal, setShowEmailConfigModal] = useState(false);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [inactivityCountdown, setInactivityCountdown] = useState(60);

  const lastActivityRef = useRef<number>(Date.now());

  // Apply dark mode class to root document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aegislock_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aegislock_theme', 'light');
    }
  }, [isDark]);

  // Load user session on mount (Always require login on page reload as requested)
  useEffect(() => {
    const loadSession = async () => {
      await initStorage();
      // On page reload, the login page appears so student logs into existing account
      setUser(null);
      setActivePage('login');
    };
    loadSession();
  }, []);

  // Track user activity for auto-logout after 10 minutes of inactivity
  const handleUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    touchSessionActivity();
    if (showInactivityWarning) {
      setShowInactivityWarning(false);
      setInactivityCountdown(60);
    }
  }, [showInactivityWarning]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleUserActivity));

    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      const NINE_MINUTES = 9 * 60 * 1000;
      const TEN_MINUTES = 10 * 60 * 1000;

      if (idleTime >= TEN_MINUTES) {
        // Auto logout
        terminateUserSession();
        setUser(null);
        setActivePage('login');
        setShowInactivityWarning(false);
        toast({
          type: 'error',
          title: 'Session Timed Out',
          message: 'You were logged out after 10 minutes of inactivity for your protection.',
        });
      } else if (idleTime >= NINE_MINUTES) {
        // Show warning modal
        setShowInactivityWarning(true);
        const remaining = Math.max(0, Math.ceil((TEN_MINUTES - idleTime) / 1000));
        setInactivityCountdown(remaining);
      }
    }, 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
      clearInterval(interval);
    };
  }, [user, handleUserActivity, toast]);

  const handleLogout = () => {
    terminateUserSession();
    setUser(null);
    setActivePage('home');
    toast({
      type: 'info',
      title: 'Session Terminated',
      message: 'You have been safely signed out. Encrypted vault is locked.',
    });
  };

  const handlePanicTriggered = (revokedCount: number) => {
    setShowPanicModal(false);
    setUser(null);
    setActivePage('login');
    toast({
      type: 'error',
      title: 'Panic Lockdown Active',
      message: `Revoked ${revokedCount} active share links immediately. All sessions terminated.`,
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Bar Navigation */}
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        isDark={isDark}
        setIsDark={setIsDark}
        onOpenPanicModal={() => setShowPanicModal(true)}
        onLogout={handleLogout}
        onOpenEmailConfig={() => setShowEmailConfigModal(true)}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {activePage === 'home' && (
          <HomePage setActivePage={setActivePage} isLoggedIn={!!user} />
        )}

        {(!user || activePage === 'login') && activePage !== 'home' ? (
          <LoginPage
            setActivePage={setActivePage}
            onUserLoggedIn={(u) => {
              setUser(u);
              setActivePage('dashboard');
            }}
          />
        ) : (
          <>
            {activePage === 'dashboard' && user && (
              <DashboardPage
                user={user}
                setActivePage={setActivePage}
                onOpenPanicModal={() => setShowPanicModal(true)}
              />
            )}

            {activePage === 'profile' && user && (
              <ProfilePage
                user={user}
                onUserUpdated={(u) => setUser(u)}
              />
            )}

            {activePage === 'upload' && user && (
              <UploadPage
                user={user}
                setActivePage={setActivePage}
                onDocumentAdded={() => {}}
              />
            )}

            {activePage === 'share' && user && (
              <SharePage user={user} />
            )}
          </>
        )}
      </main>

      {/* Bottom Floating Bar with rounded edges, blur theme, and side by side actions */}
      <BottomFloatingBar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        onOpenPanicModal={() => setShowPanicModal(true)}
        onLogout={handleLogout}
        onOpenCreatePackModal={async () => {
          if (user) {
            const docs = await getActiveDocuments(user.id);
            setUserDocs(docs);
            setShowCreatePackModal(true);
          } else {
            setActivePage('login');
          }
        }}
      />

      {/* Create Application Pack Modal */}
      {user && (
        <CreatePackModal
          user={user}
          documents={userDocs}
          isOpen={showCreatePackModal}
          onClose={() => setShowCreatePackModal(false)}
          onPackCreated={async () => {
            const docs = await getActiveDocuments(user.id);
            setUserDocs(docs);
          }}
          onOpenDashboardPacks={() => {
            setActivePage('dashboard');
          }}
        />
      )}

      {/* Panic Modal */}
      {user && (
        <PanicModal
          userId={user.id}
          isOpen={showPanicModal}
          onClose={() => setShowPanicModal(false)}
          onPanicTriggered={handlePanicTriggered}
        />
      )}

      {/* Email Service & Delivery Configuration Modal */}
      <EmailConfigModal
        isOpen={showEmailConfigModal}
        onClose={() => setShowEmailConfigModal(false)}
        defaultEmail={user?.email || 'narra.saikiran9417@gmail.com'}
      />

      {/* 10-Minute Inactivity Warning Modal */}
      {showInactivityWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Inactivity Security Warning
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Your locker has been idle. To protect your private documents, you will be automatically signed out in:
              </p>
            </div>

            <div className="text-3xl font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
              {inactivityCountdown}s
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                Log Out Now
              </button>
              <button
                type="button"
                onClick={handleUserActivity}
                className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
              >
                Keep Me Signed In
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
