'use client';

import React, { useState } from 'react';
import {
  RotateCcw,
  User,
  Sparkles,
  GitCommit,
  ChevronDown,
  CheckCheck,
  Search,
} from 'lucide-react';

interface ResearchStreamProps {
  activeCitation: number | null;
  onCitationClick: (citationIndex: number) => void;
  onClearSession: () => void;
  onSubmitQuery: (query: string) => void;
}

export const ResearchStream: React.FC<ResearchStreamProps> = ({
  activeCitation,
  onCitationClick,
  onClearSession,
  onSubmitQuery,
}) => {
  const [traceOpen, setTraceOpen] = useState(false);
  const [queryInput, setQueryInput] = useState(
    'How does the custom CUDA memory management bypass page-locking overhead during batch tensor streaming?'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryInput.trim()) {
      onSubmitQuery(queryInput.trim());
    }
  };

  return (
    <section className="flex-1 md:w-[42%] max-w-[48%] border-r border-panelBorder flex flex-col bg-obsidian overflow-hidden select-none">
      {/* Sessiya Başlığı */}
      <div className="h-10 border-b border-panelBorder px-4 flex items-center justify-between text-xs font-mono bg-panel/70 shrink-0">
        <div className="flex items-center gap-2 font-sans text-xs">
          <span className="font-medium text-textPrimary">Active Session</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400 font-mono text-[11px]">Query #884-AX</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-zinc-500 text-[11px]">
            Precision: <span className="text-zinc-300 font-medium">FP16</span>
          </span>
          <button
            onClick={onClearSession}
            className="text-zinc-400 hover:text-textPrimary transition"
            aria-label="Reset research session"
            title="Reset session"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Söhbət və Tədqiqat Məzmunu */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* İstifadəçinin Araşdırma Sorğusu Kartı */}
        <div className="border border-panelBorder bg-panel rounded-[2px] p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-zinc-400 font-medium font-sans flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              Query
            </span>
            <span className="text-zinc-500 font-mono text-[11px]">14:02 UTC</span>
          </div>
          <h2 className="text-sm md:text-base font-medium text-textPrimary leading-snug font-sans">
            How does the custom CUDA memory management bypass page-locking overhead
            during batch tensor streaming?
          </h2>
          <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span className="px-2 py-0.5 bg-obsidian border border-panelBorder rounded-[1px] text-zinc-400">
              PINNED_DIRECT_DMA
            </span>
            <span className="px-2 py-0.5 bg-obsidian border border-panelBorder rounded-[1px] text-zinc-500">
              stream: 0x9af4
            </span>
          </div>
        </div>

        {/* AI Vizual İstinadlı Sintezi */}
        <div className="border border-panelBorder bg-panel/40 rounded-[2px] p-4 relative">
          <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-panelBorder font-sans">
            <span className="flex items-center gap-1.5 text-textPrimary font-medium">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              Synthesized Response
            </span>
            <span className="text-zinc-500 font-mono text-[11px]">182 tok/s</span>
          </div>

          <div className="text-sm text-zinc-200 leading-relaxed space-y-3.5 font-sans font-normal">
            <p>
              By bypassing the standard runtime pinned memory allocations through
              unified virtual memory addressing and custom ring-buffer pools
              <button
                onClick={() => onCitationClick(1)}
                className={`inline-flex items-center justify-center px-1.5 py-0.5 mx-1 text-xs font-mono font-bold rounded-[2px] transition duration-75 active:scale-[0.98] ${
                  activeCitation === 1
                    ? 'bg-accent text-obsidian shadow-sm'
                    : 'bg-[#222731] hover:bg-[#2c3340] text-zinc-200 border border-zinc-600/70'
                }`}
                title="View Citation [1] in Evidence Canvas"
              >
                [1]
              </button>
              , the CUDA host allocator completely eliminates runtime kernel page
              locking faults. In typical synchronous drivers, operating systems
              incur non-trivial TLB invalidation and mprotect overhead when pinning
              memory slabs.
            </p>

            <p>
              Furthermore, asynchronous Direct Memory Access (DMA) transfers are
              directly mapped into contiguous physical host registers
              <button
                onClick={() => onCitationClick(2)}
                className={`inline-flex items-center justify-center px-1.5 py-0.5 mx-1 text-xs font-mono font-bold rounded-[2px] transition duration-75 active:scale-[0.98] ${
                  activeCitation === 2
                    ? 'bg-accent text-obsidian shadow-sm'
                    : 'bg-[#222731] hover:bg-[#2c3340] text-zinc-200 border border-zinc-600/70'
                }`}
                title="View Citation [2] in Evidence Canvas"
              >
                [2]
              </button>
              , ensuring predictable p99 throughput without TLB thrashing or
              PCI-e saturation bottlenecks during massive mini-batch pipelining
              <button
                onClick={() => onCitationClick(3)}
                className={`inline-flex items-center justify-center px-1.5 py-0.5 mx-1 text-xs font-mono font-bold rounded-[2px] transition duration-75 active:scale-[0.98] ${
                  activeCitation === 3
                    ? 'bg-accent text-obsidian shadow-sm'
                    : 'bg-[#222731] hover:bg-[#2c3340] text-zinc-200 border border-zinc-600/70'
                }`}
                title="View Citation [3] in Evidence Canvas"
              >
                [3]
              </button>
              .
            </p>
          </div>

          {/* Açılıb-bağlanan Retrieval & Rerank Trace Paneli */}
          <div className="mt-4 border border-panelBorder bg-obsidian rounded-[2px] overflow-hidden text-xs">
            <div
              onClick={() => setTraceOpen(!traceOpen)}
              className="px-3 py-2 bg-panel flex items-center justify-between cursor-pointer hover:bg-panelHover transition font-sans"
            >
              <div className="flex items-center gap-2">
                <GitCommit className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-textPrimary font-medium">Retrieval Trace</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-obsidian border border-panelBorder rounded-[1px] text-zinc-400 font-mono">
                  3 Chunks Verified
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-zinc-500">
                  Latency: <span className="text-zinc-300 font-medium">138ms</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${
                    traceOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>

            {/* Zero-Jitter CSS Grid Apertura */}
            <div
              className={`grid transition-[grid-template-rows] duration-150 ease-anti-ai ${
                traceOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <div className="p-3 border-t border-panelBorder space-y-2 text-xs text-zinc-400 font-mono">
                  <div className="flex justify-between items-center pb-1.5 border-b border-panelBorder/50 text-[11px]">
                    <span className="text-zinc-400">
                      Lexical query:{' '}
                      <span className="text-zinc-200 font-sans">
                        &quot;pinned memory ring buffer cuda bypass&quot;
                      </span>
                    </span>
                    <span className="text-zinc-400">BM25: 18.4</span>
                  </div>
                  <div className="flex justify-between items-center pb-1.5 border-b border-panelBorder/50 text-[11px]">
                    <span className="text-zinc-400">
                      Semantic query:{' '}
                      <span className="text-zinc-200 font-sans">
                        &quot;DMA physical host registers asynchronous tensor&quot;
                      </span>
                    </span>
                    <span className="text-zinc-400">Cosine: 0.941</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="bg-panel p-2 rounded-[2px] border border-panelBorder">
                      <span className="block text-zinc-500 text-[10px]">CHUNK #112</span>
                      <span className="text-zinc-200 font-semibold">Score 0.974</span>
                    </div>
                    <div className="bg-panel p-2 rounded-[2px] border border-panelBorder">
                      <span className="block text-zinc-500 text-[10px]">CHUNK #115</span>
                      <span className="text-zinc-200 font-semibold">Score 0.928</span>
                    </div>
                    <div className="bg-panel p-2 rounded-[2px] border border-panelBorder">
                      <span className="block text-zinc-500 text-[10px]">CHUNK #119</span>
                      <span className="text-zinc-200 font-semibold">Score 0.891</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Telemetriya Qovşağı */}
          <div className="mt-3 pt-2.5 border-t border-panelBorder/60 flex flex-wrap items-center justify-between text-xs font-mono text-zinc-500">
            <div className="flex items-center gap-4 text-[11px]">
              <span>
                Latency: <span className="text-zinc-300 font-medium">142ms</span>
              </span>
              <span>
                Chunks: <span className="text-zinc-300 font-medium">4/120</span>
              </span>
              <span>
                Confidence: <span className="text-zinc-300 font-medium">0.96</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-sans">
              <CheckCheck className="w-3.5 h-3.5 text-status-pass" />
              <span>Source verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tədqiqat Sorğusu Daxiletmə Sahəsi */}
      <div className="p-3 border-t border-panelBorder bg-panel shrink-0">
        <form onSubmit={handleSubmit} className="relative font-sans">
          <div className="flex items-center gap-2 bg-obsidian border border-panelBorder rounded-[2px] px-3 py-1.5 focus-within:border-zinc-500 transition">
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ask a research question or search paper coordinates..."
              className="bg-transparent border-none outline-none text-xs text-textPrimary placeholder-textMuted flex-1 font-sans"
            />
            <select className="bg-panel border border-panelBorder text-zinc-400 text-[11px] font-mono rounded-[2px] px-2 py-1 focus:outline-none">
              <option>corpus-4.8 (hybrid)</option>
              <option>claude-3.5-sonnet</option>
              <option>local-vllm</option>
            </select>
            <span className="text-[10px] font-mono text-zinc-500 border border-panelBorder px-1.5 py-0.5 rounded-[1px] bg-panel">
              ⌘K
            </span>
            <button
              type="submit"
              className="px-3.5 py-1 bg-white hover:bg-zinc-200 text-black font-sans font-medium text-xs rounded-[2px] transition shadow-sm active:scale-[0.98]"
            >
              Run query
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] font-sans text-zinc-500">
            <span>Model: corpus-engine • 128k context</span>
            <span className="font-mono text-[10px]">deterministic trace</span>
          </div>
        </form>
      </div>
    </section>
  );
};
