import React, { useState, useRef, useEffect } from 'react';
import {
  Sliders,
  Layers,
  Scissors,
  RotateCw,
  Sparkles,
  PenTool,
  KeyRound,
  FilePlus,
  ScanText,
  Camera,
  X,
  Plus,
  Trash2,
  Check,
  Loader2,
  Copy,
  Download,
  AlertCircle,
  FileText,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  mergeDocuments,
  extractPages,
  rotatePages,
  addWatermarkToPdf,
  applySignatureToPdf,
  convertImagesToPdf,
  compressImageToTargetSize,
  applyPasswordProtection,
} from '../services/pdfToolkit';
import { performClientOCR, OCRResult } from '../services/ocr';

export type PdfToolType =
  | 'compress'
  | 'merge'
  | 'extract'
  | 'rotate'
  | 'watermark'
  | 'signature'
  | 'protect'
  | 'img2pdf'
  | 'ocr'
  | 'camera';

export interface PdfToolModalProps {
  tool: PdfToolType | null;
  onClose: () => void;
  currentDocument?: {
    title: string;
    fileDataUrl: string;
    fileType: string;
    originalSize?: number;
  } | null;
  onApplyResult: (result: {
    dataUrl: string;
    title?: string;
    fileType?: string;
    size?: number;
    metadata?: {
      watermarkApplied?: boolean;
      watermarkText?: string;
      passwordProtected?: boolean;
      password?: string;
      extractedText?: string;
      rotation?: number;
    };
  }) => void;
}

const PRESET_SIZE_LIMITS = [
  { sizeKb: 200, label: 'State & Central Portals (Strict)', desc: 'Max 200 KB' },
  { sizeKb: 500, label: 'Standard University Portals', desc: 'Max 500 KB' },
  { sizeKb: 1024, label: 'Standard Document (1 MB)', desc: '1024 KB' },
  { sizeKb: 2048, label: 'High Quality Scan (2 MB)', desc: '2048 KB' },
  { sizeKb: 5120, label: 'Multi-Page Dossier (5 MB)', desc: '5120 KB' },
];

export const PdfToolModal: React.FC<PdfToolModalProps> = ({
  tool,
  onClose,
  currentDocument,
  onApplyResult,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compress State
  const [targetKb, setTargetKb] = useState<number>(500);
  const [customKb, setCustomKb] = useState<string>('');
  const [compressedResult, setCompressedResult] = useState<{
    dataUrl: string;
    size: number;
    ratio: string;
  } | null>(null);

  // Merge State
  const [mergeFiles, setMergeFiles] = useState<
    { id: string; name: string; type: string; dataUrl: string; size: number }[]
  >([]);
  const mergeInputRef = useRef<HTMLInputElement>(null);

  // Split / Extract State
  const [pageRange, setPageRange] = useState<string>('1');

  // Rotate State
  const [rotationDegrees, setRotationDegrees] = useState<90 | 180 | 270>(90);

  // Watermark State
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL - APPLICATION ONLY');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(30);

  // Signature State
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [isDrawingSig, setIsDrawingSig] = useState(false);

  // Password Protect State
  const [docPassword, setDocPassword] = useState<string>('');
  const [confirmDocPassword, setConfirmDocPassword] = useState<string>('');

  // Img to PDF State
  const [imageFiles, setImageFiles] = useState<
    { id: string; name: string; dataUrl: string; size: number }[]
  >([]);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // OCR State
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // CamScanner Camera State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFilter, setCameraFilter] = useState<'magic' | 'bw' | 'grayscale' | 'none'>('magic');
  const [capturedPages, setCapturedPages] = useState<{ id: string; dataUrl: string }[]>([]);

  // Reset errors on tool change
  useEffect(() => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setCompressedResult(null);
    setOcrResult(null);
  }, [tool]);

  // Clean up camera on unmount or tool change
  useEffect(() => {
    if (tool !== 'camera' && cameraActive) {
      stopCamera();
    }
  }, [tool]);

  if (!tool) return null;

  // SIGNATURE CANVAS LOGIC
  const startDrawingSig = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawingSig(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const drawSig = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawingSig = () => {
    setIsDrawingSig(false);
  };

  const clearSig = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // CAMERA SCANNER LOGIC
  const startCamera = async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      setErrorMsg('Camera access denied or not available. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply CamScanner contrast filters
    if (cameraFilter === 'magic') {
      ctx.filter = 'contrast(1.4) brightness(1.05) saturate(1.1)';
    } else if (cameraFilter === 'bw') {
      ctx.filter = 'grayscale(100%) contrast(2.2) brightness(1.1)';
    } else if (cameraFilter === 'grayscale') {
      ctx.filter = 'grayscale(100%) contrast(1.2)';
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPages(prev => [...prev, { id: 'scan_' + Date.now(), dataUrl }]);
  };

  // ACTION HANDLERS
  const handleApplyCompress = async () => {
    const src = currentDocument?.fileDataUrl;
    if (!src) {
      setErrorMsg('Please upload or select a document first.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const chosenKb = customKb ? parseInt(customKb, 10) : targetKb;
      if (!chosenKb || chosenKb <= 0) {
        throw new Error('Please select or specify a valid target size in KB.');
      }
      const res = await compressImageToTargetSize(src, chosenKb * 1024);
      setCompressedResult({
        dataUrl: res.dataUrl,
        size: res.compressedSize,
        ratio: res.ratio,
      });
      onApplyResult({
        dataUrl: res.dataUrl,
        size: res.compressedSize,
      });
      setSuccessMsg(`Successfully compressed to ${(res.compressedSize / 1024).toFixed(0)} KB (${res.ratio}).`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Compression failed. Please try a different target size.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyMerge = async () => {
    const allItems: { dataUrl: string; type: string; title: string }[] = [];
    if (currentDocument?.fileDataUrl) {
      allItems.push({
        dataUrl: currentDocument.fileDataUrl,
        type: currentDocument.fileType || 'application/pdf',
        title: currentDocument.title || 'Primary Document',
      });
    }
    mergeFiles.forEach(f => {
      allItems.push({
        dataUrl: f.dataUrl,
        type: f.type,
        title: f.name,
      });
    });

    if (allItems.length < 2) {
      setErrorMsg('Please add at least 2 files to merge.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await mergeDocuments(allItems);
      onApplyResult({
        dataUrl: res.dataUrl,
        fileType: 'application/pdf',
        size: res.size,
      });
      setSuccessMsg(`Merged ${allItems.length} files into single PDF (${res.pageCount} pages).`);
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to merge files.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyExtract = async () => {
    const src = currentDocument?.fileDataUrl;
    if (!src) {
      setErrorMsg('No PDF document loaded.');
      return;
    }
    if (!pageRange.trim()) {
      setErrorMsg('Please specify page range e.g. 1-2, 4');
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await extractPages(src, pageRange.trim());
      onApplyResult({
        dataUrl: res.dataUrl,
        fileType: 'application/pdf',
        size: res.size,
      });
      setSuccessMsg(`Extracted ${res.pageCount} page(s) successfully.`);
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to extract pages. Verify page numbers.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyRotate = async () => {
    const src = currentDocument?.fileDataUrl;
    if (!src) {
      setErrorMsg('No document loaded to rotate.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await rotatePages(src, rotationDegrees);
      onApplyResult({
        dataUrl: res.dataUrl,
        size: res.size,
        metadata: { rotation: rotationDegrees },
      });
      setSuccessMsg(`Rotated document by ${rotationDegrees}°.`);
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to rotate document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyWatermark = async () => {
    const src = currentDocument?.fileDataUrl;
    if (!src) {
      setErrorMsg('No document loaded.');
      return;
    }
    if (!watermarkText.trim()) {
      setErrorMsg('Watermark text cannot be empty.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await addWatermarkToPdf(src, watermarkText.trim(), { opacity: watermarkOpacity / 100 });
      onApplyResult({
        dataUrl: res.dataUrl,
        size: res.size,
        metadata: { watermarkApplied: true, watermarkText: watermarkText.trim() },
      });
      setSuccessMsg('Watermark stamped onto document.');
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to apply watermark.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplySignature = async () => {
    const src = currentDocument?.fileDataUrl;
    const canvas = sigCanvasRef.current;
    if (!src || !canvas || !hasSignature) {
      setErrorMsg('Please draw your signature on the pad.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const sigDataUrl = canvas.toDataURL('image/png');
      const res = await applySignatureToPdf(src, sigDataUrl, 1, { xPercent: 65, yPercent: 15, widthPercent: 25 });
      onApplyResult({
        dataUrl: res.dataUrl,
        size: res.size,
      });
      setSuccessMsg('Digital signature successfully stamped onto document.');
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to stamp signature.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyPassword = async () => {
    const src = currentDocument?.fileDataUrl;
    if (!src) {
      setErrorMsg('No document loaded.');
      return;
    }
    if (!docPassword || docPassword.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }
    if (docPassword !== confirmDocPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await applyPasswordProtection(src, docPassword);
      onApplyResult({
        dataUrl: res.dataUrl,
        size: res.size,
        metadata: { passwordProtected: true, password: docPassword },
      });
      setSuccessMsg('Document successfully encrypted with password protection.');
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to encrypt document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyImg2Pdf = async () => {
    const allImages: { dataUrl: string; title: string }[] = [];
    if (currentDocument?.fileDataUrl && currentDocument.fileType?.startsWith('image/')) {
      allImages.push({
        dataUrl: currentDocument.fileDataUrl,
        title: currentDocument.title || 'Image 1',
      });
    }
    imageFiles.forEach((img, idx) => {
      allImages.push({
        dataUrl: img.dataUrl,
        title: img.name || `Photo ${idx + 1}`,
      });
    });

    if (allImages.length === 0) {
      setErrorMsg('Please add at least one photo to convert to PDF.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await convertImagesToPdf(allImages);
      onApplyResult({
        dataUrl: res.dataUrl,
        fileType: 'application/pdf',
        title: currentDocument?.title || 'Photo_Dossier.pdf',
        size: res.size,
      });
      setSuccessMsg(`Compiled ${allImages.length} image(s) into standard PDF.`);
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to convert images to PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunOCR = async () => {
    const src = currentDocument?.fileDataUrl;
    if (!src) {
      setErrorMsg('No document loaded for text recognition.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await performClientOCR(src);
      setOcrResult(res);
      onApplyResult({
        dataUrl: src,
        metadata: { extractedText: res.text },
      });
      setSuccessMsg(`Extracted ${res.text.split(' ').length} words.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'OCR extraction failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyCameraScans = async () => {
    if (capturedPages.length === 0) {
      setErrorMsg('Please capture at least one page with the camera.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await convertImagesToPdf(
        capturedPages.map((p, i) => ({ dataUrl: p.dataUrl, title: `Scanned_Page_${i + 1}` }))
      );
      stopCamera();
      onApplyResult({
        dataUrl: res.dataUrl,
        fileType: 'application/pdf',
        title: 'Camera_Scanned_Document.pdf',
        size: res.size,
      });
      setSuccessMsg(`Compiled ${capturedPages.length} scanned page(s) into PDF.`);
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to compile camera scans.');
    } finally {
      setIsProcessing(false);
    }
  };

  // TOOL METADATA MAP
  const toolInfoMap: Record<
    PdfToolType,
    { title: string; subtitle: string; icon: React.ReactNode; color: string }
  > = {
    compress: {
      title: 'Compress Document',
      subtitle: 'Shrink file size to meet strict application portal limits (e.g. 200 KB)',
      icon: <Sliders className="w-5 h-5" />,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
    },
    merge: {
      title: 'Merge Files into PDF',
      subtitle: 'Combine multiple PDFs and photos into one unified application dossier',
      icon: <Layers className="w-5 h-5" />,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60',
    },
    extract: {
      title: 'Split & Extract Pages',
      subtitle: 'Extract specific pages or page ranges from this document',
      icon: <Scissors className="w-5 h-5" />,
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60',
    },
    rotate: {
      title: 'Rotate Document Pages',
      subtitle: 'Correct orientation for sideways or inverted document scans',
      icon: <RotateCw className="w-5 h-5" />,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
    },
    watermark: {
      title: 'Add Watermark Overlay',
      subtitle: 'Protect your identity with a diagonal verification watermark stamp',
      icon: <Sparkles className="w-5 h-5" />,
      color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60',
    },
    signature: {
      title: 'Digital Signature Stamp',
      subtitle: 'Draw your signature on the pad and stamp it onto the document',
      icon: <PenTool className="w-5 h-5" />,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
    },
    protect: {
      title: 'Password & Encryption Lock',
      subtitle: 'Encrypt this file with a custom password passcode',
      icon: <KeyRound className="w-5 h-5" />,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
    },
    img2pdf: {
      title: 'Images to PDF Converter',
      subtitle: 'Convert multi-photo certificates or marksheet photos into a single PDF',
      icon: <FilePlus className="w-5 h-5" />,
      color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60',
    },
    ocr: {
      title: 'OCR Text Recognition',
      subtitle: 'Scan and extract selectable text, roll numbers, and dates from images',
      icon: <ScanText className="w-5 h-5" />,
      color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60',
    },
    camera: {
      title: 'CamScanner Document Camera',
      subtitle: 'Capture multi-page documents with automatic contrast enhancement',
      icon: <Camera className="w-5 h-5" />,
      color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60',
    },
  };

  const info = toolInfoMap[tool];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800/90 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        
        {/* POPUP HEADER */}
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${info.color}`}>
              {info.icon}
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                {info.title}
              </h3>
              <p className="text-[11px] text-neutral-500 line-clamp-1">
                {info.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* POPUP BODY */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Status banners */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-start gap-2 font-medium">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. COMPRESS TOOL */}
          {tool === 'compress' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">Current File Size:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {currentDocument?.originalSize ? `${(currentDocument.originalSize / 1024).toFixed(0)} KB` : 'Detected upon selection'}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Select Target Portal Size Limit:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRESET_SIZE_LIMITS.map(preset => (
                    <button
                      key={preset.sizeKb}
                      type="button"
                      onClick={() => {
                        setTargetKb(preset.sizeKb);
                        setCustomKb('');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        targetKb === preset.sizeKb && !customKb
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold">{preset.desc}</span>
                        {preset.sizeKb === 200 && (
                          <span className="text-[9px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-bold px-1.5 py-0.5 rounded">
                            Strict
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-500 block leading-tight">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Or Specify Custom Target (KB):
                </label>
                <input
                  type="number"
                  placeholder="e.g. 150"
                  value={customKb}
                  onChange={e => setCustomKb(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              {compressedResult && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-mono text-xs flex items-center justify-between">
                  <span>Compressed Result:</span>
                  <span className="font-bold">{(compressedResult.size / 1024).toFixed(0)} KB ({compressedResult.ratio})</span>
                </div>
              )}
            </div>
          )}

          {/* 2. MERGE TOOL */}
          {tool === 'merge' && (
            <div className="space-y-4">
              <input
                ref={mergeInputRef}
                type="file"
                multiple
                accept=".pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={e => {
                  const files = e.target.files;
                  if (!files) return;
                  Array.from(files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      setMergeFiles(prev => [
                        ...prev,
                        {
                          id: 'merge_' + Date.now() + Math.random(),
                          name: file.name,
                          type: file.type || 'application/pdf',
                          dataUrl: reader.result as string,
                          size: file.size,
                        },
                      ]);
                    };
                    reader.readAsDataURL(file);
                  });
                  e.target.value = '';
                }}
              />

              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Merge Sequence (Drag/Add to reorder):
                </span>
                <button
                  type="button"
                  onClick={() => mergeInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Files</span>
                </button>
              </div>

              <div className="space-y-2">
                {currentDocument?.fileDataUrl && (
                  <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                        1
                      </span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                        {currentDocument.title || 'Current Document'}
                      </span>
                    </div>
                    <span className="text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded font-mono">
                      Primary
                    </span>
                  </div>
                )}

                {mergeFiles.map((file, idx) => (
                  <div
                    key={file.id}
                    className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
                        {idx + (currentDocument?.fileDataUrl ? 2 : 1)}
                      </span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMergeFiles(prev => prev.filter(f => f.id !== file.id))}
                      className="p-1 text-neutral-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {!currentDocument?.fileDataUrl && mergeFiles.length === 0 && (
                  <p className="text-center py-4 text-neutral-400 text-xs">
                    No files added. Click "Add Files" to pick PDFs or images to merge.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 3. SPLIT / EXTRACT TOOL */}
          {tool === 'extract' && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Keep Selected Page Numbers / Range:
                </label>
                <input
                  type="text"
                  value={pageRange}
                  onChange={e => setPageRange(e.target.value)}
                  placeholder="e.g. 1, 2-3, 5"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Format: comma separated pages (e.g. "1, 3") or hyphenated ranges (e.g. "1-4").
                </p>
              </div>

              <div className="flex gap-2">
                {['1', '1-2', '1, 3', '2-4'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setPageRange(r)}
                    className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-mono"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. ROTATE TOOL */}
          {tool === 'rotate' && (
            <div className="space-y-4">
              <label className="block font-semibold text-neutral-700 dark:text-neutral-300">
                Rotation Angle:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { deg: 90 as const, label: '+90° (Right)' },
                  { deg: 180 as const, label: '180° (Flip)' },
                  { deg: 270 as const, label: '+270° (Left)' },
                ].map(item => (
                  <button
                    key={item.deg}
                    type="button"
                    onClick={() => setRotationDegrees(item.deg)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      rotationDegrees === item.deg
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold ring-1 ring-indigo-500'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <RotateCw className="w-4 h-4 mx-auto mb-1" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. WATERMARK TOOL */}
          {tool === 'watermark' && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Watermark Text:
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={e => setWatermarkText(e.target.value)}
                  placeholder="e.g. FOR UNIVERSITY ADMISSION ONLY"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  <span>Watermark Opacity:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{watermarkOpacity}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={70}
                  value={watermarkOpacity}
                  onChange={e => setWatermarkOpacity(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center font-bold tracking-widest text-neutral-400 uppercase select-none border border-dashed border-neutral-300 dark:border-neutral-700">
                {watermarkText || 'SAMPLE WATERMARK'}
              </div>
            </div>
          )}

          {/* 6. SIGNATURE TOOL */}
          {tool === 'signature' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Draw Signature with Touch or Mouse:
                </span>
                <button
                  type="button"
                  onClick={clearSig}
                  className="text-[11px] font-semibold text-rose-500 hover:underline"
                >
                  Clear Pad
                </button>
              </div>

              <div className="border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white overflow-hidden shadow-inner">
                <canvas
                  ref={sigCanvasRef}
                  width={440}
                  height={140}
                  className="w-full h-32 cursor-crosshair touch-none"
                  onMouseDown={startDrawingSig}
                  onMouseMove={drawSig}
                  onMouseUp={stopDrawingSig}
                  onMouseLeave={stopDrawingSig}
                  onTouchStart={startDrawingSig}
                  onTouchMove={drawSig}
                  onTouchEnd={stopDrawingSig}
                />
              </div>
              <p className="text-[10px] text-neutral-500">
                Your signature will be stamped onto the bottom right quadrant of this document.
              </p>
            </div>
          )}

          {/* 7. PASSWORD ENCRYPTION */}
          {tool === 'protect' && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Create Document Password:
                </label>
                <input
                  type="password"
                  value={docPassword}
                  onChange={e => setDocPassword(e.target.value)}
                  placeholder="Enter strong password"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Confirm Password:
                </label>
                <input
                  type="password"
                  value={confirmDocPassword}
                  onChange={e => setConfirmDocPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* 8. IMAGES TO PDF */}
          {tool === 'img2pdf' && (
            <div className="space-y-4">
              <input
                ref={imgInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={e => {
                  const files = e.target.files;
                  if (!files) return;
                  Array.from(files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      setImageFiles(prev => [
                        ...prev,
                        {
                          id: 'img_' + Date.now() + Math.random(),
                          name: file.name,
                          dataUrl: reader.result as string,
                          size: file.size,
                        },
                      ]);
                    };
                    reader.readAsDataURL(file);
                  });
                  e.target.value = '';
                }}
              />

              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Photos to Compile ({imageFiles.length + (currentDocument?.fileType?.startsWith('image/') ? 1 : 0)} items):
                </span>
                <button
                  type="button"
                  onClick={() => imgInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Photos</span>
                </button>
              </div>

              <div className="space-y-2">
                {currentDocument?.fileType?.startsWith('image/') && (
                  <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between">
                    <span className="font-semibold truncate">{currentDocument.title || 'Selected Image'}</span>
                    <span className="text-[10px] bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded">Primary</span>
                  </div>
                )}
                {imageFiles.map((f, i) => (
                  <div
                    key={f.id}
                    className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setImageFiles(prev => prev.filter(img => img.id !== f.id))}
                      className="p-1 text-neutral-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. OCR TEXT TOOL */}
          {tool === 'ocr' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleRunOCR}
                disabled={isProcessing}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />}
                <span>{isProcessing ? 'Analyzing Document Text...' : 'Scan & Extract Text'}</span>
              </button>

              {ocrResult && (
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      Extracted Text ({ocrResult.lines?.length || 0} lines):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(ocrResult.text);
                        setCopiedText(true);
                        setTimeout(() => setCopiedText(false), 2000);
                      }}
                      className="px-2 py-1 bg-white dark:bg-neutral-900 border rounded text-[11px] font-semibold flex items-center gap-1"
                    >
                      {copiedText ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 font-mono text-[11px] whitespace-pre-wrap">
                    {ocrResult.text || 'No text detected in document.'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 10. CAMSCANNER CAMERA */}
          {tool === 'camera' && (
            <div className="space-y-4">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera Viewfinder</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1">
                      {(['magic', 'bw', 'grayscale', 'none'] as const).map(f => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setCameraFilter(f)}
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                            cameraFilter === f ? 'bg-indigo-600 text-white' : 'bg-black/60 text-white/80'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snap Page ({capturedPages.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-semibold"
                    >
                      Stop
                    </button>
                  </div>
                </div>
              )}

              {capturedPages.length > 0 && (
                <div className="space-y-2">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    Captured Scans ({capturedPages.length} pages):
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {capturedPages.map((p, idx) => (
                      <div key={p.id} className="relative shrink-0 w-16 h-20 rounded-lg overflow-hidden border">
                        <img src={p.dataUrl} alt={`Scan ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setCapturedPages(prev => prev.filter(item => item.id !== p.id))}
                          className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* POPUP FOOTER */}
        <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-900/80 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>

          {/* Action button corresponding to active tool */}
          {tool === 'compress' && (
            <button
              type="button"
              onClick={handleApplyCompress}
              disabled={isProcessing}
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />}
              <span>Apply Compression</span>
            </button>
          )}

          {tool === 'merge' && (
            <button
              type="button"
              onClick={handleApplyMerge}
              disabled={isProcessing}
              className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
              <span>Merge & Save PDF</span>
            </button>
          )}

          {tool === 'extract' && (
            <button
              type="button"
              onClick={handleApplyExtract}
              disabled={isProcessing}
              className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
              <span>Extract Pages</span>
            </button>
          )}

          {tool === 'rotate' && (
            <button
              type="button"
              onClick={handleApplyRotate}
              disabled={isProcessing}
              className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
              <span>Apply Rotation</span>
            </button>
          )}

          {tool === 'watermark' && (
            <button
              type="button"
              onClick={handleApplyWatermark}
              disabled={isProcessing}
              className="py-2 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Stamp Watermark</span>
            </button>
          )}

          {tool === 'signature' && (
            <button
              type="button"
              onClick={handleApplySignature}
              disabled={isProcessing || !hasSignature}
              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenTool className="w-3.5 h-3.5" />}
              <span>Stamp Signature</span>
            </button>
          )}

          {tool === 'protect' && (
            <button
              type="button"
              onClick={handleApplyPassword}
              disabled={isProcessing}
              className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              <span>Encrypt Document</span>
            </button>
          )}

          {tool === 'img2pdf' && (
            <button
              type="button"
              onClick={handleApplyImg2Pdf}
              disabled={isProcessing}
              className="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus className="w-3.5 h-3.5" />}
              <span>Compile to PDF</span>
            </button>
          )}

          {tool === 'camera' && (
            <button
              type="button"
              onClick={handleApplyCameraScans}
              disabled={isProcessing || capturedPages.length === 0}
              className="py-2 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              <span>Save Scans as PDF</span>
            </button>
          )}

          {tool === 'ocr' && (
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs"
            >
              Done
            </button>
          )}

        </div>

      </div>
    </div>
  );
};
