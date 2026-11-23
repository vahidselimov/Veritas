'use client';

import React, { useState } from 'react';
import { AppChrome, NavTab } from '@/components/workspace/AppChrome';
import { DocumentSidebar } from '@/components/workspace/DocumentSidebar';
import { ResearchStream } from '@/components/workspace/ResearchStream';
import { EvidenceCanvas } from '@/components/workspace/EvidenceCanvas';
import { CorpusView } from '@/components/workspace/CorpusView';
import { EvalsView } from '@/components/workspace/EvalsView';
import { ConfigView } from '@/components/workspace/ConfigView';

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('WORKSPACE');
  const [selectedDocId, setSelectedDocId] = useState('cuda_kernel');
  const [activeCitation, setActiveCitation] = useState<number | null>(1);
  const [denseWeight, setDenseWeight] = useState(65);
  const [topK, setTopK] = useState(40);
  const [currentPage, setCurrentPage] = useState(4);
  const [totalPages] = useState(18);
  const [showAllBboxes, setShowAllBboxes] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);

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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-obsidian text-textPrimary">
      {/* 1. Ümumi Yuxarı Header (App Chrome) */}
      <AppChrome
        activeTab={activeTab}
        onTabChange={setActiveTab}
        chunksCount={1480}
        latencyMs={14}
      />

      {/* 2. Əsas Dinamik Ekran */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* VIEW 1: WORKSPACE (Swiss 3-Pane Split Screen) */}
        {activeTab === 'WORKSPACE' && (
          <div className="flex-1 flex flex-row overflow-hidden w-full h-full">
            {/* Sol Panel: Sənədlər və Axtarış Nəzarəti (260px) */}
            <DocumentSidebar
              selectedDocId={selectedDocId}
              onSelectDoc={setSelectedDocId}
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
              documentName="cuda_kernel.pdf"
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              activeCitation={activeCitation}
              showAllBboxes={showAllBboxes}
              onToggleAllBboxes={() => setShowAllBboxes(!showAllBboxes)}
              zoomPercent={zoomPercent}
              onZoomChange={handleZoomChange}
            />
          </div>
        )}

        {/* VIEW 2: CORPUS & CHUNK COORDINATE INSPECTOR */}
        {activeTab === 'CORPUS' && <CorpusView />}

        {/* VIEW 3: GROUNDING BENCHMARKS & EVALS */}
        {activeTab === 'EVALS' && <EvalsView />}

        {/* VIEW 4: SYSTEM CONFIGURATION & HYPERPARAMETERS */}
        {activeTab === 'CONFIG' && <ConfigView />}
      </main>
    </div>
  );
}
