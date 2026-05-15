'use client';

import React, { useState } from 'react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPylonId?: string;
}

export default function ReportModal({ isOpen, onClose, defaultPylonId }: ReportModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [targetPylon, setTargetPylon] = useState(defaultPylonId || '');
  const [dateRange, setDateRange] = useState('all');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setSummaryText('');
    setPdfUrl(null);

    try {
      const payload: any = { format: 'pdf' };
      if (targetPylon) payload.pylonIds = [targetPylon];

      const res = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let currentText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              if (data.text) {
                currentText += data.text;
                setSummaryText(currentText);
              }
              if (data.pdfUrl) {
                setPdfUrl(data.pdfUrl);
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      setSummaryText('Error generating report.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#1e293b', width: '600px', borderRadius: '0.75rem', border: '1px solid #334155', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc' }}>Generate Inspection Report</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Target Pylon</label>
              <input 
                type="text" 
                value={targetPylon} 
                onChange={e => setTargetPylon(e.target.value)} 
                placeholder="Leave blank for all" 
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', borderRadius: '0.375rem' }}
                disabled={isGenerating || !!pdfUrl}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Date Range</label>
              <select 
                value={dateRange} 
                onChange={e => setDateRange(e.target.value)} 
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', borderRadius: '0.375rem' }}
                disabled={isGenerating || !!pdfUrl}
              >
                <option value="all">All Time</option>
                <option value="last24">Last 24 Hours</option>
                <option value="last7">Last 7 Days</option>
              </select>
            </div>
          </div>

          {!isGenerating && !pdfUrl && (
            <button 
              onClick={handleGenerate}
              style={{ padding: '0.75rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' }}
            >
              Start AI Generation
            </button>
          )}

          {isGenerating && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                <span>Compiling data & writing narrative...</span>
                <div style={{ width: '1rem', height: '1rem', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: '#0f172a', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '50%', height: '100%', backgroundColor: '#3b82f6', animation: 'indeterminate 1.5s infinite linear', transformOrigin: '0% 50%' }}></div>
              </div>
            </div>
          )}

          {(summaryText || isGenerating) && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#0f172a', borderRadius: '0.5rem', border: '1px solid #334155' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#cbd5e1', textTransform: 'uppercase' }}>Executive Summary Draft</h3>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: '1.5', maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {summaryText}
                {isGenerating && <span style={{ display: 'inline-block', width: '6px', height: '12px', backgroundColor: '#3b82f6', marginLeft: '4px', animation: 'blink 1s infinite' }}></span>}
              </div>
            </div>
          )}

          {pdfUrl && !isGenerating && (
            <div style={{ marginTop: '1rem', padding: '1.5rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '0.5rem', textAlign: 'center' }}>
              <div style={{ color: '#22c55e', fontWeight: 'bold', marginBottom: '1rem' }}>✓ Report Generation Complete</div>
              <a 
                href={pdfUrl} 
                download
                style={{ display: 'inline-block', padding: '0.75rem 2rem', backgroundColor: '#22c55e', color: 'white', textDecoration: 'none', borderRadius: '0.5rem', fontWeight: 'bold' }}
              >
                Download PDF Document
              </a>
            </div>
          )}

        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes indeterminate { 0% { transform: translateX(-100%) scaleX(0.2); } 100% { transform: translateX(200%) scaleX(0.2); } }
      `}} />
    </div>
  );
}
