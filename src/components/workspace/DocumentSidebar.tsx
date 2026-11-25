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
} from 'lucide-react';

export interface DocItem {
  id: string;
  name: string;
  size: string;
  pages: number;
  status: 'indexed' | 'processing';
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
}

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  selectedDocId,
  onSelectDoc,
  denseWeight,
  onDenseWeightChange,
  topK,
  onTopKChange,
}) => {
  const [retrievalOpen, setRetrievalOpen] = useState(true);
  const [liveDocs, setLiveDocs] = useState<DocItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const fetchLiveDocs = async () => {
    try {
      const res = await fetch('/api/v1/documents', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: DocItem[] = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            size: `${(d.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`,
            pages: d.totalPages || 1,
            status: d.status === 'indexed' ? 'indexed' : 'processing',
            icon: d.name.endsWith('.md') ? 'sheet' : 'text',
          }));
          setLiveDocs(mapped);
        }
      }
    } catch {
      // Fallback silently to initial docs
    }
  };

  useEffect(() => {
    fetchLiveDocs();
  }, []);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      const newDoc = await res.json();
      const mapped: DocItem = {
        id: newDoc.id,
        name: newDoc.name,
        size: `${(newDoc.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`,
        pages: newDoc.totalPages || 1,
        status: 'indexed',
        icon: newDoc.name.endsWith('.md') ? 'sheet' : 'text',
      };

      setLiveDocs((prev) => [mapped, ...prev.filter((d) => d.id !== mapped.id)]);
      onSelectDoc(newDoc.id);
      setUploadProgress(null);
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadFile(file);
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
    <aside className="w-[260px] bg-panel border-r border-panelBorder flex flex-col shrink-0 select-none">
      {/* Başlıq */}
      <div className="h-10 border-b border-panelBorder px-3 flex items-center justify-between text-xs font-sans">
        <div className="flex items-center gap-2 text-zinc-400">
          <Folder className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-medium text-textPrimary">Indexed Documents</span>
        </div>
        <span className="text-[11px] text-zinc-400 px-1.5 py-0.5 bg-obsidian border border-panelBorder rounded-[1px] font-mono">
          {docs.length} sources
        </span>
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
          <Upload className={`w-4 h-4 ${isUploading ? 'text-accent animate-pulse' : 'text-zinc-500 group-hover:text-textPrimary'} mb-1 transition`} />
          <span className="text-xs font-sans text-textPrimary font-medium">
            {isUploading ? (uploadProgress || 'Extracting coordinates...') : 'Upload Document'}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
            {isUploading ? 'PdfPig parsing bounding boxes...' : 'PDF, Markdown up to 120MB'}
          </span>
          <input
            type="file"
            accept=".pdf,.md,.txt"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>
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
                    doc.status === 'indexed' ? 'bg-status-pass' : 'bg-zinc-400'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                <span>
                  {doc.size} • {doc.pages} pgs
                </span>
                <span className={doc.status === 'indexed' ? 'text-zinc-300' : 'text-zinc-400'}>
                  {doc.status === 'indexed' ? 'Indexed' : `Processing (${doc.progress}%)`}
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
