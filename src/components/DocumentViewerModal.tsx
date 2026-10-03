import React, { useState } from 'react';
import { LockerDocument } from '../types';
import { X, Download, ShieldCheck, Tag, Calendar, FileText, Lock } from 'lucide-react';

interface DocumentViewerModalProps {
  document: LockerDocument | null;
  isOpen: boolean;
  onClose: () => void;
  watermarkText?: string;
  allowDownload?: boolean;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  isOpen,
  onClose,
  watermarkText,
  allowDownload = true,
}) => {
  const [showMetadata, setShowMetadata] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);

  // Reset unlock state when document changes
  React.useEffect(() => {
    if (document) {
      setPinUnlocked(!document.isPinProtected || !document.pinCode);
      setPinInput('');
      setPinError(false);
    }
  }, [document?.id]);

  if (!isOpen || !document) return null;

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (document.pinCode && pinInput === document.pinCode) {
      setPinUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleDownload = () => {
    if (!allowDownload || !pinUnlocked) return;
    const a = window.document.createElement('a');
    a.href = document.dataUrl;
    a.download = document.fileName || `${document.title}.${document.fileType.includes('pdf') ? 'pdf' : 'png'}`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  const isPdf = document.fileType === 'application/pdf';
  const isImage = document.fileType.startsWith('image/');
  const isDocx = document.fileType.includes('word') || document.fileName.endsWith('.docx');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-neutral-950/80 backdrop-blur-xs">
      <div className="relative flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl w-full max-w-5xl h-[90vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {document.title}
              </h3>
              <p className="text-xs text-neutral-500 font-mono tabular-nums">
                {document.fileName} · {(document.fileSize / 1024).toFixed(0)} KB · {document.category.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                showMetadata
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-700'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Info
            </button>

            {allowDownload ? (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
                title="Download verified document file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-lg">
                <Lock className="w-3 h-3" />
                <span>View-only</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-1"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 relative flex overflow-hidden bg-neutral-100 dark:bg-neutral-950">
          
          {/* Main Document Viewer Canvas */}
          <div className="flex-1 relative flex items-center justify-center p-4 overflow-auto">
            
            {!pinUnlocked ? (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-lg space-y-4 animate-in fade-in duration-200">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    PIN Protected Document
                  </h4>
                  <p className="text-xs text-neutral-500 mt-1">
                    Enter the document PIN set during upload to unlock and preview.
                  </p>
                </div>

                <form onSubmit={handleUnlockPin} className="space-y-3">
                  <input
                    type="password"
                    value={pinInput}
                    onChange={e => {
                      setPinInput(e.target.value);
                      setPinError(false);
                    }}
                    placeholder="Enter Document PIN"
                    maxLength={6}
                    autoFocus
                    className="w-full px-3 py-2 text-center text-sm font-mono tracking-widest rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  {pinError && (
                    <p className="text-xs text-rose-500 font-medium">
                      Incorrect PIN. Please try again.
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
                  >
                    Unlock & View Document
                  </button>
                </form>
              </div>
            ) : (
              <>
                {/* Watermark Overlay if specified */}
                {watermarkText && (
                  <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden">
                    <div className="transform -rotate-30 select-none text-center">
                      <p className="text-3xl sm:text-5xl font-extrabold uppercase tracking-widest text-rose-500/25 dark:text-rose-400/25 border-4 border-dashed border-rose-500/20 px-8 py-4 rounded-xl">
                        {watermarkText}
                      </p>
                      <p className="text-xs font-mono uppercase text-rose-500/30 dark:text-rose-400/30 mt-2">
                        Verified Digital Share · Confidential
                      </p>
                    </div>
                  </div>
                )}

                {isPdf && (
                  <iframe
                    src={document.dataUrl}
                    title={document.title}
                    className="w-full h-full rounded border border-neutral-200 dark:border-neutral-800 bg-white"
                  />
                )}

                {isImage && (
                  <div className="max-w-full max-h-full flex items-center justify-center">
                    <img
                      src={document.dataUrl}
                      alt={document.title}
                      className="max-h-[75vh] max-w-full object-contain rounded shadow-md border border-neutral-200 dark:border-neutral-800 bg-white"
                    />
                  </div>
                )}

                {isDocx && (
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 max-w-xl text-center shadow-md">
                    <FileText className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                    <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                      Microsoft Word Document (.docx)
                    </h4>
                    <p className="text-xs text-neutral-500 mb-6">
                      {document.title} · {(document.fileSize / 1024).toFixed(0)} KB
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-6">
                      This Word document is encrypted and verified in your private locker storage. Download the original file or convert it to PDF via the PDF Toolkit tab.
                    </p>
                    {allowDownload && (
                      <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Original DOCX</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Collapsible Metadata Drawer */}
          {showMetadata && (
            <div className="w-80 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 overflow-y-auto shrink-0 text-xs text-neutral-600 dark:text-neutral-300 space-y-4">
              <div>
                <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm mb-1">
                  Document Details
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Integrity & locker registry attributes
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <span className="text-[11px] text-neutral-400 block mb-0.5">Category</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
                    {document.category}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-neutral-400 block mb-0.5">Issue Date</span>
                  <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="font-mono">{document.issueDate}</span>
                  </div>
                </div>

                {document.expiryDate && (
                  <div>
                    <span className="text-[11px] text-neutral-400 block mb-0.5">Expiry Date</span>
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="font-mono">{document.expiryDate}</span>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-[11px] text-neutral-400 block mb-0.5">File Size</span>
                  <span className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
                    {(document.fileSize / 1024).toFixed(1)} KB ({document.fileSize.toLocaleString()} bytes)
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-neutral-400 block mb-1">Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {document.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[11px] text-neutral-600 dark:text-neutral-400"
                      >
                        <Tag className="w-3 h-3 text-neutral-400" />
                        <span>#{tag}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {document.fileHash && (
                  <div>
                    <span className="text-[11px] text-neutral-400 block mb-0.5">SHA-256 Checksum</span>
                    <p className="font-mono text-[10px] break-all bg-neutral-100 dark:bg-neutral-800 p-2 rounded text-neutral-700 dark:text-neutral-300">
                      {document.fileHash}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Verified Owner Access Only</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
