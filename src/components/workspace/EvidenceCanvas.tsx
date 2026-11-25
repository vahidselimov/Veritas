'use client';

import React, { useRef, useEffect, useState } from 'react';
import { BoxSelect, Layers, AlignLeft } from 'lucide-react';
import type { DocumentChunkDto } from '@/types/document';

interface EvidenceCanvasProps {
  documentName: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  activeCitation: number | null;
  showAllBboxes: boolean;
  onToggleAllBboxes: () => void;
  zoomPercent: number;
  onZoomChange: (delta: number) => void;
  pageChunks?: DocumentChunkDto[];
  cacheTelemetry?: {
    cacheHit: boolean;
    lookupMs: number;
    columnCount: number;
  } | null;
  selectedChunkId?: string | null;
  onSelectChunk?: (chunkId: string) => void;
}

export const EvidenceCanvas: React.FC<EvidenceCanvasProps> = ({
  documentName,
  currentPage,
  totalPages,
  onPageChange,
  activeCitation,
  showAllBboxes,
  onToggleAllBboxes,
  zoomPercent,
  onZoomChange,
  pageChunks = [],
  cacheTelemetry = null,
  selectedChunkId = null,
  onSelectChunk,
}) => {
  const target1Ref = useRef<HTMLDivElement>(null);
  const target2Ref = useRef<HTMLDivElement>(null);
  const target3Ref = useRef<HTMLDivElement>(null);
  const [canvasMode, setCanvasMode] = useState<'flow' | 'spatial'>('flow');

  const isSeededCudaView =
    documentName === 'cuda_kernel.pdf' && currentPage === 4;

  // Sitat klikləndikdə həmin kordinata rəvan sürüşmə (smooth scroll)
  useEffect(() => {
    if (activeCitation === 1 && target1Ref.current) {
      target1Ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (activeCitation === 2 && target2Ref.current) {
      target2Ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (activeCitation === 3 && target3Ref.current) {
      target3Ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeCitation]);

  const sortedChunks = [...pageChunks].sort(
    (a, b) => a.readingOrder - b.readingOrder || a.chunkIndex - b.chunkIndex
  );

  const detectedCols =
    cacheTelemetry?.columnCount ||
    (sortedChunks.length > 0
      ? Math.max(...sortedChunks.map((c) => c.columnIndex)) + 1
      : 1);

  return (
    <section className="flex-1 bg-[#151518] flex flex-col overflow-hidden relative select-none">
      {/* Evidence Canvas İdarəetmə Zolağı */}
      <div className="h-10 border-b border-panelBorder bg-panel px-4 flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center gap-2 text-xs font-sans">
          <span className="text-zinc-500">Document:</span>
          <span className="font-medium text-textPrimary font-mono text-[11px]">
            {documentName}
          </span>
          <span className="px-1.5 py-0.5 bg-obsidian border border-panelBorder rounded-[1px] text-[10px] text-zinc-400 font-mono">
            p. {String(currentPage).padStart(2, '0')} / {totalPages}
          </span>
          {cacheTelemetry && (
            <span
              className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 bg-obsidian border border-panelBorder rounded-[1px] text-[10px] text-zinc-400 font-mono"
              title="Normalized Coordinate Cache Telemetry"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  cacheTelemetry.cacheHit ? 'bg-status-pass' : 'bg-accent'
                }`}
              />
              <span>
                COORD {cacheTelemetry.cacheHit ? 'HIT' : 'MISS'} •{' '}
                {cacheTelemetry.lookupMs.toFixed(2)}ms • {detectedCols}-COL
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-sans">
          {/* Reading Flow vs Spatial 2D Plane */}
          {!isSeededCudaView && sortedChunks.length > 0 && (
            <div className="flex items-center border border-panelBorder rounded-[2px] bg-obsidian p-0.5 font-mono text-[10px]">
              <button
                onClick={() => setCanvasMode('flow')}
                className={`px-1.5 py-0.5 flex items-center gap-1 rounded-[1px] transition ${
                  canvasMode === 'flow'
                    ? 'bg-panelElevated text-textPrimary'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <AlignLeft className="w-3 h-3" />
                <span>Flow</span>
              </button>
              <button
                onClick={() => setCanvasMode('spatial')}
                className={`px-1.5 py-0.5 flex items-center gap-1 rounded-[1px] transition ${
                  canvasMode === 'spatial'
                    ? 'bg-panelElevated text-textPrimary'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Spatial BBox</span>
              </button>
            </div>
          )}

          {/* Səhifələmə */}
          <div className="flex items-center gap-1 border border-panelBorder rounded-[2px] bg-obsidian px-1.5 py-0.5 font-mono text-[11px]">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Previous page"
              className="text-zinc-400 hover:text-textPrimary px-1 disabled:opacity-40"
            >
              &lt;
            </button>
            <span className="text-zinc-300 px-1">
              p. {String(currentPage).padStart(2, '0')}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
              className="text-zinc-400 hover:text-textPrimary px-1 disabled:opacity-40"
            >
              &gt;
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 border border-panelBorder rounded-[2px] bg-obsidian px-2 py-0.5 text-[11px] font-mono text-zinc-400">
            <button
              onClick={() => onZoomChange(-10)}
              aria-label="Zoom out"
              className="hover:text-textPrimary"
            >
              -
            </button>
            <span className="text-zinc-200 px-1">{zoomPercent}%</span>
            <button
              onClick={() => onZoomChange(10)}
              aria-label="Zoom in"
              className="hover:text-textPrimary"
            >
              +
            </button>
          </div>

          {/* BBox Aç/Bağla Keçidi */}
          <button
            onClick={onToggleAllBboxes}
            className={`px-2 py-0.5 border border-panelBorder rounded-[2px] flex items-center gap-1.5 transition font-sans text-[11px] ${
              showAllBboxes
                ? 'bg-panelElevated text-textPrimary border-zinc-500'
                : 'bg-obsidian text-zinc-400 hover:text-textPrimary'
            }`}
          >
            <BoxSelect className="w-3 h-3 text-zinc-400" />
            <span>Show all bounding boxes</span>
          </button>
        </div>
      </div>

      {/* Kağız Vərəqinin Mərkəzləşdirilmiş Görünüşü (#F8F7F4) */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center items-start">
        <article
          style={{ transform: `scale(${zoomPercent / 100})`, transformOrigin: 'top center' }}
          className="paper-sheet w-full max-w-[680px] text-zinc-900 rounded-[2px] p-10 md:p-12 font-editorial relative transition-transform duration-150"
        >
          {isSeededCudaView ? (
            <>
              {/* Məqalə Meta Başlığı */}
              <div className="border-b border-zinc-300 pb-3 mb-6 font-mono text-[10px] text-zinc-500 uppercase tracking-wider flex justify-between items-center">
                <div>
                  <span>MIT CSAIL Technical Report TR-2024-4409</span>
                  <span className="mx-2">•</span>
                  <span>ISSN: 2190-5541</span>
                </div>
                <div className="text-zinc-600 font-mono">
                  Page {currentPage} of {totalPages}
                </div>
              </div>

              {/* Məqalə Əsas Başlığı */}
              <header className="mb-6 text-left">
                <h1 className="text-2xl font-bold font-serif tracking-tight text-zinc-950 mb-2 leading-tight">
                  Zero-Copy Asynchronous Pinned Allocations in High-Throughput GPGPU Kernels
                </h1>
                <p className="font-sans text-xs text-zinc-600 mt-1">
                  Dr. E. Vance • System Architecture Laboratory, Department of Electrical
                  Engineering &amp; Computer Science
                </p>
              </header>

              {/* Abstract */}
              <div className="bg-[#f2efe9] border-l-2 border-zinc-700 p-3.5 mb-6 text-xs font-sans text-zinc-700 leading-relaxed rounded-r-[1px]">
                <span className="font-semibold text-zinc-900 block mb-1 font-mono text-[10px] uppercase tracking-wider">
                  Abstract
                </span>
                Synchronous page-locking mechanisms introduce significant tail latencies
                in multi-gigabyte continuous tensor streaming workflows. In this paper, we
                evaluate a non-blocking allocation topology combining kernel-space unified
                memory rings with ring-pointer arbitration to overcome conventional
                host-to-device PCIe bottlenecks.
              </div>

              {/* Əsas Elmi Mətn və Bounding Box-lar */}
              <section className="space-y-4 text-sm leading-relaxed text-zinc-800 font-serif">
                <h2 className="font-sans font-semibold text-sm text-zinc-900 uppercase tracking-wide border-b border-zinc-200 pb-1">
                  1. Foundations &amp; Virtual Memory Architecture
                </h2>
                <p className="leading-relaxed">
                  Traditional GPGPU pipelines require memory to be explicit host-pinned
                  prior to initiating direct memory access (DMA) transfers. When
                  executing high-concurrency micro-batch streams, frequent calls to
                  standard memory locking APIs (e.g.,{' '}
                  <code className="font-mono text-xs bg-zinc-200 px-1 py-0.5 rounded-[1px] text-zinc-800">
                    cudaHostRegister
                  </code>
                  ) incur kernel-mode transitions and thread serialization.
                </p>

                {/* BBOX 1: Citation [1] Target */}
                <div
                  ref={target1Ref}
                  className={`relative p-3 rounded-[1px] transition-all duration-150 ${
                    activeCitation === 1
                      ? 'bg-accent/25 border-1.5 border-accent outline outline-2 outline-accent/60 animate-reticle-lock'
                      : showAllBboxes
                      ? 'border border-zinc-300 bg-zinc-100/60'
                      : 'border border-transparent'
                  }`}
                >
                  <div className="absolute -left-14 top-1 text-[10px] font-mono text-zinc-600 bg-white border border-zinc-300 px-1 py-0.5 rounded-[1px] hidden md:block">
                    [Ref 1]
                  </div>
                  <div className="absolute right-2 -top-2.5 text-[9px] font-mono text-zinc-700 bg-white/95 px-1.5 py-0.5 rounded-[1px] border border-zinc-300">
                    Y: 142.4, X: 48.0, W: 540
                  </div>
                  <p className="text-zinc-950 font-normal leading-relaxed">
                    By bypassing the standard runtime pinned memory allocations through
                    unified virtual memory addressing and custom ring-buffer pools, the
                    CUDA host allocator completely eliminates runtime kernel page locking
                    faults. In typical synchronous drivers, operating systems incur
                    non-trivial TLB invalidation and mprotect overhead when pinning
                    memory slabs.
                  </p>
                </div>

                {/* BBOX 2: Citation [2] Target */}
                <div
                  ref={target2Ref}
                  className={`relative p-3 rounded-[1px] transition-all duration-150 ${
                    activeCitation === 2
                      ? 'bg-accent/25 border-1.5 border-accent outline outline-2 outline-accent/60 animate-reticle-lock'
                      : showAllBboxes
                      ? 'border border-zinc-300 bg-zinc-100/60'
                      : 'border border-transparent'
                  }`}
                >
                  <div className="absolute -left-14 top-1 text-[10px] font-mono text-zinc-600 bg-white border border-zinc-300 px-1 py-0.5 rounded-[1px] hidden md:block">
                    [Ref 2]
                  </div>
                  <div className="absolute right-2 -top-2.5 text-[9px] font-mono text-zinc-700 bg-white px-1.5 py-0.5 rounded-[1px] border border-zinc-300">
                    Y: 280.1, X: 48.0, W: 540
                  </div>
                  <p className="text-zinc-900 leading-relaxed">
                    Furthermore, asynchronous Direct Memory Access (DMA) transfers are
                    directly mapped into contiguous physical host registers, ensuring
                    predictable p99 throughput without TLB thrashing or PCI-e saturation
                    bottlenecks during massive mini-batch pipelining.
                  </p>
                </div>

                {/* BBOX 3: Citation [3] Target */}
                <div
                  ref={target3Ref}
                  className={`relative p-3 rounded-[1px] transition-all duration-150 ${
                    activeCitation === 3
                      ? 'bg-accent/25 border-1.5 border-accent outline outline-2 outline-accent/60 animate-reticle-lock'
                      : showAllBboxes
                      ? 'border border-zinc-300 bg-zinc-100/60'
                      : 'border border-transparent'
                  }`}
                >
                  <div className="absolute -left-14 top-1 text-[10px] font-mono text-zinc-600 bg-white border border-zinc-300 px-1 py-0.5 rounded-[1px] hidden md:block">
                    [Ref 3]
                  </div>
                  <p className="text-zinc-900 leading-relaxed">
                    Benchmarking on eight interconnected H100 SXM5 nodes demonstrates that
                    zero-copy ring arbiter streaming achieves 98.4% of peak PCIe Gen5
                    line-rate bandwidth (62.8 GB/s), compared to only 71.2% observed in
                    default unified memory drivers under heavy thrash conditions.
                  </p>
                </div>

                {/* Riyazi Düstur (Equation 4.2) */}
                <div className="my-5 p-3.5 bg-zinc-100 border border-zinc-300 text-center font-mono text-xs text-zinc-900 rounded-[1px]">
                  <div className="text-[10px] text-zinc-500 mb-1 font-sans">
                    Equation 4.2 — Stream Arbitration Bandwidth
                  </div>
                  <span>
                    Γ(t) = lim_{'{Δt→0}'} [ Σ_{'{k=1}^N'} (B_k · η_k) / (T_DMA + δ_TLB) ] ≈ 62.84 GB/s
                  </span>
                </div>

                <p className="text-zinc-800 leading-relaxed">
                  This behavior confirms that separating buffer lifecycle from driver
                  interrupt scheduling guarantees deterministic execution bounds for
                  real-time model serving.
                </p>
              </section>

              {/* Vərəq Altlığı */}
              <div className="mt-10 pt-4 border-t border-zinc-300 flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>Corpus Grounding Engine • Verified Checksum: 0x8fa2b9</span>
                <span>MIT CSAIL Systems</span>
              </div>
            </>
          ) : (
            <>
              {/* Live Uploaded / Real PDF Spatial Chunks View */}
              <div className="border-b border-zinc-300 pb-3 mb-6 font-mono text-[10px] text-zinc-500 uppercase tracking-wider flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>{documentName}</span>
                  <span>•</span>
                  <span>XY-CUT {detectedCols}-COLUMN LAYOUT</span>
                </div>
                <div className="text-zinc-600 font-mono">
                  Page {currentPage} of {totalPages}
                </div>
              </div>

              {sortedChunks.length === 0 ? (
                <div className="py-16 text-center font-mono text-xs text-zinc-500 border border-dashed border-zinc-300 rounded-[2px]">
                  <p className="font-semibold text-zinc-700 mb-1">
                    No extracted text chunks found on page {currentPage}
                  </p>
                  <p className="text-[11px]">
                    Try switching pages or trigger Reparse XY-Cut from Corpus Inspector.
                  </p>
                </div>
              ) : canvasMode === 'spatial' ? (
                /* Normalized 2D Coordinate Map (1:1 A4 Ratio) */
                <div className="relative w-full aspect-[595/842] border border-zinc-300 bg-white overflow-hidden">
                  {sortedChunks.map((chunk) => {
                    const isSelected = selectedChunkId === chunk.id;
                    return (
                      <React.Fragment key={chunk.id}>
                        {/* Line-level fine BBoxes when selected or showAllBboxes */}
                        {(isSelected || showAllBboxes) &&
                          chunk.lineBboxes?.map((lb, lIdx) => (
                            <div
                              key={`${chunk.id}-line-${lIdx}`}
                              style={{
                                left: `${lb.x * 100}%`,
                                top: `${lb.y * 100}%`,
                                width: `${lb.w * 100}%`,
                                height: `${lb.h * 100}%`,
                              }}
                              className="absolute border border-amber-500/40 bg-amber-400/10 pointer-events-none"
                            />
                          ))}
                        {/* Enclosing Chunk BBox */}
                        <button
                          type="button"
                          onClick={() => onSelectChunk?.(chunk.id)}
                          style={{
                            left: `${chunk.bbox.x * 100}%`,
                            top: `${chunk.bbox.y * 100}%`,
                            width: `${chunk.bbox.w * 100}%`,
                            height: `${chunk.bbox.h * 100}%`,
                          }}
                          className={`absolute text-left p-1 overflow-hidden transition-all duration-150 ${
                            isSelected
                              ? 'border-2 border-accent bg-accent/25 z-20 animate-reticle-lock'
                              : 'border border-zinc-400/70 bg-zinc-200/35 hover:border-accent hover:bg-accent/15 z-10'
                          }`}
                          title={`#${chunk.readingOrder + 1} | Col ${chunk.columnIndex + 1} | Chars ${chunk.charStartIndex}..${chunk.charEndIndex}`}
                        >
                          <span className="inline-block bg-zinc-900 text-white font-mono text-[8px] px-1 leading-tight mr-1">
                            #{chunk.readingOrder + 1} C{chunk.columnIndex + 1}
                          </span>
                          <span className="text-[8px] leading-tight text-zinc-800 font-serif line-clamp-3">
                            {chunk.content}
                          </span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                /* Canonical Reading Flow View ordered by XY-Cut */
                <div
                  className={
                    detectedCols > 1
                      ? 'grid grid-cols-1 md:grid-cols-2 gap-4 items-start'
                      : 'space-y-4'
                  }
                >
                  {sortedChunks.map((chunk) => {
                    const isSelected = selectedChunkId === chunk.id;
                    return (
                      <div
                        key={chunk.id}
                        onClick={() => onSelectChunk?.(chunk.id)}
                        className={`relative p-3.5 rounded-[1px] cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-accent/25 border-1.5 border-accent outline outline-2 outline-accent/60 animate-reticle-lock'
                            : showAllBboxes
                            ? 'border border-zinc-400 bg-zinc-100/70'
                            : 'border border-zinc-200 hover:border-zinc-400 bg-white/60'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 font-mono text-[9px] text-zinc-600">
                          <span className="px-1.5 py-0.5 bg-zinc-900 text-zinc-100 rounded-[1px]">
                            #{chunk.readingOrder + 1} • COL {chunk.columnIndex + 1} •{' '}
                            {chunk.blockType.toUpperCase()}
                          </span>
                          <span className="px-1.5 py-0.5 bg-white border border-zinc-300 rounded-[1px]">
                            chars {chunk.charStartIndex}..{chunk.charEndIndex}
                          </span>
                        </div>

                        <p
                          className={`text-zinc-900 leading-relaxed ${
                            chunk.blockType === 'heading'
                              ? 'font-sans font-semibold text-sm text-zinc-950'
                              : 'font-serif text-[13px]'
                          }`}
                        >
                          {chunk.content}
                        </p>

                        {(showAllBboxes || isSelected) && (
                          <div className="mt-2 pt-1.5 border-t border-zinc-300/80 font-mono text-[9px] text-zinc-600 flex justify-between">
                            <span>
                              BBox: X:{chunk.bbox.x.toFixed(3)} Y:{chunk.bbox.y.toFixed(3)} W:
                              {chunk.bbox.w.toFixed(3)} H:{chunk.bbox.h.toFixed(3)}
                            </span>
                            <span>{chunk.lineBboxes?.length ?? 0} lines</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-10 pt-4 border-t border-zinc-300 flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>
                  XY-Cut Coordinate Parser • {sortedChunks.length} blocks on page {currentPage}
                </span>
                <span>VERITAS // CORPUS</span>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
};
