import React, { useState, useRef, useEffect } from 'react';
import { LockerDocument, UserAccount } from '../../../types';
import { saveDocument } from '../../../services/db';
import {
  mergeDocuments,
  extractPages,
  rotatePages,
  addWatermarkToPdf,
  convertImagesToPdf,
  compressImageToTargetSize,
  applyPasswordProtection,
  applySignatureToPdf,
} from '../../upload/services/pdfToolkit';
import { performClientOCR, OCRResult } from '../../upload/services/ocr';
import {
  Layers,
  Scissors,
  RotateCw,
  Stamp,
  Image as ImageIcon,
  FileDown,
  Lock,
  Camera,
  Search,
  PenTool,
  Download,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { useToast } from '../../../components/Toast';

interface PdfToolkitTabProps {
  user: UserAccount;
  lockerDocuments: LockerDocument[];
  onDocumentCreated: () => void;
}

type ToolkitMode =
  | 'merge'
  | 'split'
  | 'rotate'
  | 'watermark'
  | 'img2pdf'
  | 'compress'
  | 'lock'
  | 'camera'
  | 'ocr'
  | 'sign';

export const PdfToolkitTab: React.FC<PdfToolkitTabProps> = ({
  user,
  lockerDocuments,
  onDocumentCreated,
}) => {
  const { toast } = useToast();
  const [activeTool, setActiveTool] = useState<ToolkitMode>('merge');
  const [processing, setProcessing] = useState(false);
  const [outputResult, setOutputResult] = useState<{
    dataUrl: string;
    title: string;
    size: number;
    type: string;
    meta?: string;
  } | null>(null);

  // Tool 1: Merge state
  const [mergeItems, setMergeItems] = useState<{ id: string; title: string; dataUrl: string; type: string }[]>([]);

  // Tool 2: Split / Extract state
  const [splitDocId, setSplitDocId] = useState<string>('');
  const [pageRange, setPageRange] = useState<string>('1');

  // Tool 3: Rotate state
  const [rotateDocId, setRotateDocId] = useState<string>('');
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);

  // Tool 4: Watermark state
  const [watermarkDocId, setWatermarkDocId] = useState<string>('');
  const [customWatermark, setCustomWatermark] = useState<string>('VERIFIED STUDENT RECORD');

  // Tool 5: Images to PDF state
  const [imageFiles, setImageFiles] = useState<{ id: string; title: string; dataUrl: string }[]>([]);

  // Tool 6: Compress state
  const [compressDocId, setCompressDocId] = useState<string>('');
  const [targetKb, setTargetKb] = useState<number>(300);

  // Tool 7: Password Lock state
  const [lockDocId, setLockDocId] = useState<string>('');
  const [passcode, setPasscode] = useState<string>('');

  // Tool 8: Camera Scan state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [scannedPages, setScannedPages] = useState<string[]>([]);
  const [cameraActive, setCameraActive] = useState(false);

  // Tool 9: OCR state
  const [ocrDocId, setOcrDocId] = useState<string>('');
  const [ocrOutput, setOcrOutput] = useState<OCRResult | null>(null);

  // Tool 10: Sign state
  const [signDocId, setSignDocId] = useState<string>('');
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize defaults from locker docs
  useEffect(() => {
    if (lockerDocuments.length > 0) {
      const firstPdf = lockerDocuments.find(d => d.fileType === 'application/pdf') || lockerDocuments[0];
      if (!splitDocId) setSplitDocId(firstPdf.id);
      if (!rotateDocId) setRotateDocId(firstPdf.id);
      if (!watermarkDocId) setWatermarkDocId(firstPdf.id);
      if (!compressDocId) setCompressDocId(lockerDocuments[0].id);
      if (!lockDocId) setLockDocId(firstPdf.id);
      if (!ocrDocId) setOcrDocId(lockerDocuments[0].id);
      if (!signDocId) setSignDocId(firstPdf.id);

      if (mergeItems.length === 0 && lockerDocuments.length >= 2) {
        setMergeItems([
          { id: lockerDocuments[0].id, title: lockerDocuments[0].title, dataUrl: lockerDocuments[0].dataUrl, type: lockerDocuments[0].fileType },
          { id: lockerDocuments[1].id, title: lockerDocuments[1].title, dataUrl: lockerDocuments[1].dataUrl, type: lockerDocuments[1].fileType },
        ]);
      }
    }
  }, [lockerDocuments]);

  // Clean up camera stream on unmount or tool change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [activeTool]);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      setCameraStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn('Camera access fallback:', e);
      toast({
        type: 'info',
        title: 'Camera Simulation Ready',
        message: 'Camera device restricted in iframe; mock high-res scanner is ready.',
      });
      setCameraActive(true);
    }
  };

  const captureCameraPage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (videoRef.current && cameraStream) {
      ctx.drawImage(videoRef.current, 0, 0, 800, 1100);
    } else {
      // Mock captured scanned document
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 1100);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`SCANNED DOCUMENT PAGE #${scannedPages.length + 1}`, 50, 80);
      ctx.font = '14px monospace';
      ctx.fillText(`Student: ${user.name} · ${user.rollNumber}`, 50, 120);
      ctx.fillText(`Timestamp: ${new Date().toISOString()}`, 50, 150);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(40, 180, 720, 850);
    }

    const pageUrl = canvas.toDataURL('image/jpeg', 0.85);
    setScannedPages(prev => [...prev, pageUrl]);
    toast({ type: 'success', title: 'Page Scanned', message: `Page #${scannedPages.length + 1} added to batch.` });
  };

  // Signature canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1e1b4b'; // dark indigo
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Execution Handlers
  const handleExecuteTool = async () => {
    setProcessing(true);
    setOutputResult(null);

    try {
      if (activeTool === 'merge') {
        if (mergeItems.length < 2) {
          toast({ type: 'error', title: 'Merge Error', message: 'Please select at least 2 files to merge.' });
          setProcessing(false);
          return;
        }
        const res = await mergeDocuments(mergeItems);
        setOutputResult({
          dataUrl: res.dataUrl,
          title: `Merged_Document_${Date.now()}.pdf`,
          size: res.size,
          type: 'application/pdf',
          meta: `${res.pageCount} pages combined`,
        });
      } else if (activeTool === 'split') {
        const doc = lockerDocuments.find(d => d.id === splitDocId);
        if (!doc) throw new Error('Document not found');
        const res = await extractPages(doc.dataUrl, pageRange);
        setOutputResult({
          dataUrl: res.dataUrl,
          title: `Extracted_Pages_${Date.now()}.pdf`,
          size: res.size,
          type: 'application/pdf',
          meta: `Extracted ${res.pageCount} page(s)`,
        });
      } else if (activeTool === 'rotate') {
        const doc = lockerDocuments.find(d => d.id === rotateDocId);
        if (!doc) throw new Error('Document not found');
        const res = await rotatePages(doc.dataUrl, rotationAngle);
        setOutputResult({
          dataUrl: res.dataUrl,
          title: `Rotated_${rotationAngle}deg_${Date.now()}.pdf`,
          size: res.size,
          type: 'application/pdf',
          meta: `Rotated ${rotationAngle}°`,
        });
      } else if (activeTool === 'watermark') {
        const doc = lockerDocuments.find(d => d.id === watermarkDocId);
        if (!doc) throw new Error('Document not found');
        const res = await addWatermarkToPdf(doc.dataUrl, customWatermark);
        setOutputResult({
          dataUrl: res.dataUrl,
          title: `Watermarked_${Date.now()}.pdf`,
          size: res.size,
          type: 'application/pdf',
          meta: `Watermark text applied`,
        });
      } else if (activeTool === 'img2pdf') {
        if (imageFiles.length === 0) {
          toast({ type: 'error', title: 'No Images', message: 'Please upload or pick at least one image.' });
          setProcessing(false);
          return;
        }
        const res = await convertImagesToPdf(imageFiles);
        setOutputResult({
          dataUrl: res.dataUrl,
          title: `Images_Converted_${Date.now()}.pdf`,
          size: res.size,
          type: 'application/pdf',
          meta: `${res.pageCount} photo pages`,
        });
      } else if (activeTool === 'compress') {
        const doc = lockerDocuments.find(d => d.id === compressDocId);
        if (!doc) throw new Error('Document not found');
        const res = await compressImageToTargetSize(doc.dataUrl, targetKb * 1024);
        setOutputResult({
          dataUrl: res.dataUrl,
          title: `Compressed_${targetKb}KB_${Date.now()}.jpg`,
          size: res.compressedSize,
          type: 'image/jpeg',
          meta: `${res.ratio} (Reduced from ${(res.originalSize / 1024).toFixed(0)}KB to ${(res.compressedSize / 1024).toFixed(0)}KB)`,
        });
      } else if (activeTool === 'lock') {
        const doc = lockerDocuments.find(d => d.id === lockDocId);
        if (!doc) throw new Error('Document not found');
        if (!passcode.trim()) {
          toast({ type: 'error', title: 'PIN Required', message: 'Please enter a PIN to lock.' });
          setProcessing(false);
          return;
        }
        const res = await applyPasswordProtection(doc.dataUrl, passcode);
        setOutputResult({
          dataUrl: res.dataUrl,
          title: `Protected_${doc.fileName || 'Doc.pdf'}`,
          size: res.size,
          type: 'application/pdf',
          meta: `PIN Security Seal Enforced`,
        });
      } else if (activeTool === 'camera') {
        if (scannedPages.length === 0) {
          toast({ type: 'error', title: 'No Scans', message: 'Capture at least one scan page with the camera.' });
          setProcessing(false);
          return;
        }
        const scanItems = scannedPages.map((p, idx) => ({ dataUrl: p, title: `Scan Page ${idx + 1}` }));
        const res = await convertImagesToPdf(scanItems);
        setOutputResult({
          dataUrl: res.dataUrl,
          title: `Camera_Scan_${Date.now()}.pdf`,
          size: res.size,
          type: 'application/pdf',
          meta: `${res.pageCount} scanned pages compiled`,
        });
      } else if (activeTool === 'ocr') {
        const doc = lockerDocuments.find(d => d.id === ocrDocId);
        if (!doc) throw new Error('Document not found');
        const ocrRes = await performClientOCR(doc.dataUrl);
        setOcrOutput(ocrRes);
        setOutputResult({
          dataUrl: doc.dataUrl,
          title: `OCR_Extracted_${doc.fileName}`,
          size: doc.fileSize,
          type: 'text/plain',
          meta: `${ocrRes.lines.length} lines detected (${ocrRes.confidence}% confidence)`,
        });
      } else if (activeTool === 'sign') {
        const doc = lockerDocuments.find(d => d.id === signDocId);
        if (!doc) throw new Error('Document not found');
        const canvas = signatureCanvasRef.current;
        if (!canvas) throw new Error('Signature canvas missing');
        const sigUrl = canvas.toDataURL('image/png');

        const res = await applySignatureToPdf(doc.dataUrl, sigUrl);
        setOutputResult({
          dataUrl: res.dataUrl,
          title: `Digitally_Signed_${Date.now()}.pdf`,
          size: res.size,
          type: 'application/pdf',
          meta: `Signature embedded on page 1`,
        });
      }

      toast({ type: 'success', title: 'Toolkit Operation Complete', message: 'File processed in browser.' });
    } catch (err: any) {
      console.error('Toolkit processing error:', err);
      toast({ type: 'error', title: 'Processing Error', message: err?.message || 'Operation failed.' });
    } finally {
      setProcessing(false);
    }
  };

  // Save back to locker
  const handleSaveToLocker = async () => {
    if (!outputResult) return;
    const newDoc: LockerDocument = {
      id: 'doc_tool_' + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      title: outputResult.title.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      category: 'other',
      fileName: outputResult.title,
      fileType: outputResult.type,
      fileSize: outputResult.size,
      dataUrl: outputResult.dataUrl,
      issueDate: new Date().toISOString().split('T')[0],
      tags: ['created with toolkit', activeTool],
      createdByTool: true,
      uploadedAt: new Date().toISOString(),
      deletedAt: null,
    };

    await saveDocument(newDoc);
    onDocumentCreated();
    toast({
      type: 'success',
      title: 'Saved to Locker',
      message: `Tagged "created with toolkit" and added to your documents.`,
    });
  };

  // Download directly
  const handleDownloadOutput = () => {
    if (!outputResult) return;
    const a = document.createElement('a');
    a.href = outputResult.dataUrl;
    a.download = outputResult.title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const tools: { id: ToolkitMode; label: string; icon: any; desc: string }[] = [
    { id: 'merge', label: 'Merge', icon: Layers, desc: 'Merge PDFs & photos in sequence' },
    { id: 'split', label: 'Split', icon: Scissors, desc: 'Extract specified page ranges' },
    { id: 'rotate', label: 'Rotate', icon: RotateCw, desc: 'Rotate pages 90°, 180°, or 270°' },
    { id: 'watermark', label: 'Watermark', icon: Stamp, desc: 'Overlay security watermark' },
    { id: 'img2pdf', label: 'Photos to PDF', icon: ImageIcon, desc: 'Convert images to PDF' },
    { id: 'compress', label: 'Compress', icon: FileDown, desc: 'Target size compression' },
    { id: 'lock', label: 'Lock', icon: Lock, desc: 'Passcode PIN security lock' },
    { id: 'camera', label: 'Camera', icon: Camera, desc: 'Live camera scan to PDF' },
    { id: 'ocr', label: 'OCR', icon: Search, desc: 'Extract searchable text' },
    { id: 'sign', label: 'Sign', icon: PenTool, desc: 'Draw & embed digital signature' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Tool Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl">
        {tools.map(tool => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                setOutputResult(null);
                setOcrOutput(null);
              }}
              className={`flex items-center gap-2 p-2.5 rounded-lg text-left text-xs transition-all ${
                isActive
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400'}`} />
              {tool.label}
            </button>
          );
        })}
      </div>

      {/* Main Workspace Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Tool Configuration Controls */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-5">
          
          <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{tools.find(t => t.id === activeTool)?.label}</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {tools.find(t => t.id === activeTool)?.desc} · In-browser offline execution
            </p>
          </div>

          {/* 1. MERGE */}
          {activeTool === 'merge' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Document Sequence to Merge ({mergeItems.length} selected)
                </span>
                <span className="text-neutral-400">Order preserved</span>
              </div>

              <div className="space-y-2">
                {mergeItems.map((item, idx) => (
                  <div key={item.id + idx} className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-neutral-400">{idx + 1}.</span>
                      <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{item.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMergeItems(mergeItems.filter((_, i) => i !== idx))}
                      className="text-neutral-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add file to sequence dropdown */}
              <div className="flex gap-2">
                <select
                  id="addMergeSelect"
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                >
                  {lockerDocuments.map(d => (
                    <option key={d.id} value={d.id}>{d.title} ({d.category.toUpperCase()})</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const sel = (document.getElementById('addMergeSelect') as HTMLSelectElement)?.value;
                    const doc = lockerDocuments.find(d => d.id === sel);
                    if (doc) {
                      setMergeItems([...mergeItems, { id: doc.id, title: doc.title, dataUrl: doc.dataUrl, type: doc.fileType }]);
                    }
                  }}
                  className="px-3 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200"
                >
                  + Add to Sequence
                </button>
              </div>
            </div>
          )}

          {/* 2. SPLIT / EXTRACT */}
          {activeTool === 'split' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Select Source Document
                </label>
                <select
                  value={splitDocId}
                  onChange={e => setSplitDocId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                >
                  {lockerDocuments.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Pages to Keep (1-indexed, e.g. "1", "1-2", "1, 3")
                </label>
                <input
                  type="text"
                  value={pageRange}
                  onChange={e => setPageRange(e.target.value)}
                  placeholder="1-2, 4"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Only the specified pages will be extracted into the clean output PDF.
                </p>
              </div>
            </div>
          )}

          {/* 3. ROTATE */}
          {activeTool === 'rotate' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Select Document to Rotate
                </label>
                <select
                  value={rotateDocId}
                  onChange={e => setRotateDocId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                >
                  {lockerDocuments.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Rotation Angle
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[90, 180, 270].map(deg => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setRotationAngle(deg as any)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                        rotationAngle === deg
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      {deg}° Clockwise
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. WATERMARK */}
          {activeTool === 'watermark' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Select Document
                </label>
                <select
                  value={watermarkDocId}
                  onChange={e => setWatermarkDocId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                >
                  {lockerDocuments.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Custom Watermark Stamp Text
                </label>
                <input
                  type="text"
                  value={customWatermark}
                  onChange={e => setCustomWatermark(e.target.value)}
                  placeholder="e.g. SUBMITTED FOR CAMPUS INTERNSHIP"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* 5. PHOTOS TO PDF */}
          {activeTool === 'img2pdf' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Choose images from your locker or drop new ones to compile into a single A4 PDF document:
              </p>

              <div className="flex flex-wrap gap-2">
                {lockerDocuments.filter(d => d.fileType.startsWith('image/')).map(doc => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setImageFiles([...imageFiles, { id: doc.id, title: doc.title, dataUrl: doc.dataUrl }])}
                    className="px-2.5 py-1 text-xs rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-indigo-50"
                  >
                    + {doc.title}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Selected Photos for PDF ({imageFiles.length})
                </span>
                {imageFiles.map((img, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-neutral-100 dark:bg-neutral-800 text-xs">
                    <span className="truncate">{img.title}</span>
                    <button type="button" onClick={() => setImageFiles(imageFiles.filter((_, idx) => idx !== i))} className="text-rose-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. COMPRESS */}
          {activeTool === 'compress' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Select Image / Document to Compress
                </label>
                <select
                  value={compressDocId}
                  onChange={e => setCompressDocId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                >
                  {lockerDocuments.map(d => (
                    <option key={d.id} value={d.id}>{d.title} ({(d.fileSize / 1024).toFixed(0)} KB)</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Target File Size Limit
                  </label>
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {targetKb} KB
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1500}
                  step={50}
                  value={targetKb}
                  onChange={e => setTargetKb(parseInt(e.target.value, 10))}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5 font-mono">
                  <span>100 KB</span>
                  <span>500 KB</span>
                  <span>1000 KB</span>
                  <span>1.5 MB</span>
                </div>
              </div>
            </div>
          )}

          {/* 7. PASSWORD LOCK */}
          {activeTool === 'lock' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Select Document to Lock
                </label>
                <select
                  value={lockDocId}
                  onChange={e => setLockDocId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                >
                  {lockerDocuments.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Security Passcode / PIN
                </label>
                <input
                  type="password"
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* 8. CAMERA SCAN */}
          {activeTool === 'camera' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Live Scanner Viewfinder
                </span>
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    Start Camera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3 py-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300 bg-neutral-200 dark:bg-neutral-700 rounded-lg"
                  >
                    Stop Camera
                  </button>
                )}
              </div>

              <div className="relative aspect-4/3 rounded-xl bg-neutral-950 overflow-hidden flex items-center justify-center border border-neutral-800">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-4 border-2 border-dashed border-white/40 pointer-events-none rounded-lg flex items-center justify-center">
                  <span className="text-[11px] text-white/70 bg-black/50 px-2 py-1 rounded">Align document edges inside frame</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={captureCameraPage}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Page ({scannedPages.length})</span>
                </button>

                {scannedPages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setScannedPages([])}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    Clear All Scans
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 9. OCR */}
          {activeTool === 'ocr' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Select Scanned Document / Photo
                </label>
                <select
                  value={ocrDocId}
                  onChange={e => setOcrDocId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                >
                  {lockerDocuments.map(d => (
                    <option key={d.id} value={d.id}>{d.title} ({d.category.toUpperCase()})</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-neutral-500">
                Performs client-side text recognition, extracting searchable lines and detected student metadata.
              </p>
            </div>
          )}

          {/* 10. SIGN */}
          {activeTool === 'sign' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Select Document to Sign
                </label>
                <select
                  value={signDocId}
                  onChange={e => setSignDocId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                >
                  {lockerDocuments.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Draw Your Signature Below
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-xs text-neutral-500 hover:text-rose-500"
                  >
                    Clear Canvas
                  </button>
                </div>

                <canvas
                  ref={signatureCanvasRef}
                  width={500}
                  height={140}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-32 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg cursor-crosshair touch-none"
                />
                <span className="text-[11px] text-neutral-400 block mt-1">
                  Your drawn signature will be rendered onto the bottom corner with a digital timestamp seal.
                </span>
              </div>
            </div>
          )}

          {/* Action Trigger Button */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleExecuteTool}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing In-Browser...
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4" />
                  Execute {tools.find(t => t.id === activeTool)?.label}
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Column: Output & Action Panel */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white pb-2 border-b border-neutral-100 dark:border-neutral-800 mb-4">
                Toolkit Output
              </h3>

              {!outputResult && !ocrOutput ? (
                <div className="py-16 text-center text-xs text-neutral-400 space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 mx-auto flex items-center justify-center text-neutral-400">
                    <Layers className="w-6 h-6" />
                  </div>
                  <p>Configure the tool on the left and click Execute to generate your processed document.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ready to Download or Save</span>
                    </div>
                    {outputResult && (
                      <div className="text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
                        <p className="font-semibold truncate">{outputResult.title}</p>
                        <p className="font-mono tabular-nums text-[11px]">
                          {(outputResult.size / 1024).toFixed(0)} KB {outputResult.meta && `· ${outputResult.meta}`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* OCR Text Box if OCR tool */}
                  {ocrOutput && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        Extracted Searchable Text:
                      </span>
                      <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px] font-mono max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
                        {ocrOutput.text}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(ocrOutput.text);
                          toast({ type: 'success', title: 'Text Copied', message: 'OCR text copied to clipboard.' });
                        }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                      >
                        Copy Extracted Text
                      </button>
                    </div>
                  )}

                  {/* Preview box */}
                  {outputResult && outputResult.type.startsWith('image/') && (
                    <div className="aspect-4/3 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-100 flex items-center justify-center">
                      <img src={outputResult.dataUrl} alt="Output Preview" className="max-h-full object-contain" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {outputResult && (
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2 mt-4">
                <button
                  type="button"
                  onClick={handleSaveToLocker}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save to Locker Vault
                </button>

                <button
                  type="button"
                  onClick={handleDownloadOutput}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download File
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
