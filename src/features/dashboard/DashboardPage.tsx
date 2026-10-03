import React, { useState, useEffect, useMemo } from 'react';
import { ActivePage, DashboardTab, DocumentCategory, LockerDocument, UserAccount } from '../../types';
import {
  getActiveDocuments,
  getRecycleBinDocuments,
  moveToRecycleBin,
  restoreFromRecycleBin,
  deletePermanently,
  emptyRecycleBin,
  getStorageUsage,
  getCategories,
} from '../../services/db';
import { ApplicationPacksTab } from './components/ApplicationPacksTab';
import { PdfToolkitTab } from './components/PdfToolkitTab';
import { CategoryManagementTab } from './components/CategoryManagementTab';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';
import {
  FileText,
  Search,
  Filter,
  Trash2,
  Share2,
  Download,
  Eye,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  Briefcase,
  Wrench,
  CheckCircle2,
  HardDrive,
  Calendar,
  Tag,
  ShieldAlert,
  ArrowRight,
  Plus,
  FolderPlus,
  Lock,
} from 'lucide-react';
import { useToast } from '../../components/Toast';

interface DashboardPageProps {
  user: UserAccount;
  setActivePage: (page: ActivePage) => void;
  onOpenPanicModal: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  setActivePage,
  onOpenPanicModal,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<DashboardTab>('documents');
  
  // Data lists
  const [documents, setDocuments] = useState<LockerDocument[]>([]);
  const [recycleDocs, setRecycleDocs] = useState<LockerDocument[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [storage, setStorage] = useState<{ usedBytes: number; quotaBytes: number; percentage: number; docCount: number }>({
    usedBytes: 0,
    quotaBytes: 100 * 1024 * 1024,
    percentage: 0,
    docCount: 0,
  });

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<LockerDocument | null>(null);

  useEffect(() => {
    loadLockerData();
  }, [user.id]);

  const loadLockerData = async () => {
    const active = await getActiveDocuments(user.id);
    const recycled = await getRecycleBinDocuments(user.id);
    const storageUsage = await getStorageUsage(user.id);
    const cats = await getCategories(user.id);
    setDocuments(active);
    setRecycleDocs(recycled);
    setStorage(storageUsage);
    setCategoriesList(cats);
  };

  // Expiry reminders: Documents expiring within 30 days or already expired
  const expiringDocs = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    return documents.filter(doc => {
      if (!doc.expiryDate) return false;
      const exp = new Date(doc.expiryDate);
      return exp <= thirtyDaysFromNow;
    });
  }, [documents]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        doc.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || doc.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, selectedCategory]);

  // Actions
  const handleDeleteToBin = async (doc: LockerDocument) => {
    if (!confirm(`Move "${doc.title}" to Recycle Bin? It will be kept for 30 days before permanent deletion.`)) return;
    await moveToRecycleBin(doc.id, user.id);
    await loadLockerData();
    toast({
      type: 'info',
      title: 'Moved to Recycle Bin',
      message: `"${doc.title}" can be restored anytime within 30 days.`,
    });
  };

  const handleRestoreDoc = async (doc: LockerDocument) => {
    await restoreFromRecycleBin(doc.id, user.id);
    await loadLockerData();
    toast({
      type: 'success',
      title: 'Document Restored',
      message: `"${doc.title}" has been restored to your active locker.`,
    });
  };

  const handleDeleteForever = async (doc: LockerDocument) => {
    if (!confirm(`Permanently delete "${doc.title}"? This cannot be undone.`)) return;
    await deletePermanently(doc.id, user.id);
    await loadLockerData();
    toast({
      type: 'error',
      title: 'Permanently Deleted',
      message: `"${doc.title}" removed from storage.`,
    });
  };

  const handleEmptyBin = async () => {
    if (!confirm(`Permanently delete all ${recycleDocs.length} items from Recycle Bin?`)) return;
    await emptyRecycleBin(user.id);
    await loadLockerData();
    toast({
      type: 'info',
      title: 'Recycle Bin Emptied',
      message: 'All trashed documents purged.',
    });
  };

  const handleDownload = (doc: LockerDocument) => {
    const a = document.createElement('a');
    a.href = doc.dataUrl;
    a.download = doc.fileName || `${doc.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const categoryFilters = useMemo(() => {
    const defaultList = [{ id: 'all', label: 'All Documents' }];
    if (expiringDocs.length > 0) {
      defaultList.push({ id: 'expiring', label: `Expiring Soon (${expiringDocs.length})` });
    }
    const customOrStandard = categoriesList.map(c => ({
      id: c.id,
      label: c.name,
    }));
    return [...defaultList, ...customOrStandard];
  }, [categoriesList, expiringDocs.length]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* Dashboard Main Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto pb-px">
        {[
          { id: 'packs', label: 'Application Packs', icon: Briefcase },
          { id: 'toolkit', label: 'PDF Toolkit', icon: Wrench },
          { id: 'categories', label: 'Categories', icon: Tag },
          { id: 'recycle', label: 'Recycle Bin', icon: Trash2 },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(activeTab === tab.id ? 'documents' : tab.id as DashboardTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400'}`} />
              {tab.label}
            </button>
          );
        })}

        {activeTab !== 'documents' && (
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className="ml-auto text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1"
          >
            ← Back to Documents
          </button>
        )}
      </div>

      {/* TAB 1: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-5">
          
          {/* Search Bar & Category Filters & Quick Upload */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, tag or category..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Interactive Filter Controls + Add Category */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/70 rounded-xl overflow-x-auto">
                {categoryFilters.map(filter => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setSelectedCategory(filter.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      selectedCategory === filter.id
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('categories')}
                className="px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1"
                title="Manage categories"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                Categories
              </button>
            </div>

          </div>

          {/* Documents Table / Grid */}
          {filteredDocs.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3">
              <FileText className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto" />
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                {searchQuery || selectedCategory !== 'all' ? 'No matching documents found' : 'Your locker is empty'}
              </p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try clearing your search query or choosing another category filter.'
                  : 'Upload your student ID, transcripts, and certificates for instant safe keeping.'}
              </p>
              <button
                onClick={() => setActivePage('upload')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload First Document</span>
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-950/40 text-neutral-500 font-medium border-b border-neutral-100 dark:border-neutral-800">
                    <tr>
                      <th className="px-5 py-3">Document Title</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Issue Date</th>
                      <th className="px-4 py-3">Tags & Origin</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                    {filteredDocs.map(doc => {
                      const isExpiring = doc.expiryDate && new Date(doc.expiryDate) <= new Date(Date.now() + 30 * 86400000);

                      return (
                        <tr
                          key={doc.id}
                          className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors group"
                        >
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                              <span className="truncate max-w-xs">{doc.title}</span>
                              {doc.isPinProtected && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-mono" title="PIN Protected Document">
                                  <Lock className="w-3 h-3" />
                                  <span>PIN</span>
                                </span>
                              )}
                              {doc.createdByTool && (
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                                  [Toolkit]
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono mt-0.5 truncate max-w-xs">
                              {doc.fileName}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 uppercase font-medium text-[11px] text-neutral-600 dark:text-neutral-300">
                            {doc.category}
                          </td>

                          <td className="px-4 py-3.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                            <div>{doc.issueDate}</div>
                            {doc.expiryDate && (
                              <div className={`text-[10px] mt-0.5 ${isExpiring ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-neutral-400'}`}>
                                Exp: {doc.expiryDate} {isExpiring && '(Soon)'}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {doc.tags.map(t => (
                                <span
                                  key={t}
                                  className="text-[11px] text-neutral-500 font-mono"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 font-mono tabular-nums text-[11px] text-neutral-500">
                            {(doc.fileSize / 1024).toFixed(0)} KB
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setPreviewDoc(doc)}
                                className="p-1.5 text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                                title="View preview in browser"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDownload(doc)}
                                className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                                title="Download document"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setActivePage('share')}
                                className="p-1.5 text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                                title="Create share link"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteToBin(doc)}
                                className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                                title="Delete document (move to Recycle Bin)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: APPLICATION PACKS */}
      {activeTab === 'packs' && (
        <ApplicationPacksTab
          user={user}
          documents={documents}
          onDocumentAdded={loadLockerData}
          onNavigateToUpload={() => setActivePage('upload')}
        />
      )}

      {/* TAB 3: PDF TOOLKIT */}
      {activeTab === 'toolkit' && (
        <PdfToolkitTab
          user={user}
          lockerDocuments={documents}
          onDocumentCreated={loadLockerData}
        />
      )}

      {/* TAB 4: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <CategoryManagementTab
          user={user}
          onFilterCategory={(catId) => {
            setSelectedCategory(catId);
            setActiveTab('documents');
          }}
        />
      )}

      {/* TAB 5: RECYCLE BIN */}
      {activeTab === 'recycle' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Recycle Bin (30-Day Retention)
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Deleted files remain safely recoverable for 30 days before permanent automatic shredding.
              </p>
            </div>

            {recycleDocs.length > 0 && (
              <button
                onClick={handleEmptyBin}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-lg hover:bg-rose-100 transition-colors"
              >
                Empty Recycle Bin
              </button>
            )}
          </div>

          {recycleDocs.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400 space-y-2">
              <Trash2 className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto" />
              <p>Recycle bin is empty. No deleted documents pending purge.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {recycleDocs.map(doc => {
                const deletedDate = doc.deletedAt ? new Date(doc.deletedAt) : new Date();
                const daysRemaining = Math.max(0, 30 - Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 86400)));

                return (
                  <div
                    key={doc.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {doc.title}
                      </h4>
                      <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                        {doc.fileName} · {(doc.fileSize / 1024).toFixed(0)} KB · {daysRemaining} days left until permanent wipe
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleRestoreDoc(doc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-lg hover:bg-emerald-100 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore to Locker</span>
                      </button>

                      <button
                        onClick={() => handleDeleteForever(doc)}
                        className="px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        Delete Forever
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* In-Browser Document Preview Modal */}
      {previewDoc && (
        <DocumentViewerModal
          document={previewDoc}
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          allowDownload={true}
        />
      )}

    </div>
  );
};
