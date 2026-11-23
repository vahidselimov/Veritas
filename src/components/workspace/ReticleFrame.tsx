'use client';

import React from 'react';

interface ReticleFrameProps {
  label: string;
  coord: string;
  children: React.ReactNode;
  isActive?: boolean;
}

export const ReticleFrame: React.FC<ReticleFrameProps> = ({
  label,
  coord,
  children,
  isActive = true,
}) => {
  return (
    <div
      className={`relative p-3 border transition-all duration-150 ${
        isActive
          ? 'border-accent bg-accent/10 animate-reticle-lock'
          : 'border-panelBorder bg-panel'
      }`}
    >
      {/* 4 Künc L-şəkilli optik nişangah bığcıqları */}
      <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-accent" />
      <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-accent" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-accent" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-accent" />

      {/* Meta başlıq */}
      <div className="flex items-center justify-between text-[10px] font-mono text-accent mb-2 uppercase tracking-wider">
        <span className="font-bold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-accent" />
          {label}
        </span>
        <span className="text-textMuted">{coord}</span>
      </div>

      {/* Əsas mətn */}
      <div className="text-xs text-textPrimary leading-relaxed font-sans">
        {children}
      </div>
    </div>
  );
};
