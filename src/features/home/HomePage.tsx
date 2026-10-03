import React from 'react';
import { ActivePage } from '../../types';
import { Shield, Lock, FileText, CheckCircle2, Zap, Share2, EyeOff, Layers, KeyRound, ArrowRight } from 'lucide-react';

interface HomePageProps {
  setActivePage: (page: ActivePage) => void;
  isLoggedIn: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({ setActivePage, isLoggedIn }) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
              <span>ZERO-KNOWLEDGE STUDENT VAULT</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.1] mb-6 text-balance">
              Your private locker for documents and credentials.
            </h1>

            <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-300 leading-relaxed mb-8 max-w-2xl">
              Store IDs, transcripts, and certificates securely. Auto-bundle dossiers for internships and placements, utilize an offline PDF toolkit, and share with self-destructing PIN links.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setActivePage(isLoggedIn ? 'dashboard' : 'login')}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-sm"
              >
                <span>{isLoggedIn ? 'Open Locker Dashboard' : 'Sign In to Your Locker'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (isLoggedIn) setActivePage('upload');
                  else setActivePage('login');
                }}
                className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
              >
                <span>Upload Documents</span>
              </button>
            </div>

            {/* Quick trust metrics */}
            <div className="pt-12 mt-12 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-3 gap-6 text-left">
              <div>
                <span className="block text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">100%</span>
                <span className="text-xs text-neutral-500">Client-Side Privacy</span>
              </div>
              <div>
                <span className="block text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">&lt; 1-Click</span>
                <span className="text-xs text-neutral-500">Dossier Preparation</span>
              </div>
              <div>
                <span className="block text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">10</span>
                <span className="text-xs text-neutral-500">Built-in PDF Utilities</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Privacy Promise Section */}
      <section className="py-16 bg-neutral-100/70 dark:bg-neutral-900/40 border-y border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mb-3">
              The StuLock Privacy Promise
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Only the student owner can view, access, or export stored records. We never monetize, track, or share your academic identity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <EyeOff className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                Zero Unauthorized Access
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Every record is strictly compartmentalized. Another user can never access or inspect your files, even with a guessed or forged URL.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                Expiring PIN Share Links
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Share files with employers and universities using time-limited links with custom PIN protection, watermarking, and live open logs.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                Instant Panic Lockdown
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Lost your phone or shared the wrong link? One click on the Panic button immediately revokes all active links and terminates sessions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Everything a student needs in one place
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Tired of searching through messy email threads, WhatsApp downloads, and scattered cloud drives during job applications? AegisLock keeps all academic credentials organized, ready to verify, and instantly bundleable.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Application Packs Checklist</h4>
                    <p className="text-xs text-neutral-500">Auto-checks required documents for Internship, Scholarship, and Placement drives. Bundles all files into one compiled PDF dossier.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Complete In-Browser PDF Toolkit</h4>
                    <p className="text-xs text-neutral-500">Merge PDFs & photos, extract pages, rotate, add custom watermarks, compress to exact target size, sign with a drawn signature, and run OCR.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Personal Information Vault</h4>
                    <p className="text-xs text-neutral-500">Roll numbers, campus addresses, CGPA, and emergency contacts with copy buttons on every field for rapid application forms.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setActivePage(isLoggedIn ? 'dashboard' : 'login')}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Start Organizing Your Locker
                </button>
              </div>
            </div>

            {/* Visual Preview Card */}
            <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800 text-xs">
                <span className="font-semibold text-neutral-900 dark:text-white">Application Pack Readiness</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">4 of 4 Ready (100%)</span>
              </div>

              <div className="space-y-2.5">
                {[
                  { name: 'College Student Identity Card', cat: 'ID', status: 'Verified' },
                  { name: 'Semester 5 Official Grade Sheet', cat: 'Marksheet', status: 'Verified' },
                  { name: 'Systems Engineering Internship Certificate', cat: 'Certificate', status: 'Verified' },
                  { name: 'Distributed Cache Capstone Report', cat: 'Project', status: 'Verified' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">{item.name}</span>
                    </div>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono shrink-0 ml-2">✓ Ready</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <div className="w-full py-2.5 px-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold rounded-lg text-center">
                  Prepare & Download Application Dossier PDF
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-8 bg-white dark:bg-neutral-950 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 AegisLock Student Digital Locker · Encrypted & Owner-Only Access</p>
          <div className="flex items-center gap-6">
            <button onClick={() => setActivePage('home')} className="hover:text-neutral-900 dark:hover:text-white transition-colors">Home</button>
            <button onClick={() => setActivePage('dashboard')} className="hover:text-neutral-900 dark:hover:text-white transition-colors">Dashboard</button>
            <button onClick={() => setActivePage('login')} className="hover:text-neutral-900 dark:hover:text-white transition-colors">Sign In</button>
          </div>
        </div>
      </footer>

    </div>
  );
};
