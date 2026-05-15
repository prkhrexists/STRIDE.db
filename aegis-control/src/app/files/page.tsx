'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { ToastProvider, useToast } from '@/components/Toast';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download, Trash2, Search, Filter, Layers, CheckSquare, Square, FolderArchive, FileImage, Radio, GitMerge, FileCheck } from 'lucide-react';

const mockFlights = [
  { id: 'FL-004', name: 'Bridge Post-Storm', date: '2026-05-15', structure: 'Bridge North Tower', defects: 14, healthScore: 78, status: 'Report Ready', trend: '+2', severity: 'High' },
  { id: 'FL-003', name: 'Bridge Routine', date: '2026-05-10', structure: 'Bridge North Tower', defects: 12, healthScore: 82, status: 'Archived', trend: '0', severity: 'Moderate' },
  { id: 'FL-002', name: 'Pylon Baseline', date: '2026-05-02', structure: 'High Voltage Pylon A12', defects: 4, healthScore: 94, status: 'Archived', trend: '-1', severity: 'Low' },
  { id: 'FL-001', name: 'HQ Facade Scan', date: '2026-04-28', structure: 'HQ Building Facade', defects: 8, healthScore: 88, status: 'Archived', trend: '+1', severity: 'Moderate' },
];

const defectBarData = [
  { type:'Crack', count:5 },
  { type:'Spalling', count:3 },
  { type:'Corrosion', count:4 },
  { type:'Delamination', count:2 },
];

function ArchiveContent() {
  const { success, error, info } = useToast();
  const [flights, setFlights] = useState(mockFlights);
  const [selectedFlights, setSelectedFlights] = useState<string[]>(['FL-004']);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStructure, setFilterStructure] = useState('All');
  
  const handleSelect = (id: string) => {
    setSelectedFlights(prev => {
      if (prev.includes(id)) return prev.filter(f => f !== id);
      if (prev.length >= 2) return [prev[1], id]; // Keep max 2 for comparison
      return [...prev, id];
    });
  };

  const handleDownload = (type: string) => {
    success(`Downloading ${type} archive...`);
  };

  const activeFlight = flights.find(f => f.id === selectedFlights[0]);
  const compareFlight = flights.find(f => f.id === selectedFlights[1]);
  const isComparing = selectedFlights.length === 2;

  const filteredFlights = flights.filter(f => 
    (f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.id.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (filterStructure === 'All' || f.structure === filterStructure)
  );

  return (
    <PageShell title="Flight Archive" subtitle="Inspection storage, reports, and timeline comparison">
      <div style={{ display:'flex', gap:16, height:'calc(100vh - 130px)' }}>

        {/* LEFT SIDEBAR: Flight Archive & Filters */}
        <div style={{ width: 320, display:'flex', flexDirection:'column', gap:12, flexShrink:0 }}>
          
          <div className="stride-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="card-header" style={{ paddingBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 10 }}>
                <span className="card-header-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FolderArchive size={14}/> Flight Archive</span>
                
                {/* Search & Filter */}
                <div style={{ position: 'relative' }}>
                  <Search size={12} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 9 }} />
                  <input type="text" placeholder="Search flights..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} style={{ width: '100%', padding: '6px 10px 6px 28px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Filter size={12} color="var(--text-muted)" style={{ marginTop: 6 }} />
                  <select value={filterStructure} onChange={e=>setFilterStructure(e.target.value)} style={{ width: '100%', padding: '5px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: 11, outline: 'none' }}>
                    <option value="All">All Structures</option>
                    <option value="Bridge North Tower">Bridge North Tower</option>
                    <option value="High Voltage Pylon A12">High Voltage Pylon A12</option>
                    <option value="HQ Building Facade">HQ Building Facade</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Flight List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredFlights.map(f => {
                const isSelected = selectedFlights.includes(f.id);
                const healthColor = f.healthScore >= 90 ? 'var(--accent-green)' : f.healthScore >= 80 ? 'var(--accent-amber)' : 'var(--accent-red)';
                return (
                  <div key={f.id} onClick={() => handleSelect(f.id)} style={{ padding: '12px', background: isSelected ? 'var(--bg-elevated)' : 'transparent', border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isSelected ? 'var(--shadow-glow-blue)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isSelected ? <CheckSquare size={14} color="var(--accent-blue)"/> : <Square size={14} color="var(--text-muted)"/>}
                        <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--accent-blue-bright)' : 'var(--text-primary)' }}>{f.name}</span>
                      </div>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{f.date}</span>
                    </div>
                    <div style={{ paddingLeft: 22 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>{f.structure}</div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Defects: <strong style={{ color: 'var(--text-primary)' }}>{f.defects}</strong></div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Score: <strong style={{ color: healthColor }}>{f.healthScore}%</strong></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div style={{ padding: 12, borderTop: '1px solid var(--border-primary)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Select up to 2 flights to compare
            </div>
          </div>
        </div>

        {/* MAIN AREA */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          
          {selectedFlights.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <FolderArchive size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>No Flight Selected</div>
              <div style={{ fontSize: 13 }}>Select a flight from the archive to view its report or compare.</div>
            </div>
          ) : isComparing && activeFlight && compareFlight ? (
            
            /* COMPARISON VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 8 }}>
              <div className="stride-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <GitMerge size={20} color="var(--accent-blue)" />
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Flight Comparison Report</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 20, alignItems: 'stretch' }}>
                  
                  {/* Flight A */}
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Baseline Flight</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 12 }}>{compareFlight.name}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Date</span><span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{compareFlight.date}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Defect Count</span><span style={{ fontSize: 12, fontWeight: 700 }}>{compareFlight.defects}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Health Score</span><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-green)' }}>{compareFlight.healthScore}%</span></div>
                    </div>
                  </div>

                  {/* Divider / Arrow */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 10px' }}>
                    <div style={{ width: 1, height: '40%', background: 'var(--border-primary)' }} />
                    <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--text-muted)' }}>VS</div>
                    <div style={{ width: 1, height: '40%', background: 'var(--border-primary)' }} />
                  </div>

                  {/* Flight B */}
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--accent-amber)', borderRadius: 'var(--radius-md)', padding: 16, boxShadow: 'inset 0 0 20px rgba(245, 158, 11, 0.05)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Recent Flight</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-amber)', marginBottom: 12 }}>{activeFlight.name}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Date</span><span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{activeFlight.date}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Defect Count</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-red)' }}>{activeFlight.defects} <span style={{ fontSize: 10 }}>({activeFlight.defects - compareFlight.defects > 0 ? '+' : ''}{activeFlight.defects - compareFlight.defects})</span></span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Health Score</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-amber)' }}>{activeFlight.healthScore}% <span style={{ fontSize: 10 }}>({activeFlight.healthScore - compareFlight.healthScore}%)</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>AI Deterioration Analysis</div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Comparing SSIM data between {compareFlight.date} and {activeFlight.date} reveals a <strong>{(compareFlight.healthScore - activeFlight.healthScore)}% degradation</strong> in structural health. 
                    Specifically, {activeFlight.defects - compareFlight.defects} new defects were logged. Crack propagation on the North Tower has widened by an estimated 2.4mm, transitioning from Moderate to High severity. Immediate structural review is recommended.
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 16 }}>
                 <div className="stride-card" style={{ flex: 1, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Defect Type Variance</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={defectBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                        <XAxis dataKey="type" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} />
                        <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} />
                        <Tooltip contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border-active)', borderRadius:8, fontSize:11 }} />
                        <Bar dataKey="count" fill="var(--accent-amber)" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>

            </div>

          ) : activeFlight ? (

            /* SINGLE FLIGHT VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 8 }}>
              
              {/* Header / Download Bar */}
              <div className="stride-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <FileCheck size={20} color="var(--accent-green)" />
                    <span style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>{activeFlight.name}</span>
                    <span className="badge badge-green" style={{ marginLeft: 8 }}>{activeFlight.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                    <span>{activeFlight.structure}</span>
                    <span>Date: {activeFlight.date}</span>
                    <span>ID: {activeFlight.id}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" onClick={() => handleDownload('images')}><FileImage size={13} /> Images</button>
                  <button className="btn btn-ghost" onClick={() => handleDownload('telemetry')}><Radio size={13} /> Telemetry</button>
                  <button className="btn btn-primary" onClick={() => handleDownload('report')}><FileText size={13} /> Download PDF Report</button>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {[
                  { label: 'Total Defects', value: activeFlight.defects, color: 'var(--accent-amber)' },
                  { label: 'Health Score', value: `${activeFlight.healthScore}%`, color: 'var(--accent-green)' },
                  { label: 'Primary Severity', value: activeFlight.severity, color: 'var(--text-primary)' },
                  { label: 'Images Captured', value: '240', color: 'var(--text-primary)' },
                ].map(stat => (
                  <div key={stat.label} className="stride-card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{stat.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Report Preview */}
              <div className="stride-card" style={{ padding: 20, minHeight: 400 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 16, borderBottom: '1px solid var(--border-primary)', paddingBottom: 8 }}>Inspection Preview</div>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div style={{ flex: 2 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Executive Summary</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                      The UAV inspection of {activeFlight.structure} completed successfully on {activeFlight.date}. 
                      The automated defect recognition system identified {activeFlight.defects} anomalies. 
                      Overall structural health is calculated at {activeFlight.healthScore}%. 
                      Please review the attached high-resolution thermal and RGB imagery for detailed context on the highlighted critical zones.
                    </p>
                    
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Defect Distribution</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={defectBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                        <XAxis dataKey="type" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} />
                        <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} />
                        <Tooltip contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border-active)', borderRadius:8, fontSize:11 }} />
                        <Bar dataKey="count" fill="var(--accent-blue)" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Key Captures</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[1, 2, 3].map(i => (
                        <div key={i} style={{ height: 100, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', overflow: 'hidden', position: 'relative' }}>
                          <img src={`https://images.unsplash.com/photo-${1590000000000 + i * 100000}?auto=format&fit=crop&q=80&w=300`} alt="capture" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} onError={e=>{e.currentTarget.src='https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=300'}} />
                          <div style={{ position: 'absolute', bottom: 4, left: 6, fontSize: 9, color: 'white', background: 'rgba(0,0,0,0.6)', padding: '2px 4px', borderRadius: 2 }}>Frame {24 + i}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : null}

        </div>
      </div>
    </PageShell>
  );
}

export default function FilesPage() {
  return <ToastProvider><ArchiveContent /></ToastProvider>;
}
