'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={15} color="var(--accent-green)" />,
  error: <XCircle size={15} color="var(--accent-red)" />,
  warning: <AlertTriangle size={15} color="var(--accent-amber)" />,
  info: <Info size={15} color="var(--accent-blue)" />,
};

const colors: Record<ToastType, { border: string; bg: string }> = {
  success: { border: 'rgba(34,197,94,0.3)', bg: 'rgba(34,197,94,0.06)' },
  error: { border: 'rgba(239,68,68,0.3)', bg: 'rgba(239,68,68,0.06)' },
  warning: { border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.06)' },
  info: { border: 'rgba(59,130,246,0.3)', bg: 'rgba(59,130,246,0.06)' },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration ?? 3500);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 14px',
        background: `var(--bg-elevated)`,
        border: `1px solid ${colors[toast.type].border}`,
        backgroundColor: colors[toast.type].bg,
        borderRadius: 'var(--radius-md)',
        backdropFilter: 'blur(16px)',
        boxShadow: 'var(--shadow-card)',
        animation: 'slide-in-right 0.25s ease',
        minWidth: 240,
        maxWidth: 360,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <span style={{ flexShrink: 0 }}>{icons[toast.type]}</span>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
        {toast.message}
      </span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          padding: 2,
          display: 'flex',
          flexShrink: 0,
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration }]);
  }, []);

  const ctx: ToastContextType = {
    toast: addToast,
    success: (m) => addToast(m, 'success'),
    error: (m) => addToast(m, 'error'),
    warning: (m) => addToast(m, 'warning'),
    info: (m) => addToast(m, 'info'),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onRemove={removeToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// Standalone toast for pages without provider
let _globalToast: ToastContextType | null = null;
export function setGlobalToast(ctx: ToastContextType) {
  _globalToast = ctx;
}
export function globalToast(message: string, type: ToastType = 'info') {
  _globalToast?.toast(message, type);
}
