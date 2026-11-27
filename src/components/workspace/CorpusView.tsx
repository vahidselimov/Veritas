'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Plus,
  Search,
  FileText,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  X,
} from 'lucide-react';
import type {
  BatchIngestionResponse,
  CoordinateCacheDto,
  DocumentSummaryDto,
} from '@/types/document';
import { uploadDocumentsBatch } from '@/lib/batch-upload-client';

interface CorpusViewProps {
  onInspectInWorkspace?: (docId: string, pageNumber?: number) => void;
}

export const CorpusView: React.FC<CorpusViewProps> = ({ onInspectInWorkspace }) => {
  const [filterText, setFilterText] = useState('');
  const [liveDocs, setLiveDocs] = useState<DocumentSummaryDto[]>([]);
  const [inspectedCache, setInspectedCache] = useState<CoordinateCacheDto | null>(null);
  const [inspectedDocName, setInspectedDocName] = useState<string>('');
  const [isInspecting, setIsInspecting] = useState(false);
  const [isReparsing, setIsReparsing] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [batchSummary, setBatchSummary] = useState<BatchIngestionResponse | null>(null);

  const loadSummaries = async () => {
    try {
      const res = await fetch('/api/v1/documents/summary', { cache: 'no-store' });
      if (res.ok) {
        const data: DocumentSummaryDto[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLiveDocs(data);
        }
      }
    } catch {
      // Silent fallback to baseline list
    }
  };

  const handleCorpusUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsIngesting(true);
    try {
      const report = await uploadDocumentsBatch(e.target.files);
      setBatchSummary(report);
      await loadSummaries();
      const ready = report.results.find((r) => r.document);
      if (ready?.document) {
        await handleInspectCoordinates({
          id: ready.document.id,
          name: ready.document.name,
        });
      }
    } finally {
      setIsIngesting(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    loadSummaries();
  }, []);

  const handleInspectCoordinates = async (doc: { id: string; name: string }) => {
    setIsInspecting(true);
    setInspectedDocName(doc.name);
    try {
      const res = await fetch(`/api/v1/documents/${doc.id}/coordinates`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data: CoordinateCacheDto = await res.json();
        setInspectedCache(data);
      }
    } finally {
      setIsInspecting(false);
    }
  };

  const handleReparse = async (docId: string, docName: string) => {
    setIsReparsing(docId);
    try {
      const res = await fetch(`/api/v1/documents/${docId}/reparse`, {
        method: 'POST',
      });
      if (res.ok) {
        const data: CoordinateCacheDto = await res.json();
        setInspectedDocName(docName);
        setInspectedCache(data);
        await loadSummaries();
      }
    } finally {
      setIsReparsing(null);
    }
  };

  const fallbackRows: DocumentSummaryDto[] = [
    {
      id: 'cuda_kernel',
      name: 'cuda_kernel.pdf',
      filePath: 'uploads/cuda_kernel.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 3250585,
      totalPages: 18,
      checksum: 'sha256_8fa2b9c71e4d3a01',
      status: 'indexed',
      chunkCount: 342,
      columnCount: 1,
      totalCharacters: 18420,
      createdAt: '',
    },
    {
      id: 'architecture_v2',
      name: 'architecture_v2.pdf',
      filePath: 'uploads/architecture_v2.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 4404019,
      totalPages: 42,
      checksum: 'sha256_a1b2c3d4e5f60718',
      status: 'indexed',
      chunkCount: 710,
      columnCount: 2,
      totalCharacters: 41200,
      createdAt: '',
    },
    {
      id: 'rfc_9110',
      name: 'rfc_9110.pdf',
      filePath: 'uploads/rfc_9110.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1887436,
      totalPages: 165,
      checksum: 'sha256_f9e8d7c6b5a43210',
      status: 'indexed',
      chunkCount: 1890,
      columnCount: 1,
      totalCharacters: 94100,
      createdAt: '',
    },
    {
      id: 'pgvector_bench',
      name: 'pgvector_bench.md',
      filePath: 'uploads/pgvector_bench.md',
      mimeType: 'text/markdown',
      fileSizeBytes: 860160,
      totalPages: 12,
      checksum: 'sha256_pgvector',
      status: 'Processing (78%)',
      chunkCount: 148,
      columnCount: 1,
      totalCharacters: 6420,
      createdAt: '',
    },
  ];

  const rows = liveDocs.length > 0 ? liveDocs : fallbackRows;
  const filteredRows = rows.filter(
    (d) =>
      d.name.toLowerCase().includes(filterText.toLowerCase()) ||
      d.checksum.toLowerCase().includes(filterText.toLowerCase())
  );

  const liveStorageMb = (
    rows.reduce((sum, r) => sum + (r.fileSizeBytes || 0), 0) /
    (1024 * 1024)
  ).toFixed(2);

  return (
    <div className="flex-1 bg-obsidian flex flex-col overflow-hidden select-none">
      {/* Corpus Alt Başlığı */}
      <div className="min-h-12 border-b border-panelBorder bg-panel px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <Database className="w-4 h-4 text-accent shrink-0" />
          <span className="text-textPrimary font-bold break-words">
            CORPUS MANAGEMENT &amp; CHUNK COORDINATE INSPECTOR
          </span>
          <span className="text-panelBorder hidden sm:inline">|</span>
          <span className="text-textMuted whitespace-nowrap">TOTAL STORAGE: 9.94 MB</span>
          <span className="text-panelBorder hidden xl:inline">|</span>
          <span className="text-zinc-400 hidden xl:inline whitespace-nowrap">
            ACTIVE INDEX: {liveStorageMb} MB ({rows.length} sources)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 bg-obsidian border border-panelBorder px-2.5 py-1 rounded-[2px] flex-1 sm:flex-initial min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter documents or hashes..."
              className="bg-transparent text-xs text-textPrimary placeholder-textMuted outline-none w-full"
            />
          </div>

          <label className="px-3 py-1 bg-accent text-obsidian font-mono font-bold text-xs rounded-[2px] hover:brightness-105 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0">
            <Plus className="w-3.5 h-3.5" />
            <span>{isIngesting ? 'BATCH PARSING...' : 'INGEST DOCUMENT'}</span>
            <input
              type="file"
              multiple
              accept=".pdf,.md,.txt"
              onChange={handleCorpusUpload}
              disabled={isIngesting}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Sənədlər Cədvəli + Coordinate Inspector */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {batchSummary && (
          <div className="border border-panelBorder bg-panel rounded-[2px] p-3 font-mono text-xs space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-panelBorder pb-2">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-accent font-bold">BATCH INGESTION VALIDATION REPORT</span>
                <span className="text-zinc-400">
                  TOTAL: {batchSummary.totalFiles} • INDEXED: {batchSummary.indexedCount} • DUP:{' '}
                  {batchSummary.duplicateCount} • OCR: {batchSummary.ocrRequiredCount} • REJECTED:{' '}
                  {batchSummary.rejectedCount}
                </span>
              </div>
              <button
                onClick={() => setBatchSummary(null)}
                className="text-zinc-500 hover:text-textPrimary shrink-0"
                aria-label="Close batch summary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {batchSummary.results.map((item, idx) => (
                <div
                  key={`${item.fileName}-${idx}`}
                  className="flex flex-wrap items-center justify-between gap-2 text-[11px]"
                >
                  <span className="text-zinc-200 break-all">{item.fileName}</span>
                  <div className="flex items-center gap-3">
                    {item.errorMessage && (
                      <span className="text-red-400 text-[10px]">
                        [{item.errorCode}] {item.errorMessage}
                      </span>
                    )}
                    <span
                      className={`font-semibold ${
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
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="border border-panelBorder bg-panel rounded-[2px] overflow-x-auto">
          <table className="w-full min-w-[780px] text-left font-mono text-xs">
            <thead className="bg-obsidian border-b border-panelBorder text-textMuted text-[11px]">
              <tr>
                <th className="py-3 px-4 font-normal">DOCUMENT NAME</th>
                <th className="py-3 px-4 font-normal">PAGES</th>
                <th className="py-3 px-4 font-normal">CHUNKS / LAYOUT</th>
                <th className="py-3 px-4 font-normal">CHAR OFFSETS</th>
                <th className="py-3 px-4 font-normal">INDEX SIZE</th>
                <th className="py-3 px-4 font-normal">STATUS</th>
                <th className="py-3 px-4 font-normal text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panelBorder text-textPrimary">
              {filteredRows.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-panelHover transition bg-panel/50"
                >
                  <td className="py-3.5 px-4 font-semibold text-accent flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>{doc.name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">{doc.totalPages}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-1.5 py-0.5 bg-obsidian border border-panelBorder rounded-[1px] mr-1.5">
                      {doc.chunkCount} chunks
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {doc.columnCount}-col XY-Cut
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-textMuted">
                    {doc.totalCharacters > 0
                      ? `0..${doc.totalCharacters.toLocaleString()} chars`
                      : 'unmapped'}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    {(doc.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-semibold flex items-center gap-1 ${
                        doc.status.toLowerCase() === 'indexed'
                          ? 'text-status-pass'
                          : doc.status.toLowerCase() === 'ocr_required'
                          ? 'text-amber-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      {doc.status.toLowerCase() === 'indexed' && (
                        <CheckCircle2 className="w-3 h-3 text-status-pass" />
                      )}
                      <span>
                        {doc.status.toLowerCase() === 'indexed'
                          ? 'Indexed'
                          : doc.status.toLowerCase() === 'ocr_required'
                          ? 'OCR Needed'
                          : doc.status}
                      </span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => handleInspectCoordinates(doc)}
                      className="px-2 py-0.5 bg-obsidian border border-panelBorder text-textMuted hover:text-textPrimary rounded-[1px] transition text-[10px]"
                    >
                      INSPECT BBOX
                    </button>
                    {doc.name.endsWith('.pdf') && (
                      <button
                        onClick={() => handleReparse(doc.id, doc.name)}
                        disabled={isReparsing === doc.id}
                        className="px-2 py-0.5 bg-obsidian border border-panelBorder text-zinc-400 hover:text-accent rounded-[1px] transition text-[10px] inline-flex items-center gap-1"
                        title="Re-extract XY-Cut columns & offsets"
                      >
                        <RefreshCw
                          className={`w-2.5 h-2.5 ${
                            isReparsing === doc.id ? 'animate-spin' : ''
                          }`}
                        />
                        <span>REPARSE</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Live Coordinate & Offset Inspector Drawer */}
        {(isInspecting || inspectedCache) && (
          <div className="border border-panelBorder bg-panel rounded-[2px] overflow-hidden font-mono text-xs">
            <div className="px-4 py-2.5 bg-obsidian border-b border-panelBorder flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                <span className="text-accent font-semibold break-all">
                  COORDINATE &amp; OFFSET INSPECTOR: {inspectedDocName}
                </span>
                {inspectedCache && (
                  <>
                    <span className="px-1.5 py-0.5 border border-panelBorder bg-panel text-[10px]">
                      CACHE: {inspectedCache.cacheHit ? 'HIT' : 'MISS'} (
                      {inspectedCache.lookupMs.toFixed(2)}ms)
                    </span>
                    <span className="px-1.5 py-0.5 border border-panelBorder bg-panel text-[10px]">
                      XY-CUT: {inspectedCache.columnCount} COL
                    </span>
                    <span className="px-1.5 py-0.5 border border-panelBorder bg-panel text-[10px]">
                      CHARS: 0..{inspectedCache.totalCharacters}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {inspectedCache && onInspectInWorkspace && (
                  <button
                    onClick={() =>
                      onInspectInWorkspace(
                        inspectedCache.documentId,
                        inspectedCache.chunks[0]?.pageNumber || 1
                      )
                    }
                    className="px-2 py-0.5 bg-accent text-obsidian font-semibold text-[10px] rounded-[1px] inline-flex items-center gap-1"
                  >
                    <span>OPEN CANVAS</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  onClick={() => setInspectedCache(null)}
                  className="text-zinc-400 hover:text-textPrimary"
                  aria-label="Close inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isInspecting ? (
              <div className="p-6 text-zinc-400 text-center">
                Querying IMemoryCache coordinate store...
              </div>
            ) : inspectedCache && inspectedCache.chunks.length > 0 ? (
              <div className="max-h-72 overflow-y-auto divide-y divide-panelBorder">
                {inspectedCache.chunks.map((c) => (
                  <div
                    key={c.id}
                    className="px-4 py-2.5 flex flex-col gap-1 hover:bg-panelHover"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-400">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-textPrimary font-semibold">
                          ORD #{c.readingOrder + 1}
                        </span>
                        <span>PAGE {c.pageNumber}</span>
                        <span>COL {c.columnIndex + 1}</span>
                        <span>TYPE {c.blockType.toUpperCase()}</span>
                        <span className="text-accent">
                          CHARS [{c.charStartIndex}..{c.charEndIndex}]
                        </span>
                      </div>
                      <span>
                        BBox({c.bbox.x.toFixed(3)}, {c.bbox.y.toFixed(3)},{' '}
                        {c.bbox.w.toFixed(3)}, {c.bbox.h.toFixed(3)}) •{' '}
                        {c.lineBboxes?.length ?? 0} lines
                      </span>
                    </div>
                    <p className="text-[11px] font-sans text-zinc-300 line-clamp-2">
                      {c.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-zinc-500 text-center">
                No spatial chunks cached for this document.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
