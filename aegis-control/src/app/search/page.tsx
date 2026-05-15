'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import PageShell from '@/components/PageShell';

// Dynamically import the ThreeJS viewer with SSR disabled
const Viewer3D = dynamic(() => import('./Viewer'), { 
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', height: 'calc(100vh - 96px)', margin: '-1.5rem', backgroundColor: '#0d1117', color: '#c9d1d9', alignItems: 'center', justifyContent: 'center' }}>
      Loading 3D Engine...
    </div>
  )
});

export default function SearchPage() {
  return (
    <PageShell title="3D Structure Model" backHref="/">
      <Viewer3D />
    </PageShell>
  );
}
