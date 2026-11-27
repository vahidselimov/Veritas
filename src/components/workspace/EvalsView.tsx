'use client';

import React from 'react';
import { BarChart2, ShieldCheck, Zap, Activity } from 'lucide-react';

export const EvalsView: React.FC = () => {
  return (
    <div className="flex-1 bg-obsidian flex flex-col overflow-hidden select-none">
      {/* Benchmarks Header */}
      <div className="min-h-12 border-b border-panelBorder bg-panel px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shrink-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <BarChart2 className="w-4 h-4 text-accent shrink-0" />
          <span className="text-textPrimary font-bold break-words">
            GROUNDING ACCURACY &amp; RETRIEVAL BENCHMARKS
          </span>
          <span className="text-panelBorder hidden sm:inline">|</span>
          <span className="text-textMuted whitespace-nowrap">SUITE: VERITAS-EVAL-v4.8</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-status-pass" />
          <span className="text-zinc-300">Deterministic Guard: ACTIVE</span>
        </div>
      </div>

      {/* Benchmarks Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border border-panelBorder bg-panel rounded-[2px]">
            <div className="flex items-center justify-between text-xs text-textMuted font-mono mb-2">
              <span>CITATION FIDELITY</span>
              <ShieldCheck className="w-3.5 h-3.5 text-status-pass" />
            </div>
            <div className="text-2xl font-bold font-mono text-textPrimary">
              99.8%
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">
              Zero hallucinated coordinates
            </div>
          </div>

          <div className="p-4 border border-panelBorder bg-panel rounded-[2px]">
            <div className="flex items-center justify-between text-xs text-textMuted font-mono mb-2">
              <span>HYBRID RRF RECALL@5</span>
              <Activity className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="text-2xl font-bold font-mono text-textPrimary">
              94.6%
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">
              +18.2% vs Vector-only
            </div>
          </div>

          <div className="p-4 border border-panelBorder bg-panel rounded-[2px]">
            <div className="flex items-center justify-between text-xs text-textMuted font-mono mb-2">
              <span>RETRIEVAL LATENCY (p95)</span>
              <Zap className="w-3.5 h-3.5 text-zinc-300" />
            </div>
            <div className="text-2xl font-bold font-mono text-textPrimary">
              138ms
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">
              Vector (42ms) + BM25 (18ms) + RRF
            </div>
          </div>

          <div className="p-4 border border-panelBorder bg-panel rounded-[2px]">
            <div className="flex items-center justify-between text-xs text-textMuted font-mono mb-2">
              <span>BBOX PIXEL ACCURACY</span>
              <ShieldCheck className="w-3.5 h-3.5 text-status-pass" />
            </div>
            <div className="text-2xl font-bold font-mono text-textPrimary">
              0.4mm
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">
              Sub-pixel canvas alignment
            </div>
          </div>
        </div>

        {/* Evals Detailed Table */}
        <div className="border border-panelBorder bg-panel rounded-[2px] overflow-hidden">
          <div className="p-3.5 bg-obsidian border-b border-panelBorder flex flex-wrap justify-between items-center gap-2 text-xs font-mono">
            <span className="font-bold text-textPrimary">
              TEST CASES // SPATIAL GROUNDING VALIDATION
            </span>
            <span className="text-textMuted">120 / 120 PASSING</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left font-mono text-xs">
              <thead className="bg-obsidian border-b border-panelBorder text-textMuted text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-normal">TEST CASE ID</th>
                  <th className="py-2.5 px-4 font-normal">TARGET PAPER</th>
                  <th className="py-2.5 px-4 font-normal">CLAIM TOKEN COUNT</th>
                  <th className="py-2.5 px-4 font-normal">BBOX OVERLAP (IoU)</th>
                  <th className="py-2.5 px-4 font-normal">VERDICT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panelBorder text-textPrimary">
                <tr className="hover:bg-panelHover transition">
                  <td className="py-3 px-4 font-semibold text-accent">#TC-8841</td>
                  <td className="py-3 px-4 text-zinc-300">cuda_kernel.pdf</td>
                  <td className="py-3 px-4 text-zinc-300">42 tokens</td>
                  <td className="py-3 px-4 text-status-pass">0.982 IoU</td>
                  <td className="py-3 px-4 text-status-pass font-bold">PASS</td>
                </tr>
                <tr className="hover:bg-panelHover transition">
                  <td className="py-3 px-4 font-semibold text-accent">#TC-8842</td>
                  <td className="py-3 px-4 text-zinc-300">architecture_v2.pdf</td>
                  <td className="py-3 px-4 text-zinc-300">89 tokens</td>
                  <td className="py-3 px-4 text-status-pass">0.965 IoU</td>
                  <td className="py-3 px-4 text-status-pass font-bold">PASS</td>
                </tr>
                <tr className="hover:bg-panelHover transition">
                  <td className="py-3 px-4 font-semibold text-accent">#TC-8843</td>
                  <td className="py-3 px-4 text-zinc-300">rfc_9110.pdf</td>
                  <td className="py-3 px-4 text-zinc-300">114 tokens</td>
                  <td className="py-3 px-4 text-status-pass">0.978 IoU</td>
                  <td className="py-3 px-4 text-status-pass font-bold">PASS</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
