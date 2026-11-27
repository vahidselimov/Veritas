'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Folder, MessageSquare, FileText, PanelLeftOpen } from 'lucide-react';
import { AppChrome, NavTab } from '@/components/workspace/AppChrome';
import { DocumentSidebar } from '@/components/workspace/DocumentSidebar';
import { ResearchStream } from '@/components/workspace/ResearchStream';
import { EvidenceCanvas } from '@/components/workspace/EvidenceCanvas';
import { CorpusView } from '@/components/workspace/CorpusView';
import { EvalsView } from '@/components/workspace/EvalsView';
import { ConfigView } from '@/components/workspace/ConfigView';
import type { CoordinateCacheDto, DocumentChunkDto } from '@/types/document';

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('WORKSPACE');
  const [selectedDocId, setSelectedDocId] = useState('cuda_kernel');
  const [documentName, setDocumentName] = useState('cuda_kernel.pdf');
  const [activeCitation, setActiveCitation] = useState<number | null>(1);
  const [denseWeight, setDenseWeight] = useState(65);
  const [topK, setTopK] = useState(40);
  const [currentPage, setCurrentPage] = useState(4);
  const [totalPages, setTotalPages] = useState(18);
  const [showAllBboxes, setShowAllBboxes] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);

  const [pageChunks, setPageChunks] = useState<DocumentChunkDto[]>([]);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  const [cacheTelemetry, setCacheTelemetry] = useState<{
    cacheHit: boolean;
    lookupMs: number;
    columnCount: number;
  } | null>(null);
  const [latencyMs, setLatencyMs] = useState(14);
  const [mobilePane, setMobilePane] = useState<'sources' | 'chat' | 'canvas'>('chat');
  const [isTabletDrawerOpen, setIsTabletDrawerOpen] = useState(false);

  const fetchCoordinates = useCallback(async (docId: string, page: number) => {
    try {
      const res = await fetch(
        `/api/v1/documents/${docId}/coordinates?pageNumber=${page}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data: CoordinateCacheDto = await res.json();
        setPageChunks(data.chunks || []);
        setCacheTelemetry({
          cacheHit: data.cacheHit,
          lookupMs: data.lookupMs,
          columnCount: data.columnCount || 1,
        });
        setLatencyMs(Math.max(1, Math.round(data.lookupMs)));
        if (data.chunks && data.chunks.length > 0) {
          setSelectedChunkId(data.chunks[0].id);
        } else {
          setSelectedChunkId(null);
        }
      }
    } catch {
      setPageChunks([]);
      setCacheTelemetry(null);
    }
  }, []);

  useEffect(() => {
    fetchCoordinates(selectedDocId, currentPage);
  }, [selectedDocId, currentPage, fetchCoordinates]);

  // Sənəd seçildikdə məlumatları və koordinat keşini dinamik yenilə
  const handleSelectDoc = async (docId: string, preferredPage?: number) => {
    setActiveCitation(null);
    setMobilePane('canvas');
    setIsTabletDrawerOpen(false);
    try {
      const res = await fetch(`/api/v1/documents/${docId}`, { cache: 'no-store' });
      if (res.ok) {
        const doc = await res.json();
        const name = doc.name || documentName;
        const targetPage =
          preferredPage ?? (name === 'cuda_kernel.pdf' ? 4 : 1);
        setDocumentName(name);
        setTotalPages(doc.totalPages || 1);
        setSelectedDocId(docId);
        setCurrentPage(targetPage);
        if (name === 'cuda_kernel.pdf' && targetPage === 4) {
          setActiveCitation(1);
        }
        return;
      }
    } catch {
      // Fallback for mock id
    }
    setSelectedDocId(docId);
    setCurrentPage(preferredPage ?? 1);
  };

  const handleCitationClick = (citationIndex: number) => {
    setActiveCitation(citationIndex);
    setMobilePane('canvas');
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setActiveCitation(null);
    }
  };

  const handleZoomChange = useCallback((delta: number) => {
    setZoomPercent((prev) => Math.min(Math.max(prev + delta, 60), 200));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomPercent(100);
  }, []);

  const handleInspectFromCorpus = (docId: string, pageNumber = 1) => {
    setActiveTab('WORKSPACE');
    handleSelectDoc(docId, pageNumber);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-obsidian text-textPrimary">
      {/* 1. Ümumi Yuxarı Header (App Chrome) */}
      <AppChrome
        activeTab={activeTab}
        onTabChange={setActiveTab}
        chunksCount={1480}
        latencyMs={latencyMs}
      />

      {/* 2. Əsas Dinamik Ekran */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* VIEW 1: WORKSPACE (Swiss 3-Pane Split Screen + Responsive Mobile/Tablet) */}
        {activeTab === 'WORKSPACE' && (
          <div className="flex-1 flex flex-col overflow-hidden w-full h-full">
            {/* Mobil Görünüş (< md): 3 Panel Keçid Zolağı */}
            <div className="md:hidden border-b border-panelBorder bg-panel px-2.5 py-1.5 flex items-center justify-between gap-2 shrink-0 font-mono text-[11px]">
              <div className="flex items-center gap-1 flex-1 bg-obsidian p-0.5 border border-panelBorder rounded-[2px]">
                <button
                  type="button"
                  data-testid="mobile-pane-sources"
                  aria-pressed={mobilePane === 'sources'}
                  onClick={() => setMobilePane('sources')}
                  className={`flex-1 py-1 px-2 rounded-[1px] flex items-center justify-center gap-1 transition ${
                    mobilePane === 'sources'
                      ? 'bg-[#1c2029] text-textPrimary border border-panelBorder font-medium'
                      : 'text-zinc-400 hover:text-textPrimary'
                  }`}
                >
                  <Folder className="w-3 h-3 shrink-0" />
                  <span>Sources</span>
                </button>
                <button
                  type="button"
                  data-testid="mobile-pane-chat"
                  aria-pressed={mobilePane === 'chat'}
                  onClick={() => setMobilePane('chat')}
                  className={`flex-1 py-1 px-2 rounded-[1px] flex items-center justify-center gap-1 transition ${
                    mobilePane === 'chat'
                      ? 'bg-[#1c2029] text-textPrimary border border-panelBorder font-medium'
                      : 'text-zinc-400 hover:text-textPrimary'
                  }`}
                >
                  <MessageSquare className="w-3 h-3 shrink-0" />
                  <span>Chat</span>
                </button>
                <button
                  type="button"
                  data-testid="mobile-pane-canvas"
                  aria-pressed={mobilePane === 'canvas'}
                  onClick={() => setMobilePane('canvas')}
                  className={`flex-1 py-1 px-2 rounded-[1px] flex items-center justify-center gap-1 transition ${
                    mobilePane === 'canvas'
                      ? 'bg-[#1c2029] text-textPrimary border border-panelBorder font-medium'
                      : 'text-zinc-400 hover:text-textPrimary'
                  }`}
                >
                  <FileText className="w-3 h-3 shrink-0" />
                  <span>Paper</span>
                </button>
              </div>
              <span
                className="text-[10px] text-zinc-400 truncate max-w-[96px] shrink-0"
                title={documentName}
              >
                {documentName}
              </span>
            </div>

            {/* Planşet Görünüşü (md..xl): Sources Drawer Zolağı */}
            <div className="hidden md:flex xl:hidden border-b border-panelBorder bg-panel px-3 py-1 items-center justify-between gap-2 shrink-0 font-mono text-[11px]">
              <button
                type="button"
                data-testid="tablet-sources-toggle"
                onClick={() => setIsTabletDrawerOpen(true)}
                className="px-2 py-0.5 bg-obsidian border border-panelBorder rounded-[2px] text-zinc-300 hover:text-textPrimary hover:border-zinc-500 flex items-center gap-1.5 transition"
              >
                <PanelLeftOpen className="w-3.5 h-3.5 text-accent" />
                <span>Sources</span>
              </button>
              <span className="text-zinc-400 truncate">
                Active: <span className="text-textPrimary">{documentName}</span> • p.{' '}
                {currentPage}/{totalPages}
              </span>
            </div>

            <div className="flex-1 flex flex-row overflow-hidden w-full h-full relative">
              {isTabletDrawerOpen && (
                <div
                  className="hidden md:block xl:hidden fixed inset-0 bg-black/60 z-40"
                  onClick={() => setIsTabletDrawerOpen(false)}
                />
              )}

              {/* Sol Panel: Sənədlər və Axtarış Nəzarəti (Desktop 260px, Planşet Drawer, Mobil Tab) */}
              <DocumentSidebar
                selectedDocId={selectedDocId}
                onSelectDoc={handleSelectDoc}
                denseWeight={denseWeight}
                onDenseWeightChange={setDenseWeight}
                topK={topK}
                onTopKChange={setTopK}
                onCloseDrawer={() => setIsTabletDrawerOpen(false)}
                className={
                  isTabletDrawerOpen
                    ? 'flex fixed inset-y-0 left-0 z-50 w-[280px] xl:static xl:w-[260px] xl:z-auto shadow-2xl xl:shadow-none'
                    : `${mobilePane === 'sources' ? 'flex w-full' : 'hidden'} md:hidden xl:flex xl:w-[260px]`
                }
              />

              {/* Orta Panel: Tədqiqat Çat və Retrieval Trace */}
              <ResearchStream
                activeCitation={activeCitation}
                onCitationClick={handleCitationClick}
                onClearSession={() => setActiveCitation(null)}
                onSubmitQuery={(q) => console.log('Query submitted:', q)}
                className={mobilePane === 'chat' ? 'flex' : 'hidden md:flex'}
              />

              {/* Sağ Panel: Kağız Sənəd Evidence Canvas (#F8F7F4) */}
              <EvidenceCanvas
                documentName={documentName}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                activeCitation={activeCitation}
                showAllBboxes={showAllBboxes}
                onToggleAllBboxes={() => setShowAllBboxes(!showAllBboxes)}
                zoomPercent={zoomPercent}
                onZoomChange={handleZoomChange}
                onZoomReset={handleZoomReset}
                pageChunks={pageChunks}
                cacheTelemetry={cacheTelemetry}
                selectedChunkId={selectedChunkId}
                onSelectChunk={setSelectedChunkId}
                className={mobilePane === 'canvas' ? 'flex' : 'hidden md:flex'}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: CORPUS & CHUNK COORDINATE INSPECTOR */}
        {activeTab === 'CORPUS' && (
          <CorpusView onInspectInWorkspace={handleInspectFromCorpus} />
        )}

        {/* VIEW 3: GROUNDING BENCHMARKS & EVALS */}
        {activeTab === 'EVALS' && <EvalsView />}

        {/* VIEW 4: SYSTEM CONFIGURATION & HYPERPARAMETERS */}
        {activeTab === 'CONFIG' && <ConfigView />}
      </main>
    </div>
  );
}
