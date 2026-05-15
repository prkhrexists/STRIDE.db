'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

export default function ReportsPage() {
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [reportData, setReportData] = useState<any>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Form State
  const [selectedFlights, setSelectedFlights] = useState<string[]>(['Flight 001']);
  const [target, setTarget] = useState('Bridge North Tower');
  const [reportType, setReportType] = useState('Full Inspection');
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeGps, setIncludeGps] = useState(true);
  const [includeSsim, setIncludeSsim] = useState(false);

  const availableFlights = ['Flight 001', 'Flight 002', 'Flight 003'];

  useEffect(() => {
    fetch('/api/report/list')
      .then(res => res.json())
      .then(data => setSavedReports(data.reports || []));
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setReportData(null);
    setProgressStep(1); // Loading data
    
    // Simulate steps
    setTimeout(() => setProgressStep(2), 800); // AI Analysis
    setTimeout(() => setProgressStep(3), 1600); // Building charts
    setTimeout(() => setProgressStep(4), 2400); // Rendering PDF

    try {
      const res = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flights: selectedFlights, target, type: reportType, includePhotos, includeGps, includeSsim })
      });
      const data = await res.json();
      
      setTimeout(() => {
        setIsGenerating(false);
        setReportData(data.reportData);
        setDownloadUrl(data.downloadUrl);
        // Refresh saved list
        fetch('/api/report/list').then(r => r.json()).then(d => setSavedReports(d.reports || []));
      }, 3000);
      
    } catch(err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  const toggleFlight = (f: string) => {
    if (selectedFlights.includes(f)) setSelectedFlights(selectedFlights.filter(x => x !== f));
    else setSelectedFlights([...selectedFlights, f]);
  };

  const renderStars = (count: number) => {
    return '★'.repeat(count) + '☆'.repeat(5 - count);
  };

  const progressLabels = ['Starting...', 'Loading data', 'AI Analysis', 'Building charts', 'Rendering PDF'];

  return (
    <PageShell title="Inspection Reports" backHref="/">
      <div style={{ display: 'flex', height: 'calc(100vh - 96px)', margin: '-1.5rem', backgroundColor: '#0d1117', color: '#c9d1d9', fontFamily: 'system-ui' }}>
        
        {/* LEFT SIDEBAR - CONFIGURATOR */}
        <div style={{ width: '280px', backgroundColor: '#161b22', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #30363d', flex: 1, overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', textTransform: 'uppercase', color: '#8b949e' }}>New Report</h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#8b949e' }}>Structure/Target</label>
              <select value={target} onChange={e => setTarget(e.target.value)} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem' }}>
                <option>Bridge North Tower</option>
                <option>HQ Building Facade</option>
                <option>High Voltage Pylon A12</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#8b949e' }}>Flights to Include</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {availableFlights.map(f => (
                  <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedFlights.includes(f)} onChange={() => toggleFlight(f)} /> {f}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#8b949e' }}>Report Type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {['Full Inspection', 'Defect Summary', 'Comparison Report'].map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input type="radio" name="rtype" checked={reportType === t} onChange={() => setReportType(t)} /> {t}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={includePhotos} onChange={e => setIncludePhotos(e.target.checked)} /> Include photos
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={includeGps} onChange={e => setIncludeGps(e.target.checked)} /> Include GPS coordinates
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: selectedFlights.length < 2 ? 'not-allowed' : 'pointer', opacity: selectedFlights.length < 2 ? 0.5 : 1 }}>
                <input type="checkbox" checked={includeSsim} onChange={e => setIncludeSsim(e.target.checked)} disabled={selectedFlights.length < 2} /> Include SSIM comparison
              </label>
            </div>

            <button 
              onClick={handleGenerate} 
              disabled={isGenerating || selectedFlights.length === 0}
              style={{ width: '100%', padding: '0.75rem', backgroundColor: '#238636', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 'bold', cursor: isGenerating || selectedFlights.length === 0 ? 'not-allowed' : 'pointer', opacity: isGenerating || selectedFlights.length === 0 ? 0.5 : 1 }}
            >
              Generate Report
            </button>
          </div>

          <div style={{ padding: '1.5rem', borderTop: '1px solid #30363d', height: '30%', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', textTransform: 'uppercase', color: '#8b949e' }}>Saved Reports</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {savedReports.map(r => (
                <div key={r.id} style={{ padding: '0.75rem', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '0.375rem' }}>
                   <div style={{ fontSize: '0.75rem', fontWeight: 'bold', wordBreak: 'break-all' }}>{r.filename}</div>
                   <div style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: '0.25rem', marginBottom: '0.5rem' }}>{r.date} • {r.size}</div>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                     <a href={`/api/report/download?file=${r.filename}`} style={{ flex: 1, padding: '0.25rem', textAlign: 'center', backgroundColor: '#21262d', color: '#58a6ff', fontSize: '0.75rem', borderRadius: '0.25rem', textDecoration: 'none' }}>Download</a>
                     <button style={{ padding: '0.25rem 0.5rem', backgroundColor: 'transparent', border: '1px solid #da3633', color: '#da3633', borderRadius: '0.25rem', cursor: 'pointer' }}>×</button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN AREA - PREVIEW */}
        <div style={{ flex: 1, position: 'relative', overflowY: 'auto' }}>
          
          {/* Empty State */}
          {!isGenerating && !reportData && (
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#8b949e' }}>
               <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
               <h2>No Report Selected</h2>
               <p>Select flights and generate a report to view the preview.</p>
             </div>
          )}

          {/* Generating State */}
          {isGenerating && (
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', width: '300px' }}>
               <div style={{ animation: 'spin 2s linear infinite', fontSize: '2rem', marginBottom: '1rem' }}>⚙️</div>
               <h3 style={{ marginBottom: '1rem' }}>{progressLabels[progressStep]}</h3>
               <div style={{ width: '100%', height: '8px', backgroundColor: '#30363d', borderRadius: '4px', overflow: 'hidden' }}>
                 <div style={{ width: `${(progressStep / 4) * 100}%`, height: '100%', backgroundColor: '#238636', transition: 'width 0.5s ease-in-out' }} />
               </div>
             </div>
          )}

          {/* Report Preview */}
          {!isGenerating && reportData && (
             <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '2px solid #30363d' }}>
                  <div>
                    <h1 style={{ margin: 0 }}>AEGIS Inspection Report</h1>
                    <div style={{ color: '#8b949e', marginTop: '0.5rem' }}>{target} • {reportType} • {new Date().toLocaleDateString()}</div>
                  </div>
                  {downloadUrl && (
                    <a href={downloadUrl} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1f6feb', color: 'white', textDecoration: 'none', borderRadius: '0.375rem', fontWeight: 'bold' }}>Download PDF</a>
                  )}
                </div>

                {/* Section 1: Exec Summary */}
                <div style={{ marginBottom: '3rem' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#58a6ff' }}>1. Executive Summary</h2>
                  <div style={{ padding: '1rem', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '0.5rem', marginBottom: '1.5rem', fontStyle: 'italic', lineHeight: 1.5 }}>
                    "{reportData.summary}"
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '0.5rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase' }}>Total Defects</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{reportData.stats.total}</div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: '#161b22', border: '1px solid #ef4444', borderRadius: '0.5rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase' }}>Critical Count</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>{reportData.stats.critical}</div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '0.5rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase' }}>Flights Analyzed</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{reportData.stats.flights}</div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase' }}>Health Score</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>{reportData.stats.healthScore}%</div>
                      </div>
                      <div style={{ width: '50px', height: '50px' }}>
                        <Doughnut data={{ labels: ['Clean', 'Medium', 'Critical'], datasets: [{ data: [82, 10, 8], backgroundColor: ['#238636', '#d29922', '#da3633'], borderWidth: 0 }] }} options={{ cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Priority Action List */}
                <div style={{ marginBottom: '3rem' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#da3633' }}>2. Priority Action List</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reportData.priorityItems.map((item: any) => (
                      <div key={item.id} style={{ display: 'flex', backgroundColor: '#161b22', border: '1px solid #da3633', borderRadius: '0.5rem', overflow: 'hidden' }}>
                        <img src={item.img} alt="defect" style={{ width: '150px', height: '150px', objectFit: 'cover' }} />
                        <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <span style={{ color: '#da3633' }}>🚩</span>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.zone}</span>
                                <span style={{ padding: '0.1rem 0.4rem', backgroundColor: '#da3633', color: 'white', borderRadius: '0.25rem', fontSize: '0.7rem' }}>{item.type.toUpperCase()}</span>
                              </div>
                              <div style={{ fontSize: '0.875rem', color: '#8b949e' }}>GPS: {item.gps} • {item.flight}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase' }}>Urgency</div>
                              <div style={{ color: '#d29922' }}>{renderStars(item.urgency)}</div>
                            </div>
                          </div>
                          <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: 'rgba(218, 54, 51, 0.1)', borderRadius: '0.25rem', borderLeft: '3px solid #da3633' }}>
                            <strong style={{ fontSize: '0.875rem', color: '#ff7b72' }}>Action Required:</strong> <span style={{ fontSize: '0.875rem' }}>{item.action}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 3: Defect Inventory */}
                <div style={{ marginBottom: '3rem' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#58a6ff' }}>3. Defect Inventory</h2>
                  <div style={{ overflowX: 'auto', backgroundColor: '#161b22', borderRadius: '0.5rem', border: '1px solid #30363d' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #30363d', backgroundColor: '#0d1117' }}>
                          <th style={{ padding: '0.75rem 1rem' }}>Zone</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Severity</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Conf.</th>
                          <th style={{ padding: '0.75rem 1rem' }}>GPS</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.inventory.map((row: any) => (
                          <tr key={row.id} style={{ borderBottom: '1px solid #30363d' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{row.zone}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>{row.type}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span style={{ color: row.severity === 'CRITICAL' ? '#ff7b72' : row.severity === 'HIGH' ? '#d29922' : '#3fb950' }}>{row.severity}</span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>{row.conf}%</td>
                            <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#8b949e' }}>{row.gps}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>{row.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 4: Charts */}
                <div style={{ marginBottom: '3rem' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#58a6ff' }}>4. Analytics & Trends</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div style={{ backgroundColor: '#161b22', padding: '1rem', border: '1px solid #30363d', borderRadius: '0.5rem', height: '250px' }}>
                      <Bar data={{ labels: ['Crack', 'Spalling', 'Corrosion', 'Delam.'], datasets: [{ label: 'Defects', data: [5, 3, 4, 2], backgroundColor: '#1f6feb' }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#30363d' }, ticks: { color: '#8b949e' } }, x: { grid: { color: '#30363d' }, ticks: { color: '#8b949e' } } } }} />
                    </div>
                    <div style={{ backgroundColor: '#161b22', padding: '1rem', border: '1px solid #30363d', borderRadius: '0.5rem', height: '250px' }}>
                      <Line data={{ labels: ['May 1', 'May 5', 'May 10', 'May 14'], datasets: [{ label: 'Defect Trend', data: [10, 11, 13, 14], borderColor: '#da3633', backgroundColor: 'rgba(218,54,51,0.2)', fill: true }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#30363d' }, ticks: { color: '#8b949e' } }, x: { grid: { color: '#30363d' }, ticks: { color: '#8b949e' } } } }} />
                    </div>
                  </div>
                </div>

                {/* Section 6: Flight Appendix */}
                <div style={{ marginBottom: '3rem' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#58a6ff' }}>6. Flight Data Appendix</h2>
                  <div style={{ overflowX: 'auto', backgroundColor: '#161b22', borderRadius: '0.5rem', border: '1px solid #30363d' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #30363d', backgroundColor: '#0d1117' }}>
                          <th style={{ padding: '0.75rem 1rem' }}>Flight ID</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Frames</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Altitude</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.flights.map((f: any) => (
                          <tr key={f.id} style={{ borderBottom: '1px solid #30363d' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{f.id}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>{f.date}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>{f.frames}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>{f.alt}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>{f.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

             </div>
          )}

        </div>

      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </PageShell>
  );
}
