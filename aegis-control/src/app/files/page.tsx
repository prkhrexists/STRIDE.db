'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/PageShell';
import { ToastProvider, useToast } from '@/components/Toast';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  FileText, Search, Filter, CheckSquare, Square, FolderArchive, 
  FileImage, Radio, GitMerge, FileCheck, Loader2, ArrowRight, 
  ExternalLink, TrendingDown, TrendingUp, AlertTriangle 
} from 'lucide-react';

// ─── Component: PortSelector and other UI elements omitted for brevity, focusing on the Archive logic ───

function ArchiveContent() {
  const { success, error, info } = useToast();
  
  // Data State
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeFlightData, setActiveFlightData] = useState<any>(null);
  const [telemetryData, setTelemetryData] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStructure, setFilterStructure] = useState('All');
  const [activeTab, setActiveTab] = useState<'report' | 'images' | 'telemetry'>('report');
  const [compareMode, setCompareMode] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  
  // Generation State
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);

  // Load flights on mount
  useEffect(() => {
    fetchFlights();
  }, []);

  const fetchFlights = async () => {
    try {
      const res = await fetch('/api/archive/flights');
      const data = await res.json();
      setFlights(data.flights || []);
      if (data.flights?.length > 0 && !selectedIds.length) {
        setSelectedIds([data.flights[0].id]);
      }
    } catch (err) {
      error("Failed to load flight archive");
    } finally {
      setLoading(false);
    }
  };

  // Load active flight details
  useEffect(() => {
    if (selectedIds.length === 1 && !showComparison) {
      fetchFlightDetail(selectedIds[0]);
    }
  }, [selectedIds, showComparison]);

  const fetchFlightDetail = async (id: string) => {
    setDetailLoading(true);
    setTelemetryData([]);
    try {
      const res = await fetch(`/api/archive/flight/${id}`);
      const data = await res.json();
      setActiveFlightData(data);
      
      if (data.telemetryAvailable) {
        const telRes = await fetch(`/api/archive/telemetry/${id}`);
        const telData = await telRes.json();
        setTelemetryData(telData.data || []);
      }
    } catch (err) {
      error("Failed to load flight details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    if (compareMode) {
      setSelectedIds(prev => {
        if (prev.includes(id)) return prev.filter(i => i !== id);
        if (prev.length >= 2) return [prev[1], id];
        return [...prev, id];
      });
    } else {
      setSelectedIds([id]);
      setShowComparison(false);
    }
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    if (!compareMode && selectedIds.length > 2) {
      setSelectedIds([selectedIds[0]]);
    }
    setShowComparison(false);
  };

  const generatePdf = async (flightId: string) => {
    setGenerating(true); setGenProgress(10);
    try {
      const r = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flightId }),
      });
      const { jobId, error: err } = await r.json();
      if (err || !jobId) throw new Error(err ?? 'No jobId returned');

      for (let i = 0; i < 60; i++) {
        await new Promise(res => setTimeout(res, 1500));
        const s = await fetch(`/api/reports/${jobId}/status`).then(x => x.json());
        setGenProgress(s.progress ?? genProgress);
        if (s.status === 'done') {
          success('PDF ready — downloading…');
          window.open(s.downloadUrl, '_blank');
          setGenerating(false);
          return;
        }
        if (s.status === 'error') throw new Error(s.error ?? 'Generation failed');
      }
      throw new Error('Timed out');
    } catch (e: any) {
      error(`PDF failed: ${e.message}`);
      setGenerating(false);
    }
  };

  // Filtered List
  const filteredFlights = useMemo(() => {
    return flights.filter(f => 
      (f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.id.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (filterStructure === 'All' || f.structureType === filterStructure)
    );
  }, [flights, searchQuery, filterStructure]);

  const activeFlight = flights.find(f => f.id === selectedIds[0]);
  const compareFlight = flights.find(f => f.id === selectedIds[1]);

  const defectBarData = useMemo(() => {
    if (!activeFlightData?.defectTypeCounts) return [];
    return Object.entries(activeFlightData.defectTypeCounts).map(([type, count]) => ({ type, count }));
  }, [activeFlightData]);

  return (
    <PageShell title="Flight Archive" subtitle="Real-time mission data, AI analysis reports, and deterioration tracking">
      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 130px)' }}>
        
        {/* LEFT SIDEBAR: Flight List */}
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
          <div className="stride-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="card-header" style={{ paddingBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span className="card-header-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FolderArchive size={14}/> Flight Archive</span>
                   <button 
                    onClick={toggleCompareMode}
                    style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: compareMode ? 'var(--accent-blue)' : 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'white', cursor: 'pointer' }}
                   >
                     {compareMode ? 'Cancel Compare' : 'Compare Mode'}
                   </button>
                </div>
                
                <div style={{ position: 'relative' }}>
                  <Search size={12} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 9 }} />
                  <input type="text" placeholder="Search ID or Name..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} style={{ width: '100%', padding: '6px 10px 6px 28px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }} />
                </div>
                
                <div style={{ display: 'flex', gap: 6 }}>
                  <Filter size={12} color="var(--text-muted)" style={{ marginTop: 6 }} />
                  <select value={filterStructure} onChange={e=>setFilterStructure(e.target.value)} style={{ width: '100%', padding: '5px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: 11, outline: 'none' }}>
                    <option value="All">All Structures</option>
                    <option value="Bridge">Bridges</option>
                    <option value="Tower">Towers</option>
                    <option value="Dam">Dams</option>
                    <option value="Building">Buildings</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 className="animate-spin" style={{ margin: '0 auto 8px' }}/> Loading...</div>
              ) : filteredFlights.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No flights found</div>
              ) : filteredFlights.map(f => {
                const isSelected = selectedIds.includes(f.id);
                const healthColor = f.healthScore >= 90 ? 'var(--accent-green)' : f.healthScore >= 80 ? 'var(--accent-amber)' : 'var(--accent-red)';
                return (
                  <div key={f.id} onClick={() => handleSelect(f.id)} style={{ padding: '12px', background: isSelected ? 'var(--bg-elevated)' : 'transparent', border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {compareMode ? (
                          isSelected ? <CheckSquare size={14} color="var(--accent-blue)"/> : <Square size={14} color="var(--text-muted)"/>
                        ) : null}
                        <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? 'var(--accent-blue-bright)' : 'var(--text-primary)' }}>{f.name}</span>
                      </div>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{f.date}</span>
                    </div>
                    <div style={{ paddingLeft: compareMode ? 22 : 0 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6 }}>{f.structure}</div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>D: <span style={{ color: 'var(--text-primary)' }}>{f.defectCount}</span></div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>H: <span style={{ color: healthColor }}>{f.healthScore}%</span></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {compareMode && (
              <div style={{ padding: 12, borderTop: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>{selectedIds.length}/2 flights selected</div>
                <button 
                  className="btn btn-primary" 
                  disabled={selectedIds.length !== 2}
                  style={{ width: '100%', fontSize: 11 }}
                  onClick={() => setShowComparison(true)}
                >
                  Compare Selected
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MAIN AREA */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!showComparison && activeFlightData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 8 }}>
              {/* Header */}
              <div className="stride-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <FileCheck size={20} color="var(--accent-green)" />
                    <span style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>{activeFlightData.name}</span>
                    <span className={`badge ${activeFlightData.healthScore >= 85 ? 'badge-green' : 'badge-amber'}`} style={{ marginLeft: 8 }}>{activeFlightData.primarySeverity} Risk</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                    <span>{activeFlightData.structure}</span>
                    <span>{activeFlightData.date}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{activeFlightData.flightId}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button 
                    className={`btn ${generating ? 'btn-secondary' : 'btn-primary'}`} 
                    onClick={() => generatePdf(activeFlightData.flightId)}
                    disabled={generating}
                    style={{ minWidth: 160 }}
                  >
                    {generating ? (
                      <><Loader2 size={13} className="animate-spin" /> Generating {genProgress}%…</>
                    ) : (
                      <><FileText size={13} /> Download PDF Report</>
                    )}
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)' }}>
                {(['report', 'images', 'telemetry'] as const).map(tab => (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)}
                    style={{ 
                      padding: '10px 20px', fontSize: 12, background: 'transparent', border: 'none', 
                      borderBottom: activeTab === tab ? '2px solid var(--accent-blue)' : 'none',
                      color: activeTab === tab ? 'white' : 'var(--text-muted)', cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'report' && (
                <>
                  {/* Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {[
                      { label: 'Total Defects', value: activeFlightData.defectCount, color: 'var(--accent-amber)' },
                      { label: 'Health Score', value: `${activeFlightData.healthScore}%`, color: 'var(--accent-green)' },
                      { label: 'Risk Level', value: activeFlightData.primarySeverity, color: 'var(--text-primary)' },
                      { label: 'Images Analyzed', value: activeFlightData.frameCount, color: 'var(--text-primary)' },
                    ].map(stat => (
                      <div key={stat.label} className="stride-card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{stat.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 16 }}>
                    <div className="stride-card" style={{ flex: 2, padding: 20 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 16 }}>Defect Distribution</div>
                      <div style={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={defectBarData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                            <XAxis dataKey="type" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-active)', borderRadius: 8, fontSize: 11, color: 'white' }} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                               {defectBarData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--accent-blue)' : 'var(--accent-amber)'} />
                               ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="stride-card" style={{ flex: 1, padding: 20 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-amber)', marginBottom: 16 }}>Key Captures</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {activeFlightData.topCaptures?.length > 0 ? activeFlightData.topCaptures.map((cap: any, i: number) => (
                          <div key={i} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-primary)', position: 'relative', cursor: 'pointer' }}>
                             <img src={cap.url} alt="Defect" style={{ width: '100%', height: 80, objectFit: 'cover' }} onError={(e) => e.currentTarget.src = 'https://images.unsplash.com/photo-1590000000000?auto=format&fit=crop&q=80&w=300'} />
                             <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 8px', background: 'rgba(0,0,0,0.7)', fontSize: 9, display: 'flex', justifyContent: 'space-between' }}>
                               <span>{cap.type}</span>
                               <span style={{ color: 'var(--accent-green)' }}>{Math.round(cap.confidence * 100)}%</span>
                             </div>
                          </div>
                        )) : (
                          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, padding: 20 }}>No snapshots available</div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'images' && (
                <div className="stride-card" style={{ padding: 20 }}>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                      {activeFlightData.defects?.map((d: any, i: number) => (
                        <div key={i} style={{ background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                           <img src={`/snapshots/${activeFlightData.flightId}/${d.frameId}.jpg`} style={{ width: '100%', height: 120, objectFit: 'cover' }} onError={(e) => e.currentTarget.src = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=300'} />
                           <div style={{ padding: 8 }}>
                             <div style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{d.type}</div>
                             <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{d.zone} · {Math.round(d.confidence * 100)}%</div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {activeTab === 'telemetry' && (
                <div className="stride-card" style={{ padding: 20 }}>
                   {telemetryData.length > 0 ? (
                     <div style={{ height: 400 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 20 }}>Flight Telemetry Analysis</div>
                        <ResponsiveContainer width="100%" height="90%">
                          <LineChart data={telemetryData}>
                             <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                             <XAxis dataKey="timestamp" hide />
                             <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                             <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-active)', borderRadius: 8, color: 'white' }} />
                             <Line type="monotone" dataKey="alt" stroke="var(--accent-blue)" strokeWidth={2} dot={false} name="Altitude (m)" />
                             <Line type="monotone" dataKey="speed" stroke="var(--accent-amber)" strokeWidth={2} dot={false} name="Speed (m/s)" />
                          </LineChart>
                        </ResponsiveContainer>
                     </div>
                   ) : (
                     <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Radio size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
                        <div>{activeFlightData.telemetryAvailable ? 'Loading telemetry data...' : 'No telemetry log file found for this flight.'}</div>
                     </div>
                   )}
                </div>
              )}
            </div>
          ) : showComparison && activeFlight && compareFlight ? (
            /* COMPARISON VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 8 }}>
               <div className="stride-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <GitMerge size={20} color="var(--accent-blue)" />
                      <span style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Structural Comparison Report</span>
                    </div>
                    <button onClick={() => setShowComparison(false)} className="btn btn-ghost" style={{ fontSize: 11 }}>Exit Comparison</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 20 }}>
                    {/* Flight A */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 16 }}>
                       <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Baseline</div>
                       <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 12 }}>{compareFlight.name}</div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Health Score</span><span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{compareFlight.healthScore}%</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Total Defects</span><span style={{ fontWeight: 700 }}>{compareFlight.defectCount}</span></div>
                       </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowRight size={24} color="var(--border-primary)" /></div>

                    {/* Flight B */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent-amber)', borderRadius: 12, padding: 16 }}>
                       <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Current</div>
                       <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-amber)', marginBottom: 12 }}>{activeFlight.name}</div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Health Score</span>
                            <span style={{ fontWeight: 700, color: activeFlight.healthScore < compareFlight.healthScore ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                              {activeFlight.healthScore}% 
                              <span style={{ fontSize: 10, marginLeft: 4 }}>
                                ({activeFlight.healthScore - compareFlight.healthScore > 0 ? '+' : ''}{activeFlight.healthScore - compareFlight.healthScore}%)
                              </span>
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Total Defects</span>
                            <span style={{ fontWeight: 700 }}>{activeFlight.defectCount}</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-elevated)', borderRadius: 8, borderLeft: '4px solid var(--accent-amber)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                       <AlertTriangle size={14} color="var(--accent-amber)" />
                       <span style={{ fontSize: 13, fontWeight: 600 }}>Deterioration Analysis</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                       The structural health score has dropped by <strong>{Math.abs(activeFlight.healthScore - compareFlight.healthScore)}%</strong> over the period. 
                       AI analysis shows <strong>{activeFlight.defectCount - compareFlight.defectCount} new anomalies</strong> identified. 
                       Crack propagation in common zones suggests active structural movement. Immediate onsite verification is recommended.
                    </p>
                  </div>
               </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <FolderArchive size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>No Flight Selected</div>
              <div style={{ fontSize: 13 }}>Select a flight from the archive to view data.</div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

export default function FilesPage() {
  return <ToastProvider><ArchiveContent /></ToastProvider>;
}
