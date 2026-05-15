'use client';

import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';

export interface PageShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  isDemoMode?: boolean;
  onToggleDemo?: () => void;
  systemStatus?: 'online' | 'offline' | 'degraded';
  noPadding?: boolean;
}

import { SkeletonBlock } from './SkeletonBlock';

export default function PageShell({
  title,
  subtitle,
  children,
  actions,
  loading = false,
  isDemoMode,
  onToggleDemo,
  systemStatus = 'offline',
  noPadding = false,
}: PageShellProps) {
  return (
    <div className="stride-layout">
      <Sidebar isDemoMode={isDemoMode} onToggleDemo={onToggleDemo} systemStatus={systemStatus} />

      <div className="stride-main">
        {/* Top Header Bar */}
        <div
          style={{
            height: 'var(--header-height)',
            background: 'rgba(11, 17, 26, 0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
            zIndex: 20,
            position: 'relative'
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 500 }}>{subtitle}</div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isDemoMode && (
              <div className="badge badge-amber" style={{ animation: 'pulse-dot 2s infinite', padding: '4px 12px' }}>
                <div className="status-dot status-warning" style={{ width: 6, height: 6 }} />
                CINEMATIC DEMO
              </div>
            )}
            {actions}
          </div>
        </div>

        {/* Content */}
        <div className={noPadding ? '' : 'page-content'} style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: noPadding ? 24 : 0 }}>
              <SkeletonBlock className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-lg)' }} />
              <SkeletonBlock className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
              <SkeletonBlock className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
