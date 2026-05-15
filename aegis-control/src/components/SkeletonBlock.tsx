import React from 'react';

interface SkeletonBlockProps {
  className?: string;
  style?: React.CSSProperties;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

export function SkeletonBlock({ className = '', style, width, height, rounded = false }: SkeletonBlockProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? 16,
        borderRadius: rounded ? '999px' : 'var(--radius-sm)',
        ...style,
      }}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} height={14} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div
      className="skeleton"
      style={{
        height,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-primary)',
      }}
    />
  );
}
