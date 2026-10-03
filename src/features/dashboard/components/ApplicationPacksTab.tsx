import React, { useState } from 'react';
import { ApplicationPack, LockerDocument, UserAccount } from '../../../types';
import {
  APPLICATION_PACK_DEFINITIONS,
  evaluatePackReadiness,
  bundleApplicationPack,
} from '../services/packBundler';
import { saveDocument } from '../../../services/db';
import {
  Briefcase,
  GraduationCap,
  Award,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Save,
  Loader2,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { DocumentViewerModal } from '../../../components/DocumentViewerModal';

interface ApplicationPacksTabProps {
  user: UserAccount;
  documents: LockerDocument[];
  onDocumentAdded: () => void;
  onNavigateToUpload: () => void;
}

export const ApplicationPacksTab: React.FC<ApplicationPacksTabProps> = ({
  user,
  documents,
  onDocumentAdded,
  onNavigateToUpload,
}) => {
  const { toast } = useToast();
  const [selectedPackKey, setSelectedPackKey] = useState<'internship' | 'scholarship' | 'placement'>('internship');
  const [bundling, setBundling] = useState(false);
  const [bundledResult, setBundledResult] = useState<{
    dataUrl: string;
    size: number;
    title: string;
    pageCount: number;
  } | null>(null);

  const [previewDoc, setPreviewDoc] = useState<LockerDocument | null>(null);

  const currentPack = APPLICATION_PACK_DEFINITIONS[selectedPackKey];
  const evaluation = evaluatePackReadiness(currentPack, documents);

  const handleBundlePack = async () => {
    setBundling(true);
    setBundledResult(null);

    try {
      const result = await bundleApplicationPack(currentPack, user, documents);
      setBundledResult({
        dataUrl: result.dataUrl,
        size: result.size,
        title: `${currentPack.title.replace(/\s+/g, '_')}_Dossier_${user.rollNumber}.pdf`,
        pageCount: result.pageCount,
      });

      toast({
        type: 'success',
        title: 'Application Dossier Compiled',
        message: `Successfully bundled ${result.docCount} certified documents into a single PDF.`,
      });
    } catch (err: any) {
      console.error('Error bundling pack:', err);
      toast({
        type: 'error',
        title: 'Bundle Failed',
        message: err?.message || 'Could not compile application pack.',
      });
    } finally {
      setBundling(false);
    }
  };

  const handleSaveDossierToLocker = async () => {
    if (!bundledResult) return;
    const doc: LockerDocument = {
      id: 'doc_pack_' + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      title: `${currentPack.title} - Official Dossier`,
      category: 'project',
      fileName: bundledResult.title,
      fileType: 'application/pdf',
      fileSize: bundledResult.size,
      dataUrl: bundledResult.dataUrl,
      issueDate: new Date().toISOString().split('T')[0],
      tags: ['pack_dossier', selectedPackKey, 'certified_bundle'],
      createdByTool: true,
      uploadedAt: new Date().toISOString(),
      deletedAt: null,
    };

    await saveDocument(doc);
    onDocumentAdded();
    toast({
      type: 'success',
      title: 'Dossier Saved to Locker',
      message: 'Added to your locker documents as an active application dossier.',
    });
  };

  const handleDownloadDossier = () => {
    if (!bundledResult) return;
    const a = document.createElement('a');
    a.href = bundledResult.dataUrl;
    a.download = bundledResult.title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const packTabs: { id: 'internship' | 'scholarship' | 'placement'; label: string; icon: any }[] = [
    { id: 'internship', label: 'Internship Pack', icon: Briefcase },
    { id: 'scholarship', label: 'Scholarship Pack', icon: Award },
    { id: 'placement', label: 'Placement Dossier', icon: GraduationCap },
  ];

  return (
    <div className="space-y-6">
      
      {/* Pack Selection Tabs */}
      <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl max-w-xl">
        {packTabs.map(tab => {
          const Icon = tab.icon;
          const isSelected = selectedPackKey === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedPackKey(tab.id);
                setBundledResult(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
                isSelected
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Pack Details & Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Requirements Checklist */}
        <div className="lg:col-span-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {currentPack.title}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {currentPack.description}
              </p>
            </div>

            {/* Ready Score Counter */}
            <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-950 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <div className="text-right">
                <span className="text-[11px] text-neutral-400 block font-medium">Ready Score</span>
                <span className="text-sm font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
                  {evaluation.readyCount} of {evaluation.totalRequired} Ready
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {evaluation.scorePercentage}%
              </div>
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Document Checklist Requirements
            </h3>

            <div className="space-y-2.5">
              {evaluation.itemsWithStatus.map((itemStatus, idx) => {
                const { item, matchedDoc, isReady } = itemStatus;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isReady
                        ? 'bg-neutral-50/50 dark:bg-neutral-950/40 border-neutral-200 dark:border-neutral-800'
                        : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {isReady ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-500" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-mono uppercase text-neutral-400">
                            [{item.category}]
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {item.description}
                        </p>

                        {matchedDoc ? (
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                            <FileText className="w-3.5 h-3.5" />
                            <span className="truncate">Matched: {matchedDoc.title}</span>
                          </div>
                        ) : (
                          <span className="inline-block mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            Missing from locker
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="self-end sm:self-center shrink-0">
                      {matchedDoc ? (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(matchedDoc)}
                          className="px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md hover:bg-neutral-50 transition-colors"
                        >
                          Preview
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onNavigateToUpload}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 rounded-md hover:underline"
                        >
                          + Upload Missing
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Pack Preparation & Bundle Generator */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs flex-1 flex flex-col justify-between space-y-6">
            
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white pb-2 border-b border-neutral-100 dark:border-neutral-800">
                1-Click Bundle Generator
              </h3>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                The bundle engine merges your applicant credentials, cover sheet, verified table of contents, and all matching locker documents into a certified single-file PDF ready for HR submission.
              </p>

              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-500">
                  <span>Applicant:</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">{user.name}</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>Roll Number:</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200">{user.rollNumber}</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>Cover Sheet:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Included with Seal</span>
                </div>
              </div>

              {/* Bundled Output Summary */}
              {bundledResult && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dossier Compiled Successfully</span>
                  </div>
                  <p className="text-emerald-700 dark:text-emerald-400 truncate">
                    {bundledResult.title}
                  </p>
                  <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-500">
                    {bundledResult.pageCount} pages · {(bundledResult.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2.5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={handleBundlePack}
                disabled={bundling}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {bundling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compiling Pack into PDF...</span>
                  </>
                ) : (
                  <span>Prepare & Bundle Application Dossier</span>
                )}
              </button>

              {bundledResult && (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadDossier}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Bundled Dossier</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDossierToLocker}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 rounded-lg transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Copy to Locker Vault</span>
                  </button>
                </>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Preview modal for existing item */}
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
