'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  Search,
  MessageSquare,
  Cpu,
  FileText,
  Settings,
  Play,
  Square,
  Radio,
  Shield,
  Activity,
  Box,
} from 'lucide-react';

interface SidebarProps {
  isDemoMode?: boolean;
  onToggleDemo?: () => void;
  systemStatus?: 'online' | 'offline' | 'degraded';
}

const navItems = [
  {
    section: 'Operations',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/map', label: 'Analysis Center', icon: Map },
      { href: '/search', label: '3D Analysis', icon: Box },
      { href: '/chat', label: 'AI Analyst', icon: MessageSquare },
    ],
  },
  {
    section: 'Management',
    items: [
      { href: '/drone', label: 'Flight Config', icon: Cpu },
      { href: '/files', label: 'Reports', icon: FileText },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function Sidebar({ isDemoMode, onToggleDemo, systemStatus = 'offline' }: SidebarProps) {
  const pathname = usePathname();

  const statusColor =
    systemStatus === 'online' ? 'var(--accent-green)' :
    systemStatus === 'degraded' ? 'var(--accent-amber)' :
    'var(--accent-red)';

  const statusLabel =
    systemStatus === 'online' ? 'Systems Nominal' :
    systemStatus === 'degraded' ? 'Degraded' :
    'Offline';

  return (
    <aside className="stride-sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Shield size={16} color="white" strokeWidth={2.5} />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name" style={{ letterSpacing: '-0.04em', fontSize: '18px', fontWeight: 900 }}>STRIDE</span>
          <span className="sidebar-brand-sub" style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>Dashboard v2.0</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((group) => (
          <div key={group.section}>
            <div className="nav-section-label">{group.section}</div>
            {group.items.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* System Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-primary)',
            marginBottom: 4,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: statusColor,
              boxShadow: `0 0 6px ${statusColor}`,
              animation: systemStatus === 'online' ? 'pulse-dot 2s infinite' : undefined,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
              System Status
            </div>
            <div style={{ fontSize: 10, color: statusColor, fontWeight: 700 }}>
              {statusLabel}
            </div>
          </div>
          <Activity size={12} color="var(--text-muted)" />
        </div>

        {/* Demo Mode Toggle */}
        {onToggleDemo && (
          <button
            onClick={onToggleDemo}
            className={isDemoMode ? 'btn btn-danger btn-sm' : 'btn btn-secondary btn-sm'}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {isDemoMode ? (
              <>
                <Square size={12} />
                Exit Demo Mode
              </>
            ) : (
              <>
                <Play size={12} />
                Start Demo
              </>
            )}
          </button>
        )}

        {/* Radio/Connection indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}>
          <Radio size={11} color="var(--text-muted)" />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {isDemoMode ? 'Demo telemetry active' : 'Awaiting MAVLink'}
          </span>
        </div>
      </div>
    </aside>
  );
}
