import React from 'react';

interface SkeletonBlockProps {
  rows?: number;
  height?: string;
  className?: string;
}

export function SkeletonBlock({ rows = 1, height, className = '' }: SkeletonBlockProps) {
  if (rows > 1) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="bg-[#21262d] rounded animate-pulse w-full"
            style={{ height: height || '24px' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`bg-[#21262d] rounded animate-pulse w-full ${className}`}
      style={height ? { height } : {}}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#1c2128] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3 ${className}`}>
      <SkeletonBlock height="20px" className="w-1/3" />
      <SkeletonBlock height="64px" />
    </div>
  );
}

export function SkeletonTable({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#1c2128] border border-[#30363d] rounded-xl overflow-hidden ${className}`}>
      <div className="bg-[#161b22] border-b border-[#30363d] p-3">
        <SkeletonBlock height="16px" className="w-1/4" />
      </div>
      <div className="p-4 flex flex-col gap-4">
        <SkeletonBlock height="16px" />
        <SkeletonBlock height="16px" className="w-11/12" />
        <SkeletonBlock height="16px" className="w-10/12" />
      </div>
    </div>
  );
}

export function SkeletonStat({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#1c2128] border border-[#30363d] rounded-xl p-4 flex flex-col items-center justify-center gap-2 ${className}`}>
      <SkeletonBlock height="14px" className="w-1/2" />
      <SkeletonBlock height="36px" className="w-3/4" />
    </div>
  );
}
