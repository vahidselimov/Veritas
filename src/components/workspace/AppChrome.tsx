'use client';

import React from 'react';
import {
  Layers,
  Terminal,
  Files,
  BarChart2,
  Sliders,
  RotateCcw,
} from 'lucide-react';

export type NavTab = 'WORKSPACE' | 'CORPUS' | 'CONFIG' | 'EVALS';

interface AppChromeProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  chunksCount?: number;
  latencyMs?: number;
}

export const AppChrome: React.FC<AppChromeProps> = ({
  activeTab,
  onTabChange,
  chunksCount = 1480,
  latencyMs = 14,
}) => {
  const [engineStatus, setEngineStatus] = React.useState<'online' | 'standby' | 'checking'>('checking');

  React.useEffect(() => {
    const checkApi = async () => {
      try {
        const res = await fetch('/health');
        if (res.ok) {
          const data = await res.json();
          if (data.framework?.includes('.NET 9') || data.database?.includes('5433')) {
            setEngineStatus('online');
          } else {
            setEngineStatus('standby');
          }
        } else {
          setEngineStatus('standby');
        }
      } catch {
        setEngineStatus('standby');
      }
    };
    checkApi();
    const interval = setInterval(checkApi, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-11 border-b border-panelBorder bg-panel px-3.5 flex items-center justify-between shrink-0 z-40 text-xs font-mono select-none">
      {/* Sol Bölmə: Logo və Sistem Əməliyyat Statusu */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-medium text-textPrimary text-xs">
          {/* VERITAS Precision Optical Reticle & Monogram (Stitch Brandmark) */}
          <svg
            className="w-4 h-4 shrink-0"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="VERITAS Monogram"
          >
            <rect width="64" height="64" fill="#131316" stroke="#27272A" strokeWidth="2" />
            <path d="M 0 12 L 0 0 L 12 0" stroke="#F59E0B" strokeWidth="3" fill="none" />
            <path d="M 52 0 L 64 0 L 64 12" stroke="#F59E0B" strokeWidth="3" fill="none" />
            <path d="M 64 52 L 64 64 L 52 64" stroke="#F59E0B" strokeWidth="3" fill="none" />
            <path d="M 12 64 L 0 64 L 0 52" stroke="#F59E0B" strokeWidth="3" fill="none" />
            <path d="M 16 18 L 32 46 L 48 18" stroke="#F4F4F5" strokeWidth="4.5" strokeLinecap="square" strokeLinejoin="miter" fill="none" />
            <circle cx="32" cy="46" r="3.5" fill="#F59E0B" />
            <line x1="32" y1="12" x2="32" y2="18" stroke="#F59E0B" strokeWidth="2" />
          </svg>
          <span className="font-semibold tracking-normal text-textPrimary">
            VERITAS
          </span>
          <span className="text-zinc-500 font-normal">// CORPUS</span>
        </div>
        <span className="text-panelBorder">|</span>
        <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-status-pass" />
          <span>prod-us-east-1</span>
        </div>
        <span className="text-panelBorder hidden sm:inline-block">|</span>
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-obsidian border border-panelBorder rounded-[1px] text-[11px] font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              engineStatus === 'online'
                ? 'bg-status-pass animate-pulse'
                : engineStatus === 'standby'
                ? 'bg-amber-400'
                : 'bg-zinc-500'
            }`}
          />
          <span className={engineStatus === 'online' ? 'text-zinc-200' : 'text-zinc-400'}>
            {engineStatus === 'online'
              ? '.NET 9 Core: ONLINE (Unified)'
              : engineStatus === 'standby'
              ? '.NET 9 Core: STANDBY (Cloud Preview)'
              : 'Checking .NET 9...'}
          </span>
        </div>
        <span className="text-panelBorder hidden md:inline-block">|</span>
        <span className="text-zinc-500 text-xs font-mono hidden md:inline-block">
          {latencyMs}ms
        </span>
      </div>

      {/* Orta Bölmə: Əsas Naviqasiya Tabları (Monoxrom Swiss Stili) */}
      <nav className="flex items-center gap-0.5 bg-obsidian p-0.5 rounded-[2px] border border-panelBorder text-xs font-sans">
        <button
          onClick={() => onTabChange('WORKSPACE')}
          className={`nav-tab px-3 py-1 rounded-[1px] transition flex items-center gap-1.5 ${
            activeTab === 'WORKSPACE'
              ? 'bg-[#1c2029] text-textPrimary font-medium border border-panelBorder shadow-sm'
              : 'text-zinc-400 hover:text-textPrimary'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-zinc-300" />
          <span>Workspace</span>
        </button>

        <button
          onClick={() => onTabChange('CORPUS')}
          className={`nav-tab px-3 py-1 rounded-[1px] transition flex items-center gap-1.5 ${
            activeTab === 'CORPUS'
              ? 'bg-[#1c2029] text-textPrimary font-medium border border-panelBorder shadow-sm'
              : 'text-zinc-400 hover:text-textPrimary'
          }`}
        >
          <Files className="w-3.5 h-3.5 text-zinc-400" />
          <span>Corpus</span>
          <span className="text-[10px] px-1 bg-panelBorder text-zinc-400 rounded-[1px] font-mono">
            4
          </span>
        </button>

        <button
          onClick={() => onTabChange('EVALS')}
          className={`nav-tab px-3 py-1 rounded-[1px] transition flex items-center gap-1.5 ${
            activeTab === 'EVALS'
              ? 'bg-[#1c2029] text-textPrimary font-medium border border-panelBorder shadow-sm'
              : 'text-zinc-400 hover:text-textPrimary'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5 text-zinc-400" />
          <span>Benchmarks</span>
        </button>

        <button
          onClick={() => onTabChange('CONFIG')}
          className={`nav-tab px-3 py-1 rounded-[1px] transition flex items-center gap-1.5 ${
            activeTab === 'CONFIG'
              ? 'bg-[#1c2029] text-textPrimary font-medium border border-panelBorder shadow-sm'
              : 'text-zinc-400 hover:text-textPrimary'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-zinc-400" />
          <span>Configuration</span>
        </button>
      </nav>

      {/* Sağ Bölmə: Telemetriya və Koordinat Sinxronizasiyası */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 border border-panelBorder px-2.5 py-0.5 rounded-[2px] text-xs bg-panel text-zinc-400 font-mono">
          <span className="text-zinc-500">Chunks:</span>
          <span className="text-zinc-300 font-medium">
            {chunksCount.toLocaleString('en-US')}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400 border border-panelBorder px-2 py-0.5 rounded-[2px] bg-panel font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-status-pass" />
          <span className="text-zinc-300">Coordinates synced</span>
        </div>

        <div className="w-6 h-6 rounded-[2px] bg-[#222731] flex items-center justify-center text-zinc-300 text-xs font-mono border border-panelBorder">
          VK
        </div>
      </div>
    </header>
  );
};
