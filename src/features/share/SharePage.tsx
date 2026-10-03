import React, { useState, useEffect } from 'react';
import { UserAccount, LockerDocument, ShareLink, AccessLog } from '../../types';
import {
  getActiveDocuments,
  getDocumentById,
} from '../../services/db';
import {
  getShareLinksForUser,
  createShareLink,
  revokeShareLink,
  getAccessLogsForLink,
  recordAccessLog,
  getShareLinkByToken,
} from './db/shareDb';
import {
  Share2,
  Copy,
  Check,
  Lock,
  Clock,
  ShieldAlert,
  Eye,
  Download,
  AlertCircle,
  ExternalLink,
  Plus,
  FileText,
  KeyRound,
  History,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';

interface SharePageProps {
  user: UserAccount;
}

export const SharePage: React.FC<SharePageProps> = ({ user }) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<LockerDocument[]>([]);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Create form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [expiryOption, setExpiryOption] = useState<'1h' | '1d' | '7d'>('1d');
  const [enablePin, setEnablePin] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [permission, setPermission] = useState<'view' | 'download'>('view');
  const [enableWatermark, setEnableWatermark] = useState(true);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL · VERIFIED STUDENT RECORD');

  // Logs modal
  const [selectedLinkForLogs, setSelectedLinkForLogs] = useState<ShareLink | null>(null);
  const [logsList, setLogsList] = useState<AccessLog[]>([]);

  // Public Test Simulator
  const [testTokenInput, setTestTokenInput] = useState('');
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simLink, setSimLink] = useState<ShareLink | null>(null);
  const [simDoc, setSimDoc] = useState<LockerDocument | null>(null);
  const [simPinInput, setSimPinInput] = useState('');
  const [simError, setSimError] = useState<string | null>(null);
  const [simUnlocked, setSimUnlocked] = useState(false);
  const [simViewerOpen, setSimViewerOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    const docs = await getActiveDocuments(user.id);
    const userLinks = await getShareLinksForUser(user.id);
    setDocuments(docs);
    setLinks(userLinks);
    if (docs.length > 0 && !selectedDocId) {
      setSelectedDocId(docs[0].id);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const doc = documents.find(d => d.id === selectedDocId);
    if (!doc) {
      toast({ type: 'error', title: 'Select Document', message: 'Please select a document to share.' });
      return;
    }

    if (enablePin && (!pinCode || pinCode.length < 4)) {
      toast({ type: 'error', title: 'PIN Required', message: 'Please provide at least a 4-digit PIN.' });
      return;
    }

    // Expiry calculation
    const now = new Date();
    let expiresAt = new Date(now);
    if (expiryOption === '1h') expiresAt.setHours(now.getHours() + 1);
    else if (expiryOption === '1d') expiresAt.setDate(now.getDate() + 1);
    else if (expiryOption === '7d') expiresAt.setDate(now.getDate() + 7);

    const token = 'sh_' + Math.random().toString(36).substring(2, 10);

    const newLink: ShareLink = {
      id: 'link_' + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      documentId: doc.id,
      documentTitle: doc.title,
      token,
      requiresPin: enablePin,
      pinHash: enablePin ? pinCode : undefined,
      expiresAt: expiresAt.toISOString(),
      permission,
      watermarkText: enableWatermark ? watermarkText.trim() : undefined,
      revoked: false,
      createdAt: now.toISOString(),
    };

    await createShareLink(newLink);
    setShowCreateModal(false);
    await loadData();
    toast({
      type: 'success',
      title: 'Share Link Created',
      message: `Expiring link for "${doc.title}" generated successfully.`,
    });
  };

  const handleRevoke = async (link: ShareLink) => {
    if (!confirm(`Revoke share link for "${link.documentTitle}" immediately? Anyone with this link will be locked out.`)) return;
    await revokeShareLink(link.id, user.id);
    await loadData();
    toast({ type: 'info', title: 'Link Revoked', message: 'The link is permanently deactivated.' });
  };

  const handleCopyLink = (token: string) => {
    const fullUrl = `${window.location.origin}/#share?token=${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    toast({ type: 'success', title: 'Share Link Copied', message: 'URL copied to clipboard.' });
    setTimeout(() => {
      setCopiedToken(prev => (prev === token ? null : prev));
    }, 2000);
  };

  const handleViewLogs = async (link: ShareLink) => {
    setSelectedLinkForLogs(link);
    const logs = await getAccessLogsForLink(link.id);
    setLogsList(logs);
  };

  // Status helper
  const getLinkStatus = (link: ShareLink): { status: 'active' | 'expired' | 'revoked'; label: string; color: string } => {
    if (link.revoked) {
      return { status: 'revoked', label: 'Revoked', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40' };
    }
    const isExpired = new Date(link.expiresAt).getTime() < Date.now();
    if (isExpired) {
      return { status: 'expired', label: 'Expired', color: 'text-neutral-500 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700' };
    }
    return { status: 'active', label: 'Active', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40' };
  };

  // Test Simulator Logic
  const handleOpenSimulator = async (tokenToTest: string) => {
    setSimError(null);
    setSimUnlocked(false);
    setSimPinInput('');
    setTestTokenInput(tokenToTest);
    setSimulatorOpen(true);

    const link = await getShareLinkByToken(tokenToTest);
    if (!link) {
      setSimError('Access Denied: Invalid or unauthorized token. Another user\'s file or fake URL was blocked.');
      setSimLink(null);
      setSimDoc(null);
      return;
    }

    if (link.revoked) {
      setSimError('Access Denied: This link has been revoked by the student owner.');
      setSimLink(link);
      setSimDoc(null);
      return;
    }

    if (new Date(link.expiresAt).getTime() < Date.now()) {
      setSimError('Access Denied: This share link has expired.');
      setSimLink(link);
      setSimDoc(null);
      return;
    }

    setSimLink(link);
    const doc = await getDocumentById(link.documentId);
    setSimDoc(doc);

    if (!link.requiresPin) {
      setSimUnlocked(true);
      // Record access log
      await recordAccessLog({
        id: 'log_' + Math.random().toString(36).substring(2, 9),
        linkId: link.id,
        documentId: link.documentId,
        timestamp: new Date().toISOString(),
        device: 'Chrome on macOS (Public Viewer)',
        ipLocation: 'Bengaluru, India',
        action: 'view',
        successful: true,
      });
    }
  };

  const handleSimPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simLink) return;

    if (simPinInput !== simLink.pinHash) {
      setSimError('Incorrect PIN. Security attempt logged.');
      await recordAccessLog({
        id: 'log_' + Math.random().toString(36).substring(2, 9),
        linkId: simLink.id,
        documentId: simLink.documentId,
        timestamp: new Date().toISOString(),
        device: 'Chrome on macOS (Public Viewer)',
        ipLocation: 'Bengaluru, India',
        action: 'view',
        successful: false,
      });
      return;
    }

    setSimUnlocked(true);
    setSimError(null);
    await recordAccessLog({
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      linkId: simLink.id,
      documentId: simLink.documentId,
      timestamp: new Date().toISOString(),
      device: 'Chrome on macOS (Public Viewer)',
      ipLocation: 'Bengaluru, India',
      action: 'view',
      successful: true,
    });
    toast({ type: 'success', title: 'PIN Accepted', message: 'Identity verified. Access granted.' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Secure Share Links & Access Logs
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Time-bound links with optional PIN, custom watermark, and instant revocation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenSimulator('fake_token_test_blocked')}
            className="px-3.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            title="Test blocking of unauthorized / foreign token"
          >
            Test Invalid URL
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Share Link</span>
          </button>
        </div>
      </div>

      {/* Links List */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs mb-10">
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Generated Links
          </h3>
          <span className="text-xs text-neutral-500 font-mono tabular-nums">
            {links.length} total
          </span>
        </div>

        {links.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500 space-y-3">
            <Share2 className="w-8 h-8 text-neutral-400 mx-auto" />
            <p>No share links created yet. Generate your first expiring link to share with recruiters or colleges.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg hover:underline"
            >
              + Create New Share Link
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-950/40 text-neutral-500 font-medium border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  <th className="px-5 py-3">Document</th>
                  <th className="px-4 py-3">Security & Permissions</th>
                  <th className="px-4 py-3">Expires At</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                {links.map(link => {
                  const statusInfo = getLinkStatus(link);
                  const isCopied = copiedToken === link.token;

                  return (
                    <tr key={link.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {link.documentTitle}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                          Token: {link.token}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 space-y-1">
                        <div className="flex items-center gap-2">
                          {link.requiresPin ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                              <Lock className="w-3 h-3" />
                              <span>PIN Protected</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-neutral-500">Open Link</span>
                          )}

                          <span className="text-neutral-300 dark:text-neutral-700">·</span>

                          <span className="text-[11px] text-neutral-600 dark:text-neutral-400 capitalize">
                            {link.permission === 'view' ? 'View Only' : 'Download Allowed'}
                          </span>
                        </div>

                        {link.watermarkText && (
                          <div className="text-[10px] text-neutral-400 truncate max-w-xs">
                            Watermark: "{link.watermarkText}"
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                        {new Date(link.expiresAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold border rounded ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCopyLink(link.token)}
                            className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            title="Copy link"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleOpenSimulator(link.token)}
                            className="p-1.5 text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            title="Open in public simulator viewer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleViewLogs(link)}
                            className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            title="View access logs"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {!link.revoked && (
                            <button
                              onClick={() => handleRevoke(link)}
                              className="px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                              title="Revoke link immediately"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Access Logs Modal */}
      {selectedLinkForLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Access History & Open Logs
                </h3>
                <p className="text-xs text-neutral-500">
                  {selectedLinkForLogs.documentTitle}
                </p>
              </div>
              <button
                onClick={() => setSelectedLinkForLogs(null)}
                className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                Close
              </button>
            </div>

            {logsList.length === 0 ? (
              <p className="text-xs text-neutral-500 py-6 text-center">
                This share link has not been accessed yet.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {logsList.map(log => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 flex items-start justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${log.successful ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {log.successful ? 'Access Granted' : 'Access Blocked'}
                        </span>
                        <span className="text-[11px] text-neutral-400 uppercase font-mono">
                          {log.action}
                        </span>
                      </div>
                      <p className="text-neutral-600 dark:text-neutral-300 text-[11px] mt-0.5">
                        {log.device} · {log.ipLocation}
                      </p>
                    </div>

                    <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Share Link Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-4">
              Create Expiring Share Link
            </h3>

            <form onSubmit={handleCreateLink} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Choose Document to Share
                </label>
                <select
                  value={selectedDocId}
                  onChange={e => setSelectedDocId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {documents.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.category.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Link Expiry Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '1h', label: '1 Hour' },
                    { id: '1d', label: '24 Hours' },
                    { id: '7d', label: '7 Days' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setExpiryOption(opt.id as any)}
                      className={`py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        expiryOption === opt.id
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 block">
                      Require PIN Code
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Viewer must provide PIN before viewing
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enablePin}
                    onChange={e => setEnablePin(e.target.checked)}
                    className="rounded"
                  />
                </div>

                {enablePin && (
                  <div>
                    <input
                      type="text"
                      value={pinCode}
                      onChange={e => setPinCode(e.target.value)}
                      placeholder="Enter 4-digit PIN (e.g. 5928)"
                      maxLength={6}
                      className="w-full px-3 py-2 text-xs font-mono text-center tracking-widest rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 block">
                      Download Permission
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Allow recipient to download raw file
                    </span>
                  </div>
                  <select
                    value={permission}
                    onChange={e => setPermission(e.target.value as any)}
                    className="px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                  >
                    <option value="view">View-Only</option>
                    <option value="download">Download Allowed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 block">
                        Watermark Overlay
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        Overlay diagonal text across preview
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableWatermark}
                      onChange={e => setEnableWatermark(e.target.checked)}
                      className="rounded"
                    />
                  </div>
                  {enableWatermark && (
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={e => setWatermarkText(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Generate Share Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Public Link Simulator Modal */}
      {simulatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Public Share Link Viewer Test
                </h3>
              </div>
              <button
                onClick={() => setSimulatorOpen(false)}
                className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-xs text-neutral-500 font-mono bg-neutral-100 dark:bg-neutral-950 p-2.5 rounded-lg break-all">
                Token: {testTokenInput}
              </div>

              {simError ? (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Access Denied</span>
                  </div>
                  <p className="text-xs leading-relaxed">{simError}</p>
                </div>
              ) : simLink && !simUnlocked ? (
                <form onSubmit={handleSimPinSubmit} className="space-y-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-white">
                    <KeyRound className="w-4 h-4 text-indigo-500" />
                    <span>Protected Document: Enter PIN Code</span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    The owner has secured "{simLink.documentTitle}" with a PIN.
                  </p>
                  <input
                    type="password"
                    value={simPinInput}
                    onChange={e => setSimPinInput(e.target.value)}
                    required
                    placeholder="Enter 4-digit PIN"
                    maxLength={6}
                    className="w-full px-3 py-2 text-center text-sm font-mono tracking-widest rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                  >
                    Unlock & View Document
                  </button>
                </form>
              ) : simDoc && simUnlocked ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                      ✓ Document Verified & Unlocked
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                      Permission: {simLink?.permission}
                    </span>
                  </div>

                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    {simDoc.title} ({simDoc.category.toUpperCase()})
                  </p>

                  <button
                    onClick={() => setSimViewerOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open In-Browser Viewer (with Watermark)</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal for Simulator */}
      {simViewerOpen && simDoc && (
        <DocumentViewerModal
          document={simDoc}
          isOpen={simViewerOpen}
          onClose={() => setSimViewerOpen(false)}
          watermarkText={simLink?.watermarkText}
          allowDownload={simLink?.permission === 'download'}
        />
      )}

    </div>
  );
};
