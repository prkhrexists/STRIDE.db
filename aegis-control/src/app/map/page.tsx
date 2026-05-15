'use client';

import React, { useState, useRef, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function AnalysisCenter() {
  const [flights, setFlights] = useState([
    { id: 'f1', name: 'Flight 001', date: '2026-05-14', frames: 24, status: 'Analyzed' },
    { id: 'f2', name: 'Flight 002', date: '2026-05-13', frames: 18, status: 'Analyzed' },
    { id: 'f3', name: 'Flight 003', date: '2026-05-10', frames: 24, status: 'Analyzed' },
  ]);
  const [selectedFlightId, setSelectedFlightId] = useState('f1');
  
  // Comparison state
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareFlightId, setCompareFlightId] = useState('f2');
  
  const [filter, setFilter] = useState('All');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFlight = flights.find(f => f.id === selectedFlightId);

  const [frames, setFrames] = useState([
    { id: 'frame1', url: 'https://images.unsplash.com/photo-1590492825656-9a54523fa5d9?auto=format&fit=crop&q=80', prevUrl: 'https://images.unsplash.com/photo-1590492825656-9a54523fa5d9?auto=format&fit=crop&q=60', status: 'CRITICAL', type: 'crack', conf: 92, lat: 34.0522, lon: -118.2437, ts: 1684065600, bboxes: [{ x: 20, y: 30, w: 10, h: 40, type: 'crack' }], metadata: { zone: 'NW facade' }, flagged: false, ssim: 0.81 },
    { id: 'frame2', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80', prevUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=60', status: 'CLEAN', type: 'none', conf: 98, lat: 34.0523, lon: -118.2436, ts: 1684065605, bboxes: [], metadata: { zone: 'NW facade' }, flagged: false, ssim: 0.96 },
    { id: 'frame3', url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80', prevUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=60', status: 'DEFECT', type: 'spalling', conf: 85, lat: 34.0524, lon: -118.2435, ts: 1684065610, bboxes: [{ x: 50, y: 50, w: 15, h: 15, type: 'spalling' }], metadata: { zone: 'SE pylon' }, flagged: true, ssim: 0.89 },
  ]);

  const handleDemoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFlightId = `flight_demo_${Date.now()}`;
      const newFrames = Array.from(e.target.files).map((file, i) => ({
        id: `demo_frame_${i}`,
        url: URL.createObjectURL(file),
        prevUrl: URL.createObjectURL(file),
        status: 'DEFECT',
        type: 'spalling',
        conf: 85,
        lat: 34.0,
        lon: -118.0,
        ts: Date.now(),
        bboxes: [{ x: 40, y: 40, w: 20, h: 20, type: 'spalling' }],
        metadata: { zone: 'Demo Area' },
        flagged: false,
        ssim: 0.99
      }));
      setFlights([...flights, { id: newFlightId, name: `Demo Flight`, date: new Date().toISOString().split('T')[0], frames: newFrames.length, status: 'Analyzed' }]);
      setSelectedFlightId(newFlightId);
      setFrames(newFrames);
    }
  };

  const filteredFrames = frames.filter(f => {
    if (filter === 'All') return true;
    if (filter === 'Critical') return f.status === 'CRITICAL';
    if (filter === 'Flagged') return f.flagged;
    if (filter === 'Clean') return f.status === 'CLEAN';
    return true;
  });

  const handleFlagFrame = async (frameId: string) => {
    // Optimistic UI update
    setFrames(frames.map(f => f.id === frameId ? { ...f, flagged: true } : f));
    
    // API call
    try {
      await fetch('/api/analyze/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flightId: selectedFlightId, frameId, flagged: true })
      });
    } catch(err) {
      console.error('Failed to flag');
    }
  };

  // Stats
  const totalFrames = frames.length;
  const criticalCount = frames.filter(f => f.status === 'CRITICAL').length;
  const defectCount = frames.filter(f => f.status === 'DEFECT').length;
  const cleanCount = frames.filter(f => f.status === 'CLEAN').length;
  const cleanPercent = Math.round((cleanCount / totalFrames) * 100) || 0;
  
  // Most affected zone logic
  const zoneCounts: Record<string, number> = {};
  frames.filter(f => f.status !== 'CLEAN').forEach(f => {
    zoneCounts[f.metadata.zone] = (zoneCounts[f.metadata.zone] || 0) + 1;
  });
  const mostAffectedZone = Object.keys(zoneCounts).length > 0 
    ? Object.keys(zoneCounts).reduce((a, b) => zoneCounts[a] > zoneCounts[b] ? a : b)
    : 'N/A';

  // Chart Data
  const chartData = {
    labels: ['2026-05-10', '2026-05-13', '2026-05-14'],
    datasets: [
      {
        label: 'NW Facade Defects',
        data: [1, 2, 3],
        borderColor: '#ef4444',
        backgroundColor: '#ef4444',
      },
      {
        label: 'SE Pylon Defects',
        data: [0, 1, 1],
        borderColor: '#f97316',
        backgroundColor: '#f97316',
      }
    ],
  };

  return (
    <PageShell title="Flight Image Analysis" backHref="/">
      <div style={{ display: 'flex', height: 'calc(100vh - 96px)', margin: '-1.5rem', backgroundColor: '#0f172a', color: 'white' }}>
        
        {/* Left Panel */}
        <div style={{ width: '320px', backgroundColor: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Select Flight</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              {flights.map(f => (
                <div key={f.id} onClick={() => setSelectedFlightId(f.id)} style={{ padding: '0.75rem', backgroundColor: selectedFlightId === f.id ? '#334155' : 'transparent', borderRadius: '0.5rem', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 'bold' }}>{f.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{f.date} — {f.frames} frames</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: f.status === 'Analyzed' ? '#22c55e' : '#eab308' }}>{f.status}</div>
                </div>
              ))}
            </div>
            <button onClick={() => fileInputRef.current?.click()} style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
              + Import Demo Flight
            </button>
            <input type="file" multiple accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleDemoUpload} />
          </div>
          
          <div style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['All', 'Critical', 'Flagged', 'Clean'].map(opt => (
                <button key={opt} onClick={() => setFilter(opt)} style={{ padding: '0.25rem 0.5rem', backgroundColor: filter === opt ? '#3b82f6' : '#334155', border: 'none', color: 'white', borderRadius: '0.25rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {filteredFrames.map(f => (
                <img key={f.id} src={f.url} alt="thumb" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '0.25rem' }} />
              ))}
            </div>
          </div>
        </div>

        {/* Main Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0 }}>{selectedFlight?.name}</h2>
              <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{selectedFlight?.date} — {filteredFrames.length} frames showing</div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={isCompareMode} onChange={(e) => setIsCompareMode(e.target.checked)} />
                Compare with previous flight
              </label>
              {isCompareMode && (
                <select 
                  value={compareFlightId} 
                  onChange={e => setCompareFlightId(e.target.value)}
                  style={{ padding: '0.25rem 0.5rem', backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '0.25rem' }}
                >
                  {flights.filter(f => f.id !== selectedFlightId).map(f => (
                    <option key={f.id} value={f.id}>Compare against: {f.name}</option>
                  ))}
                </select>
              )}
              <button style={{ padding: '0.5rem 1rem', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Run Analysis</button>
              <button style={{ padding: '0.5rem 1rem', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Export</button>
            </div>
          </div>
          
          <div style={{ padding: '1.5rem 1.5rem 0 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#1e293b', borderRadius: '0.5rem', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Frames Analyzed</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{totalFrames}</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#1e293b', borderRadius: '0.5rem', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Defects Found</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                {criticalCount + defectCount} <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: '#94a3b8' }}>({criticalCount} crit, {defectCount} med)</span>
              </div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#1e293b', borderRadius: '0.5rem', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Clean Frames</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.25rem', color: '#22c55e' }}>{cleanPercent}%</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#1e293b', borderRadius: '0.5rem', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Most Affected Zone</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.25rem', color: '#eab308' }}>{mostAffectedZone}</div>
            </div>
          </div>

          <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isCompareMode ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '1.5rem' }}>
              {filteredFrames.map(f => (
                <div key={f.id} style={{ backgroundColor: '#1e293b', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #334155', position: 'relative' }}>
                  
                  {isCompareMode ? (
                    <div style={{ display: 'flex', width: '100%', height: '200px' }}>
                      <div style={{ flex: 1, position: 'relative', borderRight: '2px dashed #0f172a' }}>
                        <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', zIndex: 10, padding: '0.2rem 0.4rem', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: '0.25rem', fontSize: '0.7rem' }}>Baseline</div>
                        <img src={f.prevUrl} alt="prev frame" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', zIndex: 10, padding: '0.2rem 0.4rem', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: '0.25rem', fontSize: '0.7rem' }}>Current</div>
                        <img src={f.url} alt="frame" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {f.bboxes.map((b, i) => (
                          <div key={i} style={{ position: 'absolute', top: `${b.y}%`, left: `${b.x}%`, width: `${b.w}%`, height: `${b.h}%`, border: '2px solid red', pointerEvents: 'none' }} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <img src={f.url} alt="frame" style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                      {f.bboxes.map((b, i) => (
                        <div key={i} style={{ position: 'absolute', top: `${b.y}%`, left: `${b.x}%`, width: `${b.w}%`, height: `${b.h}%`, border: '2px solid red', pointerEvents: 'none' }} />
                      ))}
                    </div>
                  )}

                  <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    {f.flagged && (
                      <div style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#ef4444', color: 'white' }}>
                        🚩 URGENT
                      </div>
                    )}
                    {!f.flagged && (
                       <button onClick={() => handleFlagFrame(f.id)} style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid #ef4444', cursor: 'pointer' }}>
                         Flag
                       </button>
                    )}
                    <div style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: f.status === 'CRITICAL' ? '#ef4444' : f.status === 'DEFECT' ? '#f97316' : '#22c55e', color: 'white' }}>
                      {f.status}
                    </div>
                  </div>

                  {isCompareMode && f.ssim < 0.85 && (
                    <div style={{ position: 'absolute', top: '2.5rem', right: '0.5rem', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#ef4444', color: 'white' }}>
                      ↑ {Math.round((1 - f.ssim)*100)}% deterioration
                    </div>
                  )}

                  <div style={{ padding: '1rem' }}>
                    {f.type !== 'none' && <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '0.5rem' }}>{f.type.toUpperCase()}</div>}
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{f.lat.toFixed(4)}, {f.lon.toFixed(4)} | Zone: {f.metadata.zone}</span>
                      <span>{new Date(f.ts).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '4px', backgroundColor: '#334155', borderRadius: '2px' }}>
                        <div style={{ width: `${f.conf}%`, height: '100%', backgroundColor: f.conf > 90 ? '#22c55e' : '#eab308', borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem' }}>{f.conf}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline Chart */}
            <div style={{ padding: '1rem', backgroundColor: '#1e293b', borderRadius: '0.5rem', border: '1px solid #334155', marginTop: 'auto' }}>
               <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Defect Timeline by Zone</h3>
               <div style={{ height: '200px', width: '100%' }}>
                 <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }, x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } } }, plugins: { legend: { labels: { color: '#fff' } } } }} />
               </div>
            </div>

          </div>
        </div>
      </div>
    </PageShell>
  );
}
