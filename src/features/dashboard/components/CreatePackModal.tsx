import React, { useState } from 'react';
import { UserAccount, LockerDocument, ApplicationPack } from '../../../types';
import { APPLICATION_PACK_DEFINITIONS, bundleApplicationPack } from '../services/packBundler';
import { saveDocument } from '../../../services/db';
import { Briefcase, Award, GraduationCap, Plus, Check, Loader2, X, FileText, Download } from 'lucide-react';
import { useToast } from '../../../components/Toast';

interface CreatePackModalProps {
  user: UserAccount;
  documents: LockerDocument[];
  isOpen: boolean;
  onClose: () => void;
  onPackCreated: () => void;
  onOpenDashboardPacks: () => void;
}

export const CreatePackModal: React.FC<CreatePackModalProps> = ({
  user,
  documents,
  isOpen,
  onClose,
  onPackCreated,
  onOpenDashboardPacks,
}) => {
  const { toast } = useToast();
  const [packType, setPackType] = useState<'internship' | 'scholarship' | 'placement' | 'custom'>('internship');
  const [customTitle, setCustomTitle] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [bundling, setBundling] = useState(false);

  if (!isOpen) return null;

  const toggleDoc = (id: string) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBundleNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setBundling(true);

    try {
      const activePack = packType === 'custom'
        ? {
            type: 'internship' as any,
            title: customTitle.trim() || 'Custom Student Dossier',
            description: 'Custom bundled application pack from student digital locker',
            items: selectedDocIds.map((id, idx) => {
              const doc = documents.find(d => d.id === id);
              return {
                id: `c_${idx}`,
                name: doc?.title || 'Document',
                category: doc?.category || 'other',
                description: 'Included document',
                required: true,
              };
            }),
          }
        : APPLICATION_PACK_DEFINITIONS[packType];

      const docsToBundle = packType === 'custom'
        ? documents.filter(d => selectedDocIds.includes(d.id))
        : documents;

      const result = await bundleApplicationPack(activePack, user, docsToBundle);

      // Save to locker
      const newDoc: LockerDocument = {
        id: 'doc_pack_' + Math.random().toString(36).substring(2, 9),
        userId: user.id,
        title: `${activePack.title} - Official Dossier`,
        category: 'project',
        fileName: `${activePack.title.replace(/\s+/g, '_')}_${user.rollNumber}.pdf`,
        fileType: 'application/pdf',
        fileSize: result.size,
        dataUrl: result.dataUrl,
        issueDate: new Date().toISOString().split('T')[0],
        tags: ['application_pack', packType, 'bundle'],
        createdByTool: true,
        uploadedAt: new Date().toISOString(),
        deletedAt: null,
      };

      await saveDocument(newDoc);
      onPackCreated();

      toast({
        type: 'success',
        title: 'Application Pack Dossier Ready',
        message: `Compiled ${result.docCount} verified documents into ${newDoc.fileName}.`,
      });

      onClose();
      onOpenDashboardPacks();
    } catch (err: any) {
      console.error('Pack compilation error:', err);
      toast({ type: 'error', title: 'Bundle Failed', message: err?.message || 'Could not compile pack.' });
    } finally {
      setBundling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Create Application Pack
              </h3>
              <p className="text-xs text-neutral-500">
                Bundle verified credentials into a single certified dossier
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleBundleNow} className="space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Choose Application Dossier Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'internship', label: 'Internship Pack', icon: Briefcase },
                { id: 'scholarship', label: 'Scholarship Pack', icon: Award },
                { id: 'placement', label: 'Placement Dossier', icon: GraduationCap },
                { id: 'custom', label: 'Custom Selection', icon: Plus },
              ].map(opt => {
                const Icon = opt.icon;
                const isSel = packType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPackType(opt.id as any)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      isSel
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {packType === 'custom' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Custom Dossier Title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                placeholder="e.g. Master's Admissions Dossier, Visa Verification"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
              />
            </div>
          )}

          {/* Select documents from locker */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Included Locker Documents ({packType === 'custom' ? selectedDocIds.length : 'Auto-Checked'})
            </label>

            <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40">
              {documents.map(doc => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDoc(doc.id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate">{doc.title}</span>
                      <span className="text-[10px] font-mono uppercase text-neutral-400">[{doc.category}]</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={bundling}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50"
            >
              {bundling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compiling Dossier PDF...</span>
                </>
              ) : (
                <span>Bundle Dossier PDF Now</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
