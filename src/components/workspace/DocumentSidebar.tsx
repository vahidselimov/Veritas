'use client';

import React, { useState, useEffect } from 'react';
import {
  Folder,
  Upload,
  FileText,
  FileCode,
  FileSpreadsheet,
  SlidersHorizontal,
  ChevronDown,
  X,
} from 'lucide-react';
import { uploadDocumentsBatch } from '@/lib/batch-upload-client';
import type { BatchIngestionResponse, UploadedDocumentDto } from '@/types/document';

export interface DocItem {
  id: string;
  name: string;
  size: string;
  pages: number;
  status: 'indexed' | 'processing' | 'ocr_required';
  progress?: number;
  icon: 'text' | 'code' | 'sheet';
}

interface DocumentSidebarProps {
  selectedDocId: string;
  onSelectDoc: (id: string) => void;
  denseWeight: number;
  onDenseWeightChange: (weight: number) => void;
  topK: number;
  onTopKChange: (k: number) => void;
  className?: string;
  onCloseDrawer?: () => void;
}

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  selectedDocId,
  onSelectDoc,
  denseWeight,
  onDenseWeightChange,
  topK,
  onTopKChange,
  className = '',
  onCloseDrawer,
}) => {
  const [retrievalOpen, setRetrievalOpen] = useState(true);
  const [liveDocs, setLiveDocs] = useState<DocItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [batchReport, setBatchReport] = useState<BatchIngestionResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const mapDocToItem = (d: UploadedDocumentDto): DocItem => ({
    id: d.id,
    name: d.name,
    size: `${(d.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`,
    pages: d.totalPages || 1,
    status:
      d.status === 'indexed'
        ? 'indexed'
        : d.status === 'ocr_required'
        ? 'ocr_required'
        : 'processing',
    icon: d.name.endsWith('.md') ? 'sheet' : 'text',
  });

  const fetchLiveDocs = async () => {
    try {
      const res = await fetch('/api/v1/documents', { cache: 'no-store' });
      if (res.ok) {
        const data: UploadedDocumentDto[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLiveDocs(data.map(mapDocToItem));
        }
      }
    } catch {
      // Fallback silently to initial docs
    }
  };

  useEffect(() => {
    fetchLiveDocs();
  }, []);

  const processBatchFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(
      fileArray.length === 1
        ? `Validating ${fileArray[0].name}...`
        : `Batch validating ${fileArray.length} files...`
    );

    try {
      const report = await uploadDocumentsBatch(fileArray);
      setBatchReport(report);

      await fetchLiveDocs();

      const firstReady = report.results.find((r) => r.document);
      if (firstReady?.document) {
        onSelectDoc(firstReady.document.id);
      }
      setUploadProgress(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Batch upload error';
      setUploadError(msg);
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await processBatchFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processBatchFiles(e.dataTransfer.files);
    }
  };

  const defaultDocs: DocItem[] = [
    {
      id: 'cuda_kernel',
      name: 'cuda_kernel.pdf',
      size: '3.1 MB',
      pages: 18,
      status: 'indexed',
      icon: 'text',
    },
    {
      id: 'architecture_v2',
      name: 'architecture_v2.pdf',
      size: '4.2 MB',
      pages: 42,
      status: 'indexed',
      icon: 'code',
    },
    {
      id: 'rfc_9110',
      name: 'rfc_9110.pdf',
      size: '1.8 MB',
      pages: 165,
      status: 'indexed',
      icon: 'text',
    },
    {
      id: 'pgvector_bench',
      name: 'pgvector_bench.md',
      size: '840 KB',
      pages: 12,
      status: 'processing',
      progress: 78,
      icon: 'sheet',
    },
  ];

  const docs = liveDocs.length > 0 ? liveDocs : defaultDocs;

  return (
    <aside
      className={`bg-panel border-r border-panelBorder flex flex-col shrink-0 select-none ${
        className || 'w-full xl:w-[260px]'
      }`}
    >
      {/* Başlıq */}
      <div className="h-10 border-b border-panelBorder px-3 flex items-center justify-between text-xs font-sans shrink-0">
        <div className="flex items-center gap-2 text-zinc-400">
          <Folder className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-medium text-textPrimary">Indexed Documents</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-400 px-1.5 py-0.5 bg-obsidian border border-panelBorder rounded-[1px] font-mono">
            {docs.length} sources
          </span>
          {onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              aria-label="Close sources drawer"
              className="hidden md:inline-flex xl:hidden p-1 text-zinc-400 hover:text-textPrimary border border-panelBorder rounded-[1px] bg-obsidian"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Sənəd Yükləmə Dropzone */}
      <div className="p-3 border-b border-panelBorder">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border border-dashed ${
            isDragging ? 'border-accent bg-panelHover' : 'border-panelBorder hover:border-zinc-500 bg-obsidian/70 hover:bg-panelHover'
          } p-3 rounded-[2px] flex flex-col items-center justify-center text-center cursor-pointer transition group`}
        >
          <Upload className={`w-4 h-4 ${isUploading ? 'text-accent' : 'text-zinc-500 group-hover:text-textPrimary'} mb-1 transition`} />
          <span className="text-xs font-sans text-textPrimary font-medium">
            {isUploading ? (uploadProgress || 'Extracting coordinates...') : 'Upload Documents'}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
            {isUploading ? 'Validating & XY-Cut parsing...' : 'PDF, MD, TXT • Batch up to 25 files'}
          </span>
          <input
            type="file"
            multiple
            accept=".pdf,.md,.txt"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>

        {uploadError && (
          <div className="mt-2 p-2 bg-obsidian border border-red-500/50 rounded-[2px] text-[10px] font-mono text-red-400 flex items-start justify-between gap-1.5">
            <span className="break-words">{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-zinc-500 hover:text-textPrimary shrink-0"
              aria-label="Dismiss error"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {batchReport && (
          <div className="mt-2 p-2 bg-obsidian border border-panelBorder rounded-[2px] text-[10px] font-mono space-y-1">
            <div className="flex items-center justify-between text-zinc-300 border-b border-panelBorder pb-1">
              <span>
                BATCH ({batchReport.totalFiles}): {batchReport.indexedCount} new •{' '}
                {batchReport.duplicateCount} dup • {batchReport.rejectedCount} err
              </span>
              <button
                type="button"
                onClick={() => setBatchReport(null)}
                className="text-zinc-500 hover:text-textPrimary"
                aria-label="Close batch report"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="max-h-20 overflow-y-auto space-y-0.5">
              {batchReport.results.map((item, idx) => (
                <div
                  key={`${item.fileName}-${idx}`}
                  className="flex items-center justify-between gap-1 text-[9px]"
                  title={item.errorMessage || item.status}
                >
                  <span className="truncate text-zinc-400">{item.fileName}</span>
                  <span
                    className={`shrink-0 font-semibold ${
                      item.status === 'indexed'
                        ? 'text-status-pass'
                        : item.status === 'duplicate' || item.status === 'ocr_required'
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sənədlər Siyahısı */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs font-sans">
        <div className="text-[11px] text-zinc-500 px-2 py-1 flex justify-between font-mono">
          <span>SOURCE FILE</span>
          <span>STATE</span>
        </div>

        {docs.map((doc) => {
          const isSelected = selectedDocId === doc.id;
          return (
            <div
              key={doc.id}
              onClick={() => onSelectDoc(doc.id)}
              className={`doc-item p-2.5 rounded-[2px] cursor-pointer transition border ${
                isSelected
                  ? 'bg-[#171a21] border-zinc-700/60'
                  : 'hover:bg-panelHover border-transparent hover:border-panelBorder'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-textPrimary flex items-center gap-1.5 truncate">
                  {doc.icon === 'text' && (
                    <FileText className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                  )}
                  {doc.icon === 'code' && (
                    <FileCode className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  )}
                  {doc.icon === 'sheet' && (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  )}
                  <span className="truncate">{doc.name}</span>
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    doc.status === 'indexed'
                      ? 'bg-status-pass'
                      : doc.status === 'ocr_required'
                      ? 'bg-amber-400'
                      : 'bg-zinc-400'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                <span>
                  {doc.size} • {doc.pages} pgs
                </span>
                <span
                  className={
                    doc.status === 'indexed'
                      ? 'text-zinc-300'
                      : doc.status === 'ocr_required'
                      ? 'text-amber-400'
                      : 'text-zinc-400'
                  }
                >
                  {doc.status === 'indexed'
                    ? 'Indexed'
                    : doc.status === 'ocr_required'
                    ? 'OCR Needed'
                    : `Processing (${doc.progress ?? 75}%)`}
                </span>
              </div>

              {doc.status === 'processing' && doc.progress && (
                <div className="w-full bg-[#1e2229] h-1 mt-1.5 rounded-[1px] overflow-hidden">
                  <div
                    className="bg-zinc-400 h-full transition-all duration-300"
                    style={{ width: `${doc.progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hibrid Retrieval Tənzimləmələri */}
      <div className="p-3 border-t border-panelBorder bg-obsidian text-xs font-sans">
        <div
          className="flex items-center justify-between text-zinc-400 mb-2 cursor-pointer"
          onClick={() => setRetrievalOpen(!retrievalOpen)}
        >
          <span className="flex items-center gap-1.5 text-textPrimary font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
            Retrieval Settings
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${
              retrievalOpen ? 'rotate-180' : ''
            }`}
          />
        </div>

        {retrievalOpen && (
          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-[11px] text-zinc-400 mb-1 font-mono">
                <span>Hybrid balance</span>
                <span className="text-zinc-200">
                  Dense {denseWeight}% / BM25 {100 - denseWeight}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={denseWeight}
                onChange={(e) => onDenseWeightChange(Number(e.target.value))}
                className="w-full accent-zinc-300 h-1 bg-[#222731] rounded-[1px] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Candidates (Top-k):</span>
              <select
                value={topK}
                onChange={(e) => onTopKChange(Number(e.target.value))}
                className="bg-panel border border-panelBorder rounded-[1px] px-1.5 py-0.5 text-zinc-300 font-mono focus:outline-none focus:border-zinc-500 text-xs"
              >
                <option value={20}>20 chunks</option>
                <option value={40}>40 chunks</option>
                <option value={80}>80 chunks</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Reranker:</span>
              <span className="text-zinc-300 font-mono text-[10px]">
                bge-reranker-large
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
