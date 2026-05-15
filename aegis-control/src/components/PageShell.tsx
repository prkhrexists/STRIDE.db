import React, { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export interface PageShellProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  children: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
}

import { SkeletonBlock } from './SkeletonBlock';

export default function PageShell({
  title,
  subtitle,
  backHref,
  children,
  actions,
  loading = false,
}: PageShellProps) {
  const router = useRouter();

  return (
    <div className="bg-[#0d1117] min-h-screen flex flex-col w-full">
      <div className="h-[48px] bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-4 shrink-0">
        <div className="flex-1 flex items-center justify-start">
          {backHref && (
            <button
              onClick={() => router.push(backHref)}
              className="text-[#8b949e] hover:text-white transition-colors text-sm font-medium flex items-center gap-1"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
          )}
        </div>

        <div className="flex-2 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline">
            <span className="text-white text-sm font-medium">{title}</span>
            {subtitle && <span className="text-[#8b949e] text-xs ml-2">{subtitle}</span>}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-end">
          {actions}
        </div>
      </div>

      <div className="p-6 flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col gap-4">
             <SkeletonBlock className="h-64" />
             <SkeletonBlock className="h-32" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
