'use client';

import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Flight {
  flightId: string;
  sessionId: number;
  date: string;
  frameCount: number;
  pylons: string[];
}

interface SSIMMatch {
  baseFrame: string;
  currentFrame: string;
  ssim: number;
  severity: number;
  lat: number;
  lon: number;
  changeType: string;
  pylonId?: string;
}

export default function ComparePage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [baselineId, setBaselineId] = useState<string>('');
  const [currentId, setCurrentId] = useState<string>('');
  const [pylonFilter, setPylonFilter] = useState<string>('');
  
  const [results, setResults] = useState<SSIMMatch[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/flights/list')
      .then(res => res.json())
      .then(data => {
        if (data.flights) {
          setFlights(data.flights);
          if (data.flights.length >= 2) {
            setCurrentId(data.flights[0].flightId);
            setBaselineId(data.flights[1].flightId);
          } else if (data.flights.length === 1) {
            setBaselineId(data.flights[0].flightId);
            setCurrentId(data.flights[0].flightId);
          }
        }
      })
      .catch(e => console.error("Error loading flights", e));
  }, []);

  const handleAnalyze = async () => {
    if (!baselineId || !currentId) {
      setError('Please select both baseline and current flights.');
      return;
    }
    setError('');
    setIsAnalyzing(true);
    setResults([]);

    try {
      const res = await fetch('/api/compare/ssim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baselineFlightId: baselineId,
          currentFlightId: currentId,
          pylonId: pylonFilter.trim() || undefined
        })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setResults(data.pairs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`AEGIS_Inspection_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Failed to export PDF.");
    }
  };

  const handleLocate = (lat: number, lon: number) => {
    // Dispatch custom event for the map
    window.dispatchEvent(new CustomEvent('defect-located', {
      detail: { lat, lon }
    }));
    alert(`Dispatched defect-located event: [${lat.toFixed(5)}, ${lon.toFixed(5)}]`);
  };

  const baselineFlight = flights.find(f => f.flightId === baselineId);
  const currentFlight = flights.find(f => f.flightId === currentId);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#111827', color: '#f3f4f6', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* LEFT PANEL */}
      <div style={{ width: '350px', backgroundColor: '#1f2937', padding: '2rem', borderRight: '1px solid #374151', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#60a5fa' }}>Change Detection</h1>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '-1rem' }}>SSIM Structural Analysis</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#d1d5db' }}>Baseline Flight</label>
          <select 
            value={baselineId} 
            onChange={e => setBaselineId(e.target.value)}
            style={{ padding: '0.75rem', backgroundColor: '#111827', border: '1px solid #4b5563', color: '#fff', borderRadius: '0.375rem' }}
          >
            <option value="">-- Select Flight --</option>
            {flights.map(f => (
              <option key={f.flightId} value={f.flightId}>
                Flight {f.sessionId} ({new Date(f.date).toLocaleDateString()}) — {f.frameCount} frames
              </option>
            ))}
          </select>
          {baselineFlight && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Pylons: {baselineFlight.pylons.join(', ') || 'None'}</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#d1d5db' }}>Current Flight</label>
          <select 
            value={currentId} 
            onChange={e => setCurrentId(e.target.value)}
            style={{ padding: '0.75rem', backgroundColor: '#111827', border: '1px solid #4b5563', color: '#fff', borderRadius: '0.375rem' }}
          >
            <option value="">-- Select Flight --</option>
            {flights.map(f => (
              <option key={f.flightId} value={f.flightId}>
                Flight {f.sessionId} ({new Date(f.date).toLocaleDateString()}) — {f.frameCount} frames
              </option>
            ))}
          </select>
          {currentFlight && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Pylons: {currentFlight.pylons.join(', ') || 'None'}</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#d1d5db' }}>Pylon Filter (Optional)</label>
          <input 
            type="text" 
            placeholder="e.g. pylon_A3" 
            value={pylonFilter}
            onChange={e => setPylonFilter(e.target.value)}
            style={{ padding: '0.75rem', backgroundColor: '#111827', border: '1px solid #4b5563', color: '#fff', borderRadius: '0.375rem' }}
          />
        </div>

        {error && <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '1rem', borderRadius: '0.375rem', fontSize: '0.875rem', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}

        <button 
          onClick={handleAnalyze} 
          disabled={isAnalyzing}
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: isAnalyzing ? '#4b5563' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: 'bold',
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {isAnalyzing ? 'Running SSIM Analysis...' : 'Run SSIM Analysis'}
        </button>

        {results.length > 0 && (
          <button 
            onClick={handleExportPDF}
            style={{
              padding: '1rem',
              backgroundColor: 'transparent',
              color: '#d1d5db',
              border: '1px solid #4b5563',
              borderRadius: '0.5rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            Export to PDF
          </button>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div ref={reportRef} style={{ backgroundColor: '#111827', minHeight: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Comparison Results</h2>
            {results.length > 0 && (
              <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{results.length} pairs matched</div>
            )}
          </div>

          {results.length === 0 && !isAnalyzing && (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '4rem', border: '1px dashed #374151', borderRadius: '1rem' }}>
              <p style={{ fontSize: '1.125rem' }}>No results yet.</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Select flights and run analysis to see structural changes.</p>
            </div>
          )}

          {isAnalyzing && (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div style={{ width: '3rem', height: '3rem', border: '3px solid #374151', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
              <p style={{ marginTop: '1rem', color: '#9ca3af' }}>Extracting features & computing structural similarity...</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {results.map((pair, idx) => (
              <ResultCard key={idx} pair={pair} onLocate={() => handleLocate(pair.lat, pair.lon)} />
            ))}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}

function ResultCard({ pair, onLocate }: { pair: SSIMMatch, onLocate: () => void }) {
  const [showDiff, setShowDiff] = useState(false);

  const getSeverityColor = () => {
    if (pair.changeType === 'CRITICAL') return '#ef4444';
    if (pair.changeType === 'CHANGE DETECTED') return '#eab308';
    return '#22c55e';
  };

  return (
    <div style={{ backgroundColor: '#1f2937', borderRadius: '0.75rem', border: '1px solid #374151', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            GPS: {pair.lat.toFixed(5)}, {pair.lon.toFixed(5)}
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '9999px', 
              backgroundColor: `${getSeverityColor()}20`, 
              color: getSeverityColor(),
              border: `1px solid ${getSeverityColor()}40`
            }}>
              {pair.changeType}
            </span>
          </h3>
          <p style={{ margin: 0, marginTop: '0.25rem', color: '#9ca3af', fontSize: '0.875rem' }}>Target: {pair.pylonId || 'Unknown'}</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getSeverityColor() }}>{(pair.ssim * 100).toFixed(1)}%</div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>SSIM Score</div>
          </div>
          <button 
            onClick={onLocate}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#374151', color: 'white', border: '1px solid #4b5563', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            View on Map
          </button>
        </div>
      </div>

      {/* SEVERITY BAR */}
      <div style={{ height: '4px', width: '100%', backgroundColor: '#374151', display: 'flex' }}>
        <div style={{ height: '100%', width: `${pair.severity}%`, backgroundColor: getSeverityColor(), transition: 'width 0.5s ease-out' }}></div>
      </div>

      <div style={{ padding: '1.5rem', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#d1d5db', cursor: 'pointer' }}>
            <input type="checkbox" checked={showDiff} onChange={e => setShowDiff(e.target.checked)} />
            Show Diff Overlay
          </label>
        </div>

        {showDiff ? (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '21/9', backgroundColor: '#000', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #4b5563' }}>
            <img src={pair.baseFrame} alt="Baseline" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            <img src={pair.currentFrame} alt="Current" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'difference' }} />
            <div style={{ position: 'absolute', top: '1rem', left: '1rem', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
              DIFFERENCE MAP (MIX BLEND)
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', zIndex: 10 }}>Baseline</div>
              <img src={pair.baseFrame} alt="Baseline" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid #4b5563' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', zIndex: 10 }}>Current</div>
              <img src={pair.currentFrame} alt="Current" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid #4b5563' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
