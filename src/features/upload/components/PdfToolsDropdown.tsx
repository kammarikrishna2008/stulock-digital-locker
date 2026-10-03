import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
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
  Wrench,
  Sparkle,
} from 'lucide-react';
import { PdfToolType } from './PdfToolModal';

interface PdfToolsDropdownProps {
  onSelectTool: (tool: PdfToolType) => void;
  className?: string;
  hasDocument?: boolean;
}

export const PDF_TOOLS_LIST: {
  id: PdfToolType;
  label: string;
  desc: string;
  badge?: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    id: 'compress',
    label: 'Compress Document',
    desc: 'Target 200 KB / 500 KB / 1 MB portals',
    badge: 'Popular',
    icon: <Sliders className="w-4 h-4" />,
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
  },
  {
    id: 'merge',
    label: 'Merge Files into PDF',
    desc: 'Combine multiple PDFs and images into one',
    badge: 'Multi-file',
    icon: <Layers className="w-4 h-4" />,
    color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60',
  },
  {
    id: 'extract',
    label: 'Split & Extract Pages',
    desc: 'Extract specific pages or page ranges',
    icon: <Scissors className="w-4 h-4" />,
    color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60',
  },
  {
    id: 'rotate',
    label: 'Rotate Pages (+90° / 180°)',
    desc: 'Fix sideways or inverted scans',
    icon: <RotateCw className="w-4 h-4" />,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
  },
  {
    id: 'watermark',
    label: 'Add Watermark Overlay',
    desc: 'Stamp verification & copyright watermark',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60',
  },
  {
    id: 'signature',
    label: 'Digital Signature Pad',
    desc: 'Draw and stamp your signature',
    icon: <PenTool className="w-4 h-4" />,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
  },
  {
    id: 'protect',
    label: 'Password & PIN Protection',
    desc: 'Lock document with encryption PIN',
    icon: <KeyRound className="w-4 h-4" />,
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
  },
  {
    id: 'img2pdf',
    label: 'Images to PDF Converter',
    desc: 'Compile photo gallery into standard PDF',
    icon: <FilePlus className="w-4 h-4" />,
    color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60',
  },
  {
    id: 'ocr',
    label: 'OCR Text Recognition',
    desc: 'Extract readable text and copy',
    badge: 'Smart',
    icon: <ScanText className="w-4 h-4" />,
    color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60',
  },
  {
    id: 'camera',
    label: 'CamScanner Live Camera',
    desc: 'Multi-page capture with contrast filters',
    badge: 'CamScanner',
    icon: <Camera className="w-4 h-4" />,
    color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60',
  },
];

export const PdfToolsDropdown: React.FC<PdfToolsDropdownProps> = ({
  onSelectTool,
  className = '',
  hasDocument = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800/90 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-3 text-xs font-bold text-neutral-800 dark:text-neutral-100 group"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <span>PDF & Document Toolkit</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold">
            10 Tools
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200/90 dark:border-neutral-800/90 shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
              Select Processing Tool
            </span>
            <span className="text-[10px] font-mono text-neutral-400">100% In-Browser</span>
          </div>

          <div className="max-h-80 overflow-y-auto py-1 space-y-0.5 scrollbar-thin">
            {PDF_TOOLS_LIST.map(tool => (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSelectTool(tool.id);
                }}
                className="w-full px-3 py-2 rounded-xl text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors flex items-center gap-3 group"
              >
                <div className={`p-2 rounded-xl ${tool.color} shrink-0 group-hover:scale-105 transition-transform`}>
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      {tool.label}
                    </span>
                    {tool.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-500 line-clamp-1">
                    {tool.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 rounded-xl text-[10px] text-neutral-500 text-center font-medium">
            Opens in a dedicated popup window for quick processing
          </div>
        </div>
      )}
    </div>
  );
};
