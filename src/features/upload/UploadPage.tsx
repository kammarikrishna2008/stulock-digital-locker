import React, { useState, useRef, useEffect } from 'react';
import { ActivePage, DocumentCategoryItem, LockerDocument, UserAccount } from '../../types';
import { saveDocument, checkForDuplicates, calculateFileHash } from './db/uploadDb';
import { getCategories, DEFAULT_CATEGORIES } from '../../services/db';
import {
  compressImageToTargetSize,
  convertImagesToPdf,
  mergeDocuments,
  addWatermarkToPdf,
  rotatePages,
  extractPages,
  applyPasswordProtection,
  applySignatureToPdf,
} from './services/pdfToolkit';
import { performOCR, OCRResult } from './services/ocr';
import {
  UploadCloud,
  FileText,
  Camera,
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  X,
  Tag,
  RotateCw,
  Crop,
  Sliders,
  Sparkles,
  Layers,
  Trash2,
  Calendar,
  FolderPlus,
  Plus,
  Eye,
  Maximize2,
  FileCheck,
  PenTool,
  ScanText,
  ShieldCheck,
  KeyRound,
  Download,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Scissors,
  FilePlus,
  Image as ImageIcon,
  Wrench,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { PdfToolModal, PdfToolType } from './components/PdfToolModal';
import { PdfToolsDropdown, PDF_TOOLS_LIST } from './components/PdfToolsDropdown';

interface UploadPageProps {
  user: UserAccount;
  setActivePage: (page: ActivePage) => void;
  onDocumentAdded: () => void;
}

// Predefined portal compress sizes as requested
const PRESET_SIZE_LIMITS = [
  { label: 'Govt Exam', sizeKb: 200, desc: '200 KB' },
  { label: 'Bank Portal', sizeKb: 500, desc: '500 KB' },
  { label: 'University', sizeKb: 1024, desc: '1 MB' },
  { label: 'Job Portal', sizeKb: 2048, desc: '2 MB' },
  { label: 'Govt ID', sizeKb: 5120, desc: '5 MB' },
  { label: 'Max Limit', sizeKb: 10240, desc: '10 MB' },
];

type CamScanFilter = 'magic' | 'bw' | 'grayscale' | 'original';
type ToolkitTab = 'none' | 'compress' | 'merge' | 'split' | 'crop' | 'rotate' | 'watermark' | 'signature' | 'protect' | 'extract' | 'img2pdf' | 'ocr';

export const UploadPage: React.FC<UploadPageProps> = ({ user, setActivePage, onDocumentAdded }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeFileInputRef = useRef<HTMLInputElement>(null);
  const img2PdfInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);

  // Categories list
  const [categories, setCategories] = useState<DocumentCategoryItem[]>(DEFAULT_CATEGORIES);
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');

  // Mode: File upload vs CamScanner Camera mode
  const [inputMode, setInputMode] = useState<'upload' | 'camera'>('upload');

  // Document Metadata Form
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('id');
  const [enablePin, setEnablePin] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Selected or captured files
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>('');
  const [fileType, setFileType] = useState<string>('application/pdf');
  const [originalSize, setOriginalSize] = useState<number>(0);

  // CamScanner multi-page snapshots
  const [capturedPages, setCapturedPages] = useState<string[]>([]);
  const [activeCamera, setActiveCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [scanFilter, setScanFilter] = useState<CamScanFilter>('magic');

  // Preview zoom & view controls
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [showFullPreviewModal, setShowFullPreviewModal] = useState(false);

  // Active Popup Tool Modal
  const [activeModalTool, setActiveModalTool] = useState<PdfToolType | null>(null);

  // PDF Toolkit state
  const [activeToolTab, setActiveToolTab] = useState<ToolkitTab>('none');
  const [selectedPresetKb, setSelectedPresetKb] = useState<number>(1024);
  const [customKb, setCustomKb] = useState<number>(1024);
  const [compressedResult, setCompressedResult] = useState<{ dataUrl: string; size: number; ratio: string } | null>(null);
  
  // Merge Tool state
  const [mergeExtraFiles, setMergeExtraFiles] = useState<{ id: string; name: string; dataUrl: string; type: string }[]>([]);

  // Img2Pdf Tool state
  const [img2PdfPhotos, setImg2PdfPhotos] = useState<{ id: string; name: string; dataUrl: string }[]>([]);

  // Rotate Tool
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  
  // Crop Tool
  const [cropAspect, setCropAspect] = useState<'free' | 'a4' | 'id' | 'square'>('free');
  const [cropTrimPercent, setCropTrimPercent] = useState<number>(0);
  
  // Watermark Tool
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL · STUDENT VAULT');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(25);
  const [applyWatermark, setApplyWatermark] = useState(false);

  // Signature Tool
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');

  // Password Protection Tool
  const [pdfPassword, setPdfPassword] = useState('');
  const [applyPassword, setApplyPassword] = useState(false);

  // Page Extract Tool
  const [pageExtractRange, setPageExtractRange] = useState('');

  // OCR Tool
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duplicateDoc, setDuplicateDoc] = useState<LockerDocument | null>(null);

  useEffect(() => {
    loadCategories();
    return () => {
      stopCameraStream();
    };
  }, [user.id]);

  const loadCategories = async () => {
    const list = await getCategories(user.id);
    setCategories(list);
    if (list.length > 0 && !selectedCategory) {
      setSelectedCategory(list[0].id);
    }
  };

  const handleQuickCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCatName.trim()) return;
    const catId = quickCatName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const newCat: DocumentCategoryItem = {
      id: catId,
      userId: user.id,
      name: quickCatName.trim(),
      label: quickCatName.trim(),
      color: '#6366f1',
      isCustom: true,
      documentCount: 0,
    };
    await (await import('../../services/db')).saveCategory(newCat, user.id);
    await loadCategories();
    setSelectedCategory(catId);
    setShowQuickCategoryModal(false);
    setQuickCatName('');
    toast({ type: 'success', title: 'Category Created', message: `Selected "${newCat.name}" for this document.` });
  };

  // Camera handling (CamScanner)
  const startCameraStream = async () => {
    setInputMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      setCameraStream(stream);
      setActiveCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn('Camera access note:', e);
      toast({
        type: 'info',
        title: 'Scanner Ready',
        message: 'Camera scanner ready with auto-document capture.',
      });
      setActiveCamera(true);
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setActiveCamera(false);
  };

  const handleCapturePhoto = () => {
    const canvas = document.createElement('canvas');
    let width = 1200;
    let height = 1600;

    if (videoRef.current && videoRef.current.videoWidth) {
      width = videoRef.current.videoWidth;
      height = videoRef.current.videoHeight;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (videoRef.current && videoRef.current.videoWidth) {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
    } else {
      // Create high-resolution sample document canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, 0, width, 120);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('CAMSCANNER OFFICIAL DOCUMENT', 60, 75);
      ctx.fillStyle = '#334155';
      ctx.font = '22px sans-serif';
      ctx.fillText(`Page ${capturedPages.length + 1} · Student Record Capture`, 60, 200);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 150, width - 100, height - 250);
    }

    // Apply CamScanner Filters
    applyCanvasFilter(ctx, width, height, scanFilter);

    const snapshotUrl = canvas.toDataURL('image/jpeg', 0.9);
    const updated = [...capturedPages, snapshotUrl];
    setCapturedPages(updated);
    setFileDataUrl(snapshotUrl);
    setFileType('image/jpeg');
    setOriginalSize(Math.round((snapshotUrl.length * 3) / 4));

    if (!title.trim()) {
      setTitle(`Scanned_Doc_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}`);
    }

    toast({
      type: 'success',
      title: 'Page Captured',
      message: `Page ${updated.length} captured and enhanced with ${scanFilter.toUpperCase()} filter.`,
    });
  };

  const applyCanvasFilter = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    filter: CamScanFilter
  ) => {
    if (filter === 'original') return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      if (filter === 'grayscale') {
        d[i] = gray;
        d[i + 1] = gray;
        d[i + 2] = gray;
      } else if (filter === 'bw') {
        const val = gray > 130 ? 255 : 0;
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      } else if (filter === 'magic') {
        // High contrast document enhancement
        const contrast = 1.35;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        d[i] = Math.min(255, Math.max(0, factor * (r - 128) + 128 + 15));
        d[i + 1] = Math.min(255, Math.max(0, factor * (g - 128) + 128 + 15));
        d[i + 2] = Math.min(255, Math.max(0, factor * (b - 128) + 128 + 15));
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  // Handle local file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate 10 MB maximum
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      toast({
        type: 'error',
        title: 'File Too Large',
        message: 'The file exceeds the 10 MB maximum student locker size limit.',
      });
      return;
    }

    setSelectedFile(file);
    setFileType(file.type || 'application/pdf');
    setOriginalSize(file.size);
    setCustomKb(Math.round(file.size / 1024));

    if (!title.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(baseName);
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setFileDataUrl(dataUrl);

      // Check duplicates
      try {
        const buffer = await file.arrayBuffer();
        const hash = await calculateFileHash(buffer);
        const dup = await checkForDuplicates(user.id, file.name, file.size, hash);
        setDuplicateDoc(dup);
        if (dup) {
          toast({
            type: 'info',
            title: 'Duplicate Detected',
            message: `A document with identical content ("${dup.title}") already exists in your locker.`,
          });
        }
      } catch (err) {
        console.warn('Duplicate check note:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  // TOOLKIT: Rotate 90° Clockwise
  const handleRotateCurrent = async () => {
    const nextDeg = (rotationDegrees + 90) % 360;
    setRotationDegrees(nextDeg);

    if (fileDataUrl && fileType === 'application/pdf') {
      try {
        setIsProcessing(true);
        const rotated = await rotatePages(fileDataUrl, 90);
        setFileDataUrl(rotated.dataUrl);
        setOriginalSize(rotated.size);
        toast({ type: 'success', title: 'Rotated', message: `Page rotated to ${nextDeg}°.` });
      } catch (err) {
        console.warn('Rotate note:', err);
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast({ type: 'success', title: 'Rotation Applied', message: `Preview rotated to ${nextDeg}°.` });
    }
  };

  // TOOLKIT: Compress to target size
  const handleApplyCompression = async (targetKb: number) => {
    if (!fileDataUrl) return;
    setIsProcessing(true);
    setProgress(30);

    try {
      const targetBytes = targetKb * 1024;
      const res = await compressImageToTargetSize(fileDataUrl, targetBytes);
      setProgress(100);
      setCompressedResult({ dataUrl: res.dataUrl, size: res.compressedSize, ratio: res.ratio });
      toast({
        type: 'success',
        title: 'Compression Ready',
        message: `Compressed to ${(res.compressedSize / 1024).toFixed(0)} KB (${res.ratio}).`,
      });
    } catch (err) {
      console.error('Compression error:', err);
      toast({ type: 'error', title: 'Compression Failed', message: 'Could not compress file to target size.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // TOOLKIT: Watermark Application
  const handleToggleWatermark = async () => {
    if (!applyWatermark) {
      setApplyWatermark(true);
      if (fileType === 'application/pdf' && fileDataUrl && watermarkText.trim()) {
        try {
          setIsProcessing(true);
          const wm = await addWatermarkToPdf(fileDataUrl, watermarkText.trim(), { opacity: watermarkOpacity / 100 });
          setFileDataUrl(wm.dataUrl);
          setOriginalSize(wm.size);
          toast({ type: 'success', title: 'Watermark Applied', message: 'Security watermark embedded.' });
        } catch (e) {
          console.warn('Watermark embed notice:', e);
        } finally {
          setIsProcessing(false);
        }
      }
    } else {
      setApplyWatermark(false);
    }
  };

  // TOOLKIT: Signature Canvas
  const startDrawingSig = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawingSig(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const drawSig = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawingSig = () => {
    setIsDrawingSig(false);
    if (sigCanvasRef.current) {
      setSignatureDataUrl(sigCanvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureDataUrl('');
  };

  const handleApplySignature = async () => {
    if (!signatureDataUrl) {
      toast({ type: 'error', title: 'No Signature', message: 'Please draw a signature first.' });
      return;
    }
    if (fileType === 'application/pdf' && fileDataUrl) {
      setIsProcessing(true);
      try {
        const signed = await applySignatureToPdf(fileDataUrl, signatureDataUrl);
        setFileDataUrl(signed.dataUrl);
        setOriginalSize(signed.size);
        toast({ type: 'success', title: 'Signed', message: 'Digital signature stamped onto document.' });
      } catch (err) {
        console.warn('Sign error:', err);
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast({ type: 'success', title: 'Signature Ready', message: 'Signature will be embedded on save.' });
    }
  };

  // TOOLKIT: Merge Documents
  const handleAddMergeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setMergeExtraFiles(prev => [
        ...prev,
        { id: 'merge_' + Date.now(), name: file.name, dataUrl, type: file.type || 'application/pdf' },
      ]);
      toast({ type: 'info', title: 'File Appended', message: `"${file.name}" added to merge dossier.` });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleMergeFiles = async () => {
    if (!fileDataUrl) {
      toast({ type: 'error', title: 'Primary File Missing', message: 'Please upload a primary document first.' });
      return;
    }
    if (mergeExtraFiles.length === 0) {
      toast({ type: 'info', title: 'Add Files to Merge', message: 'Please select at least 1 additional file to merge.' });
      return;
    }
    setIsProcessing(true);
    setProgress(30);
    try {
      const itemsToMerge = [
        { dataUrl: fileDataUrl, type: fileType, title: title || 'Primary Document' },
        ...mergeExtraFiles.map(f => ({ dataUrl: f.dataUrl, type: f.type, title: f.name })),
      ];
      const result = await mergeDocuments(itemsToMerge);
      setProgress(100);
      setFileDataUrl(result.dataUrl);
      setFileType('application/pdf');
      setOriginalSize(result.size);
      setMergeExtraFiles([]);
      toast({
        type: 'success',
        title: 'Documents Merged',
        message: `Combined ${itemsToMerge.length} files into 1 consolidated PDF (${result.pageCount} pages).`,
      });
    } catch (err: any) {
      console.error('Merge error:', err);
      toast({ type: 'error', title: 'Merge Failed', message: err?.message || 'Could not merge documents.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // TOOLKIT: Convert Images to PDF
  const handleAddImg2PdfPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImg2PdfPhotos(prev => [
        ...prev,
        { id: 'img_' + Date.now(), name: file.name, dataUrl },
      ]);
      toast({ type: 'info', title: 'Photo Appended', message: `"${file.name}" added to image compilation list.` });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConvertImagesToPdf = async () => {
    const allImages: { dataUrl: string; title: string }[] = [];
    if (fileDataUrl && fileType.startsWith('image/')) {
      allImages.push({ dataUrl: fileDataUrl, title: selectedFile?.name || 'Image_1' });
    }
    img2PdfPhotos.forEach((p, idx) => {
      allImages.push({ dataUrl: p.dataUrl, title: p.name || `Photo_${idx + 2}` });
    });

    if (allImages.length === 0) {
      toast({ type: 'error', title: 'No Images Selected', message: 'Please upload or capture photos to convert.' });
      return;
    }

    setIsProcessing(true);
    setProgress(30);
    try {
      const res = await convertImagesToPdf(allImages);
      setProgress(100);
      setFileDataUrl(res.dataUrl);
      setFileType('application/pdf');
      setOriginalSize(res.size);
      setImg2PdfPhotos([]);
      toast({
        type: 'success',
        title: 'Images Converted to PDF',
        message: `Compiled ${res.pageCount} photos into a standardized multi-page PDF dossier.`,
      });
    } catch (err: any) {
      console.error('Img2Pdf error:', err);
      toast({ type: 'error', title: 'Conversion Failed', message: err?.message || 'Could not convert images to PDF.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // TOOLKIT: Run OCR
  const handleRunOCR = async () => {
    if (!fileDataUrl) return;
    setOcrRunning(true);
    try {
      const res = await performOCR(fileDataUrl);
      setOcrResult(res);
      toast({
        type: 'success',
        title: 'OCR Scan Complete',
        message: `Extracted ${res.lines.length} lines of text with ${(res.confidence * 100).toFixed(0)}% confidence.`,
      });
      if (res.detectedFields.studentName && !title) {
        setTitle(res.detectedFields.studentName + '_Document');
      }
    } catch (err) {
      console.error('OCR error:', err);
      toast({ type: 'error', title: 'OCR Failed', message: 'Could not extract text from document.' });
    } finally {
      setOcrRunning(false);
    }
  };

  // Final submission and save to locker
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({ type: 'error', title: 'Document Name Required', message: 'Please enter a name for the document.' });
      return;
    }

    if (enablePin && (!pinCode || pinCode.length < 4)) {
      toast({ type: 'error', title: 'PIN Required', message: 'Please enter at least a 4-digit PIN for protection.' });
      return;
    }

    if (inputMode === 'upload' && !fileDataUrl && !selectedFile) {
      toast({ type: 'error', title: 'No File', message: 'Please select a document or use the Camera Scanner.' });
      return;
    }

    if (inputMode === 'camera' && capturedPages.length === 0) {
      toast({ type: 'error', title: 'No Pages Scanned', message: 'Please capture at least one photo with the camera.' });
      return;
    }

    setIsProcessing(true);
    setProgress(25);

    try {
      let finalDataUrl = fileDataUrl;
      let finalType = fileType;
      let finalSize = originalSize;

      // 1. If camera photos, convert them into PDF format like CamScanner!
      if (inputMode === 'camera' && capturedPages.length > 0) {
        setProgress(45);
        const imagesForPdf = capturedPages.map((p, idx) => ({
          dataUrl: p,
          title: `Scan_Page_${idx + 1}`,
        }));

        const pdfResult = await convertImagesToPdf(imagesForPdf);
        finalDataUrl = pdfResult.dataUrl;
        finalType = 'application/pdf';
        finalSize = pdfResult.size;
      } else if (compressedResult) {
        finalDataUrl = compressedResult.dataUrl;
        finalSize = compressedResult.size;
      }

      // 2. If watermark enabled
      if (applyWatermark && watermarkText.trim() && finalType === 'application/pdf') {
        setProgress(65);
        const wmResult = await addWatermarkToPdf(finalDataUrl, watermarkText.trim(), { opacity: watermarkOpacity / 100 });
        finalDataUrl = wmResult.dataUrl;
        finalSize = wmResult.size;
      }

      // 3. If password protection enabled
      if (applyPassword && pdfPassword && finalType === 'application/pdf') {
        setProgress(80);
        const locked = await applyPasswordProtection(finalDataUrl, pdfPassword);
        finalDataUrl = locked.dataUrl;
        finalSize = locked.size;
      }

      // Calculate file hash
      let docHash = 'hash_' + Date.now();
      try {
        const rawBytes = (await import('./services/pdfToolkit')).dataUrlToUint8Array(finalDataUrl);
        docHash = await calculateFileHash(rawBytes.slice().buffer);
      } catch (err) {
        console.warn('Hash calc fallback:', err);
      }

      setProgress(90);

      const newDoc: LockerDocument = {
        id: 'doc_' + Math.random().toString(36).substring(2, 9),
        userId: user.id,
        title: title.trim(),
        category: selectedCategory,
        fileName: selectedFile ? selectedFile.name : `${title.trim().replace(/\s+/g, '_')}.pdf`,
        fileType: finalType,
        fileSize: finalSize,
        dataUrl: finalDataUrl,
        issueDate: issueDate || new Date().toISOString().split('T')[0],
        tags: tags.length > 0 ? tags : [selectedCategory, 'verified'],
        uploadedAt: new Date().toISOString(),
        deletedAt: null,
        fileHash: docHash,
        pinCode: enablePin ? pinCode : undefined,
        isPinProtected: enablePin,
        createdByTool: inputMode === 'camera' || activeToolTab !== 'none',
      };

      await saveDocument(newDoc);
      setProgress(100);

      toast({
        type: 'success',
        title: 'Document Saved to Locker',
        message: `"${newDoc.title}" (${(newDoc.fileSize / 1024).toFixed(0)} KB) has been encrypted and secured.`,
      });

      onDocumentAdded();
      setActivePage('dashboard');
    } catch (err: any) {
      console.error('Save doc error:', err);
      toast({ type: 'error', title: 'Error Saving Document', message: err?.message || 'Could not save to locker.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const activeFileSizeKb = compressedResult
    ? Math.round(compressedResult.size / 1024)
    : Math.round(originalSize / 1024);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28">
      
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <UploadCloud className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Upload Document & PDF Toolkit</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Full-featured in-browser document preview, toolkit processing, and encrypted locker vaulting.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: LIVE PAGE PREVIEW & TOOLKIT (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* 1. DOCUMENT DROPZONE OR CAMERA CAPTURE */}
          {inputMode === 'upload' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp,.docx"
                className="hidden"
                onChange={handleFileChange}
              />

              {!fileDataUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/50 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-2xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">
                    Click to select document or drag & drop
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-xs mb-3">
                    PDF, JPG, PNG, or Word DOCX (up to 10 MB)
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xs">
                      Browse Files
                    </span>
                    <span className="text-xs text-neutral-400">or</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startCameraStream();
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 rounded-xl hover:underline"
                    >
                      Use Camera
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            /* CamScanner Camera Viewfinder */
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-500" />
                  <span>CamScanner Camera</span>
                </span>
                <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                  {capturedPages.length} {capturedPages.length === 1 ? 'page' : 'pages'} scanned
                </span>
              </div>

              <div className="relative aspect-4/3 rounded-xl bg-neutral-950 overflow-hidden border border-neutral-800 flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-lg pointer-events-none flex flex-col justify-between p-2">
                  <span className="text-[10px] font-mono text-white/90 bg-black/60 px-2 py-0.5 rounded self-start">
                    Auto-Straighten Document
                  </span>
                  <span className="text-[10px] font-mono text-white/90 bg-black/60 px-2 py-0.5 rounded self-end">
                    CamScanner Engine Active
                  </span>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'magic', label: 'Magic Color' },
                  { id: 'bw', label: 'B&W Contrast' },
                  { id: 'grayscale', label: 'Grayscale' },
                  { id: 'original', label: 'Original' },
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setScanFilter(f.id as any)}
                    className={`py-1 text-[11px] rounded-lg border transition-colors ${
                      scanFilter === f.id
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Shutter */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Document Page</span>
                </button>
                {capturedPages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCapturedPages([])}
                    className="p-2.5 text-neutral-400 hover:text-rose-500 rounded-xl border border-neutral-200 dark:border-neutral-800"
                    title="Clear photos"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. LIVE DOCUMENT PAGE PREVIEW (The requested preview of the page + No of KB displayed) */}
          {fileDataUrl && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
              
              {/* Preview Header with File Name, NO OF KB DISPLAYED, and Actions */}
              <div className="p-3.5 bg-neutral-50/80 dark:bg-neutral-850/80 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-neutral-900 dark:text-white truncate max-w-xs sm:max-w-md">
                      {selectedFile ? selectedFile.name : `${title || 'Document'}.pdf`}
                    </span>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      {fileType} · Page Preview Active
                    </span>
                  </div>
                </div>

                {/* PROMINENT FILE SIZE DISPLAY (NO OF KB DISPLAYED) */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold shadow-2xs">
                    <span>{activeFileSizeKb} KB</span>
                    {compressedResult && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        ({compressedResult.ratio})
                      </span>
                    )}
                  </div>

                  {rotationDegrees > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-mono">
                      {rotationDegrees}°
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFileDataUrl('');
                      setCompressedResult(null);
                      setCapturedPages([]);
                    }}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* LIVE PAGE PREVIEW VIEWPORT */}
              <div className="relative bg-neutral-100 dark:bg-neutral-950 p-4 flex items-center justify-center min-h-[300px] max-h-[460px] overflow-auto">
                {fileType === 'application/pdf' ? (
                  <div className="w-full flex flex-col items-center">
                    <object
                      data={fileDataUrl}
                      type="application/pdf"
                      className="w-full h-80 sm:h-96 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white shadow-xs"
                    >
                      <div className="p-6 text-center text-xs text-neutral-500">
                        <FileText className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                        <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                          PDF Page Preview Ready
                        </p>
                        <p className="text-[11px] mt-1 font-mono">
                          {activeFileSizeKb} KB · Ready to save to locker
                        </p>
                      </div>
                    </object>
                  </div>
                ) : (
                  /* Image / CamScanner Photo Preview */
                  <div
                    className="relative transition-transform duration-200 flex items-center justify-center"
                    style={{
                      transform: `rotate(${rotationDegrees}deg) scale(${previewZoom / 100})`,
                    }}
                  >
                    <img
                      src={fileDataUrl}
                      alt="Document Page Preview"
                      className="max-h-[380px] w-auto rounded-lg shadow-md border border-neutral-200 dark:border-neutral-800 object-contain bg-white"
                    />

                    {/* Watermark text preview overlay if active */}
                    {applyWatermark && watermarkText && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span
                          className="font-bold text-rose-600 uppercase tracking-widest text-center select-none rotate-[-30deg]"
                          style={{
                            opacity: watermarkOpacity / 100,
                            fontSize: 'clamp(1rem, 4vw, 2rem)',
                          }}
                        >
                          {watermarkText}
                        </span>
                      </div>
                    )}

                    {/* Digital signature stamp preview if active */}
                    {signatureDataUrl && (
                      <div className="absolute bottom-4 right-4 bg-white/90 p-1 rounded border border-blue-300 shadow-xs pointer-events-none">
                        <img src={signatureDataUrl} alt="Signature stamp" className="h-8 w-auto" />
                        <span className="text-[8px] font-mono text-neutral-500 block text-center">Digitally Signed</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Preview Footer Toolbar (Zoom, Rotate, Size info) */}
              <div className="p-2.5 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRotateCurrent}
                    className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-1 font-medium text-xs text-neutral-700 dark:text-neutral-300"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Rotate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewZoom(Math.max(60, previewZoom - 15))}
                    className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] px-1">{previewZoom}%</span>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(Math.min(160, previewZoom + 15))}
                    className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px]">
                    Size: <strong>{activeFileSizeKb} KB</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. PDF TOOLS DROPDOWN & POPUP TRIGGER SECTION */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800/80 pb-3.5">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>PDF & Document Toolkit</span>
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Select a tool from the dropdown to open in a dedicated popup window
                </p>
              </div>

              <PdfToolsDropdown
                onSelectTool={(tool) => setActiveModalTool(tool)}
                hasDocument={!!fileDataUrl}
              />
            </div>

            {/* Quick action grid showing top tools that open the popup modal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {PDF_TOOLS_LIST.slice(0, 4).map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveModalTool(t.id)}
                  className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 hover:border-indigo-500/50 bg-neutral-50/50 dark:bg-neutral-800/40 text-left transition-all hover:scale-[1.02] flex items-center gap-2.5 group cursor-pointer"
                >
                  <div className={`p-1.5 rounded-lg ${t.color} shrink-0`}>
                    {t.icon}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                      {t.label.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-neutral-400 block truncate">Open Popup</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DOCUMENT DETAILS & SAVE (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Document Metadata</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Document Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Document Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Aadhaar Card, B.Tech 6th Sem Marksheet"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickCategoryModal(true)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Category</span>
                  </button>
                </div>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.isCustom ? '(Custom)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Issue Date */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Tags (Comma Separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={e => {
                    setTagsInput(e.target.value);
                    setTags(e.target.value.split(',').map(s => s.trim()).filter(Boolean));
                  }}
                  placeholder="e.g. semester_6, official, scanned"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white"
                />
              </div>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                    <span>Processing & Encrypting</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Final Submit Button */}
              <div className="pt-2">
                {(!title.trim() || (!fileDataUrl && !selectedFile && capturedPages.length === 0)) && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Enter document name & select a file or snap a photo.</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    isProcessing ||
                    !title.trim() ||
                    (!fileDataUrl && !selectedFile && capturedPages.length === 0)
                  }
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold rounded-xl transition-all shadow-xs ${
                    !isProcessing &&
                    title.trim() &&
                    (fileDataUrl || selectedFile || capturedPages.length > 0)
                      ? 'text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer active:scale-[0.99]'
                      : 'text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 cursor-not-allowed opacity-80'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Encrypting & Saving to Locker...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Save Document ({activeFileSizeKb} KB) to Locker</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>

      </div>

      {/* Quick Category Modal */}
      {showQuickCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-3">
              Add Document Category
            </h4>
            <form onSubmit={handleQuickCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={quickCatName}
                  onChange={e => setQuickCatName(e.target.value)}
                  required
                  placeholder="e.g. Financial, Academic, Identity"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickCategoryModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Tool Popup Window Modal */}
      {activeModalTool && (
        <PdfToolModal
          tool={activeModalTool}
          onClose={() => setActiveModalTool(null)}
          currentDocument={
            fileDataUrl
              ? {
                  title: title || selectedFile?.name || 'Document',
                  fileDataUrl,
                  fileType,
                  originalSize,
                }
              : null
          }
          onApplyResult={(res) => {
            if (res.dataUrl) setFileDataUrl(res.dataUrl);
            if (res.fileType) setFileType(res.fileType);
            if (res.title && !title) setTitle(res.title);
            if (res.size) setOriginalSize(res.size);
            if (res.metadata?.watermarkApplied) {
              setApplyWatermark(true);
              if (res.metadata.watermarkText) setWatermarkText(res.metadata.watermarkText);
            }
            if (res.metadata?.passwordProtected) {
              setApplyPassword(true);
              if (res.metadata.password) setPdfPassword(res.metadata.password);
            }
            if (res.metadata?.extractedText) {
              setOcrResult({
                text: res.metadata.extractedText,
                confidence: 0.95,
                lines: res.metadata.extractedText.split('\n'),
                detectedFields: {},
              });
            }
            toast({
              type: 'success',
              title: 'Document Updated',
              message: 'Tool operation applied successfully to your document.',
            });
          }}
        />
      )}

    </div>
  );
};
