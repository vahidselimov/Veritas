'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setActiveCitation(null);
    }
  };

  const handleZoomChange = (delta: number) => {
    setZoomPercent((prev) => Math.min(Math.max(prev + delta, 60), 160));
  };

  const handleInspectFromCorpus = (docId: string, pageNumber = 1) => {
    setActiveTab('WORKSPACE');
    handleSelectDoc(docId, pageNumber);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-obsidian text-textPrimary">
      {/* 1. Ümumi Yuxarı Header (App Chrome) */}
      <AppChrome
        activeTab={activeTab}
        onTabChange={setActiveTab}
        chunksCount={1480}
        latencyMs={latencyMs}
      />

      {/* 2. Əsas Dinamik Ekran */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* VIEW 1: WORKSPACE (Swiss 3-Pane Split Screen) */}
        {activeTab === 'WORKSPACE' && (
          <div className="flex-1 flex flex-row overflow-hidden w-full h-full">
            {/* Sol Panel: Sənədlər və Axtarış Nəzarəti (260px) */}
            <DocumentSidebar
              selectedDocId={selectedDocId}
              onSelectDoc={handleSelectDoc}
              denseWeight={denseWeight}
              onDenseWeightChange={setDenseWeight}
              topK={topK}
              onTopKChange={setTopK}
            />

            {/* Orta Panel: Tədqiqat Çat və Retrieval Trace (42%) */}
            <ResearchStream
              activeCitation={activeCitation}
              onCitationClick={handleCitationClick}
              onClearSession={() => setActiveCitation(null)}
              onSubmitQuery={(q) => console.log('Query submitted:', q)}
            />

            {/* Sağ Panel: Kağız Sənəd Evidence Canvas (#F8F7F4, 58%) */}
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
              pageChunks={pageChunks}
              cacheTelemetry={cacheTelemetry}
              selectedChunkId={selectedChunkId}
              onSelectChunk={setSelectedChunkId}
            />
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
