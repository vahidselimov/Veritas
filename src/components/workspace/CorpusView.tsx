'use client';

import React, { useState } from 'react';
import { Database, Plus, Search, FileText, CheckCircle2 } from 'lucide-react';

export const CorpusView: React.FC = () => {
  const [filterText, setFilterText] = useState('');

  const documents = [
    {
      name: 'cuda_kernel.pdf',
      pages: 18,
      chunks: 342,
      model: 'text-embedding-3-large (1536d)',
      size: '3.1 MB',
      status: 'Indexed',
    },
    {
      name: 'architecture_v2.pdf',
      pages: 42,
      chunks: 710,
      model: 'text-embedding-3-large (1536d)',
      size: '4.2 MB',
      status: 'Indexed',
    },
    {
      name: 'rfc_9110.pdf',
      pages: 165,
      chunks: 1890,
      model: 'text-embedding-3-large (1536d)',
      size: '1.8 MB',
      status: 'Indexed',
    },
    {
      name: 'pgvector_bench.md',
      pages: 12,
      chunks: 148,
      model: 'text-embedding-3-small (1536d)',
      size: '840 KB',
      status: 'Processing (78%)',
    },
  ];

  return (
    <div className="flex-1 bg-obsidian flex flex-col overflow-hidden select-none">
      {/* Corpus Alt Başlığı */}
      <div className="h-12 border-b border-panelBorder bg-panel px-6 flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center gap-3">
          <Database className="w-4 h-4 text-accent" />
          <span className="text-textPrimary font-bold">
            CORPUS MANAGEMENT &amp; CHUNK COORDINATE INSPECTOR
          </span>
          <span className="text-panelBorder">|</span>
          <span className="text-textMuted">TOTAL STORAGE: 9.94 MB</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-obsidian border border-panelBorder px-2.5 py-1 rounded-[2px]">
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter documents or hashes..."
              className="bg-transparent text-xs text-textPrimary placeholder-textMuted outline-none"
            />
          </div>

          <button
            onClick={() => alert('Ingest Document modal triggered')}
            className="px-3 py-1 bg-accent text-obsidian font-mono font-bold text-xs rounded-[2px] hover:brightness-105 transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>INGEST DOCUMENT</span>
          </button>
        </div>
      </div>

      {/* Sənədlər Cədvəli */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-panelBorder bg-panel rounded-[2px] overflow-hidden">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-obsidian border-b border-panelBorder text-textMuted text-[11px]">
              <tr>
                <th className="py-3 px-4 font-normal">DOCUMENT NAME</th>
                <th className="py-3 px-4 font-normal">PAGES</th>
                <th className="py-3 px-4 font-normal">TOTAL CHUNKS</th>
                <th className="py-3 px-4 font-normal">EMBEDDING MODEL</th>
                <th className="py-3 px-4 font-normal">INDEX SIZE</th>
                <th className="py-3 px-4 font-normal">STATUS</th>
                <th className="py-3 px-4 font-normal text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panelBorder text-textPrimary">
              {documents.map((doc, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-panelHover cursor-pointer transition bg-panel/50"
                >
                  <td className="py-3.5 px-4 font-semibold text-accent flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{doc.name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">{doc.pages}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-1.5 py-0.5 bg-obsidian border border-panelBorder rounded-[1px]">
                      {doc.chunks} chunks
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-textMuted">{doc.model}</td>
                  <td className="py-3.5 px-4 text-zinc-300">{doc.size}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-semibold flex items-center gap-1 ${
                        doc.status === 'Indexed'
                          ? 'text-status-pass'
                          : 'text-zinc-400'
                      }`}
                    >
                      {doc.status === 'Indexed' && (
                        <CheckCircle2 className="w-3 h-3 text-status-pass" />
                      )}
                      <span>{doc.status}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button className="px-2 py-0.5 bg-obsidian border border-panelBorder text-textMuted hover:text-textPrimary rounded-[1px] transition text-[10px]">
                      INSPECT BBOX
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
