'use client';

import React, { useState } from 'react';
import { Sliders, Save, Key, Database, Cpu } from 'lucide-react';

export const ConfigView: React.FC = () => {
  const [denseWeight, setDenseWeight] = useState(65);
  const [rrfK, setRrfK] = useState(60);
  const [model, setModel] = useState('gpt-4o');

  return (
    <div className="flex-1 bg-obsidian flex flex-col overflow-hidden select-none">
      {/* Config Header */}
      <div className="h-12 border-b border-panelBorder bg-panel px-6 flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center gap-3">
          <Sliders className="w-4 h-4 text-accent" />
          <span className="text-textPrimary font-bold">
            SYSTEM ENGINE CONFIGURATION &amp; HYPERPARAMETERS
          </span>
        </div>
        <button
          onClick={() => alert('Configuration saved to environment')}
          className="px-3 py-1 bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs rounded-[2px] transition flex items-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          <span>SAVE CONFIG</span>
        </button>
      </div>

      {/* Config Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl space-y-6">
        {/* Hibrid Axtarış Düsturu */}
        <div className="border border-panelBorder bg-panel rounded-[2px] p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-textPrimary border-b border-panelBorder pb-2">
            <Database className="w-4 h-4 text-accent" />
            <span>HYBRID RETRIEVAL &amp; RRF PARAMETERS</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">Dense Vector Weight:</span>
              <span className="text-textPrimary font-bold">{denseWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={denseWeight}
              onChange={(e) => setDenseWeight(Number(e.target.value))}
              className="w-full accent-accent h-1 bg-obsidian rounded-[1px] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-textMuted">
              <span>0% (BM25 Pure Lexical)</span>
              <span>100% (Pure Semantic Vector)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">
                RRF Smoothing Constant (k)
              </label>
              <input
                type="number"
                value={rrfK}
                onChange={(e) => setRrfK(Number(e.target.value))}
                className="w-full bg-obsidian border border-panelBorder px-3 py-1.5 rounded-[2px] text-xs font-mono text-textPrimary"
              />
              <span className="text-[10px] text-textMuted font-mono">
                Standard default: 60
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">
                Top-k Candidate Chunks
              </label>
              <select className="w-full bg-obsidian border border-panelBorder px-3 py-1.5 rounded-[2px] text-xs font-mono text-textPrimary">
                <option>20 chunks</option>
                <option selected>40 chunks</option>
                <option>80 chunks</option>
              </select>
            </div>
          </div>
        </div>

        {/* LLM & Embedding Models */}
        <div className="border border-panelBorder bg-panel rounded-[2px] p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-textPrimary border-b border-panelBorder pb-2">
            <Cpu className="w-4 h-4 text-accent" />
            <span>INFERENCE &amp; EMBEDDING PROVIDERS</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">
                Synthesis LLM Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-obsidian border border-panelBorder px-3 py-1.5 rounded-[2px] text-xs font-mono text-textPrimary"
              >
                <option value="gpt-4o">gpt-4o (128k context)</option>
                <option value="claude-3-5-sonnet">claude-3-5-sonnet-20241022</option>
                <option value="local-vllm">local-vllm (Llama-3.1-70B)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">
                Embedding Model
              </label>
              <select className="w-full bg-obsidian border border-panelBorder px-3 py-1.5 rounded-[2px] text-xs font-mono text-textPrimary">
                <option>text-embedding-3-large (1536 dim)</option>
                <option>text-embedding-3-small (1536 dim)</option>
                <option>bge-large-en-v1.5 (1024 dim)</option>
              </select>
            </div>
          </div>
        </div>

        {/* API Açarları */}
        <div className="border border-panelBorder bg-panel rounded-[2px] p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-textPrimary border-b border-panelBorder pb-2">
            <Key className="w-4 h-4 text-accent" />
            <span>API KEYS &amp; CREDENTIALS</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">
                OPENAI_API_KEY
              </label>
              <input
                type="password"
                defaultValue="sk-proj-************************************"
                className="w-full bg-obsidian border border-panelBorder px-3 py-1.5 rounded-[2px] text-xs font-mono text-textPrimary"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">
                DATABASE_URL
              </label>
              <input
                type="text"
                defaultValue="postgresql://veritas:veritas_secret@localhost:5432/veritas_corpus"
                className="w-full bg-obsidian border border-panelBorder px-3 py-1.5 rounded-[2px] text-xs font-mono text-textPrimary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
