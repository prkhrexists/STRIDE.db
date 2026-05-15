'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import PageShell from '@/components/PageShell';
import { ToastProvider, useToast } from '@/components/Toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Flag, Filter, Upload, Play, Download, AlertTriangle, CheckCircle2, XCircle, BarChart2, Maximize, Map as MapIcon, Image as ImageIcon, Crosshair, ChevronRight, ChevronLeft } from 'lucide-react';

// --- Types ---
interface BBox { x: number; y: number; w: number; h: number; type: string; }
interface Frame { id: string; flightId: string; url: string; prevUrl: string; status: 'CRITICAL'|'DEFECT'|'CLEAN'; type: string; conf: number; lat: number; lon: number; ts: number; bboxes: BBox[]; metadata: { zone: string; }; flagged: boolean; ssim: number; }
interface Flight { id: string; name: string; date: string; framesCount: number; status: string; }

// --- Helpers ---
const statusColor = (s: string) => s==='CRITICAL'?'var(--accent-red)':s==='DEFECT'?'var(--accent-amber)':'var(--accent-green)';
const statusBg = (s: string) => s==='CRITICAL'?'var(--accent-red-glow)':s==='DEFECT'?'var(--accent-amber-glow)':'var(--accent-green-glow)';

// --- Subcomponents ---
function InteractivePathMap({ frames, selectedId, onSelect }: { frames: Frame[], selectedId: string | null, onSelect: (id: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || frames.length === 0) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Calculate bounds
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    frames.forEach(f => {
      if(f.lat < minLat) minLat = f.lat; if(f.lat > maxLat) maxLat = f.lat;
      if(f.lon < minLon) minLon = f.lon; if(f.lon > maxLon) maxLon = f.lon;
    });

    // Add padding
    const latRange = Math.max(maxLat - minLat, 0.0001);
    const lonRange = Math.max(maxLon - minLon, 0.0001);
    minLat -= latRange * 0.1; maxLat += latRange * 0.1;
    minLon -= lonRange * 0.1; maxLon += lonRange * 0.1;

    const getPt = (lat: number, lon: number) => ({
      x: ((lon - minLon) / (maxLon - minLon)) * w,
      y: h - ((lat - minLat) / (maxLat - minLat)) * h
    });

    // Draw Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for(let i=0; i<w; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,h); ctx.stroke(); }
    for(let i=0; i<h; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(w,i); ctx.stroke(); }

    // Draw Path
    ctx.beginPath();
    frames.forEach((f, i) => {
      const p = getPt(f.lat, f.lon);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Points
    frames.forEach(f => {
      const p = getPt(f.lat, f.lon);
      const isSelected = f.id === selectedId;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, isSelected ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#FFFFFF' : statusColor(f.status);
      ctx.fill();
      
      if (isSelected || f.status !== 'CLEAN') {
        ctx.strokeStyle = isSelected ? '#3B82F6' : '#111827';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  }, [frames, selectedId]);

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    frames.forEach(f => {
      if(f.lat < minLat) minLat = f.lat; if(f.lat > maxLat) maxLat = f.lat;
      if(f.lon < minLon) minLon = f.lon; if(f.lon > maxLon) maxLon = f.lon;
    });
    const latRange = Math.max(maxLat - minLat, 0.0001);
    const lonRange = Math.max(maxLon - minLon, 0.0001);
    minLat -= latRange * 0.1; maxLat += latRange * 0.1;
    minLon -= lonRange * 0.1; maxLon += lonRange * 0.1;

    let closestId = null;
    let minDist = 20; // 20px hit radius

    frames.forEach(f => {
      const px = ((f.lon - minLon) / (maxLon - minLon)) * canvas.width;
      const py = canvas.height - ((f.lat - minLat) / (maxLat - minLat)) * canvas.height;
      const dist = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
      if (dist < minDist) { minDist = dist; closestId = f.id; }
    });

    if (closestId) onSelect(closestId);
  };

  return (
    <div ref={containerRef} style={{ width:'100%', height:'100%', background:'#000', position:'relative', borderRadius:'var(--radius-lg)', overflow:'hidden', border:'1px solid var(--border-primary)' }}>
      <div style={{ position:'absolute', top:10, left:10, zIndex:10, display:'flex', gap:6 }}>
        <div className="glass badge"><MapIcon size={12}/> Inspection Path</div>
      </div>
      <canvas ref={canvasRef} width={800} height={400} onClick={handleClick} style={{ width:'100%', height:'100%', cursor:'crosshair' }} />
    </div>
  );
}

// --- Main Page ---
function AnalysisContent() {
  const { success, info, warning, error } = useToast();
  
  const [flights, setFlights] = useState<Flight[]>([]);
  const [allFrames, setAllFrames] = useState<Frame[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState<string>('');
  
  const [filter, setFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid'|'map'>('grid');
  const [isCompare, setIsCompare] = useState(false);
  const [compareId, setCompareId] = useState('');
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analysis/flights')
      .then(res => res.json())
      .then(data => {
        setFlights(data.flights);
        setAllFrames(data.frames);
        if (data.flights.length > 0) {
          setSelectedFlightId(data.flights[0].id);
          if (data.flights.length > 1) setCompareId(data.flights[1].id);
        }
        setIsLoading(false);
      })
      .catch(() => {
        error("Failed to load flight data.");
        setIsLoading(false);
      });
  }, []);

  const flightFrames = useMemo(() => allFrames.filter(f => f.flightId === selectedFlightId).sort((a,b)=>a.ts-b.ts), [allFrames, selectedFlightId]);
  
  const filtered = useMemo(() => {
    return flightFrames.filter(f => {
      if(filter==='All') return true;
      if(filter==='Critical') return f.status==='CRITICAL';
      if(filter==='Flagged') return f.flagged;
      if(filter==='Clean') return f.status==='CLEAN';
      return f.type.toLowerCase() === filter.toLowerCase(); // Check exact defect type
    });
  }, [flightFrames, filter]);

  const sf = flights.find(f=>f.id===selectedFlightId);
  const total = flightFrames.length;
  const crit = flightFrames.filter(f=>f.status==='CRITICAL').length;
  const def = flightFrames.filter(f=>f.status==='DEFECT').length;
  const clean = flightFrames.filter(f=>f.status==='CLEAN').length;

  const handleFlag = (id: string) => {
    setAllFrames(allFrames.map(f=>f.id===id?{...f,flagged:true}:f));
    warning('Frame flagged for urgent review');
  };

  if (isLoading) return <PageShell title="Analysis Center" noPadding><div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',color:'var(--text-muted)'}}>Loading Inspection Data...</div></PageShell>;

  return (
    <PageShell title="Analysis Center" subtitle="Post-flight image analysis & defect detection"
      actions={
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm"><Upload size={11}/> Import Logs</button>
          <button className="btn btn-primary btn-sm" onClick={()=>success(`Analysis complete — ${crit+def} defects found`)}><Play size={11}/> Run AI Analysis</button>
        </div>
      }>
      
      <div style={{ display:'flex', gap:16, height:'calc(100vh - 130px)' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ width:280, display:'flex', flexDirection:'column', gap:12, flexShrink:0, overflowY:'auto', paddingRight:4 }}>
          
          {/* Flights List */}
          <div className="stride-card" style={{ overflow:'hidden' }}>
            <div className="card-header">
              <span className="card-header-title">Flights</span>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{flights.length} logs</span>
            </div>
            <div style={{ overflowY:'auto', maxHeight:240 }}>
              {flights.map(f=>(
                <div key={f.id} onClick={()=>{ setSelectedFlightId(f.id); setActiveFrameId(null); }} style={{ padding:'12px 14px', cursor:'pointer', borderBottom:'1px solid var(--border-primary)', background: selectedFlightId===f.id?'var(--accent-blue-glow)':'transparent', borderLeft: selectedFlightId===f.id?'3px solid var(--accent-blue)':'3px solid transparent', transition:'all 0.15s' }}>
                  <div style={{ fontSize:13, fontWeight:600, color: selectedFlightId===f.id?'var(--accent-blue-bright)':'var(--text-primary)' }}>{f.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{new Date(f.date).toLocaleDateString()} · {f.framesCount} frames</div>
                  <div style={{ fontSize:10, fontWeight:600, color:'var(--accent-green)', marginTop:4, textTransform:'uppercase' }}>{f.status}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="stride-card" style={{ padding:14 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              <Filter size={10}/> Filters
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['All','Critical','Flagged','Clean','Crack','Corrosion','Spalling'].map(opt=>(
                <button key={opt} onClick={()=>setFilter(opt)} className={`btn btn-sm ${filter===opt?'btn-primary':'btn-secondary'}`} style={{ padding:'4px 10px', fontSize:11 }}>{opt}</button>
              ))}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="stride-card" style={{ padding:14 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)', marginBottom:12 }}>Summary</div>
            {[
              { label:'Total Frames', value:total, color:'var(--text-primary)', Icon:BarChart2 },
              { label:'Critical', value:crit, color:'var(--accent-red)', Icon:XCircle },
              { label:'Moderate', value:def, color:'var(--accent-amber)', Icon:AlertTriangle },
              { label:'Clean', value:clean, color:'var(--accent-green)', Icon:CheckCircle2 },
            ].map(({label,value,color,Icon})=>(
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border-primary)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Icon size={13} color={color}/>
                  <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{label}</span>
                </div>
                <span style={{ fontSize:14, fontWeight:700, color, fontFamily:'var(--font-mono)' }}>{value}</span>
              </div>
            ))}
          </div>

        </div>

        {/* MAIN AREA */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14, minWidth:0, overflow:'hidden' }}>
          
          {/* Top Controls */}
          <div className="stride-card" style={{ padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)' }}>{sf?.name ?? 'No Flight Selected'}</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>
                {filtered.length} frames matched filter: <span style={{color:'var(--text-primary)', fontWeight:600}}>{filter}</span>
              </div>
            </div>
            
            <div style={{ display:'flex', gap:16, alignItems:'center' }}>
              {/* View Toggle */}
              <div style={{ display:'flex', background:'var(--bg-secondary)', padding:4, borderRadius:'var(--radius-md)', border:'1px solid var(--border-primary)' }}>
                <button onClick={()=>setViewMode('grid')} className={`btn btn-sm ${viewMode==='grid'?'btn-primary':'btn-ghost'}`} style={{ padding:'4px 10px', height:28 }}><ImageIcon size={14}/></button>
                <button onClick={()=>setViewMode('map')} className={`btn btn-sm ${viewMode==='map'?'btn-primary':'btn-ghost'}`} style={{ padding:'4px 10px', height:28 }}><MapIcon size={14}/></button>
              </div>
              
              {/* Compare Toggle */}
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'var(--text-secondary)' }}>
                <input type="checkbox" checked={isCompare} onChange={e=>setIsCompare(e.target.checked)} />
                Compare Mode
              </label>
              {isCompare && (
                <select value={compareId} onChange={e=>setCompareId(e.target.value)} className="stride-select" style={{ width:'auto', padding:'4px 8px', height:32 }}>
                  {flights.filter(f=>f.id!==selectedFlightId).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              )}
              <button className="btn btn-secondary btn-sm" title="Fullscreen"><Maximize size={14}/></button>
            </div>
          </div>

          {/* Dynamic Main Content: Grid OR Map */}
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
            {viewMode === 'map' ? (
              <div style={{ flex:1, position:'relative' }}>
                <InteractivePathMap frames={flightFrames} selectedId={activeFrameId} onSelect={setActiveFrameId} />
                {activeFrameId && (
                  <div className="stride-card" style={{ position:'absolute', top:20, right:20, width:300, zIndex:20 }}>
                    <div className="card-header" style={{ justifyContent:'space-between' }}>
                      <span className="card-header-title">Frame Inspector</span>
                      <button className="btn btn-ghost btn-sm" style={{ padding:4 }} onClick={()=>setActiveFrameId(null)}><XCircle size={14}/></button>
                    </div>
                    {(() => {
                      const f = flightFrames.find(x=>x.id===activeFrameId);
                      if(!f) return null;
                      return (
                        <div style={{ padding:14 }}>
                          <img src={f.url} style={{ width:'100%', height:160, objectFit:'cover', borderRadius:'var(--radius-sm)', marginBottom:10 }} />
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                            <div className="badge" style={{ background:statusBg(f.status), color:statusColor(f.status), border:`1px solid ${statusColor(f.status)}40` }}>{f.status}</div>
                            {f.type !== 'none' && <div style={{ fontSize:11, fontWeight:700, color:statusColor(f.status), textTransform:'uppercase' }}>{f.type}</div>}
                          </div>
                          <div style={{ fontSize:11, color:'var(--text-muted)' }}>GPS: {f.lat.toFixed(6)}, {f.lon.toFixed(6)}</div>
                          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10 }}>Zone: {f.metadata.zone}</div>
                          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={()=>handleFlag(f.id)}>Flag for Review</button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex:1, display:'grid', gridTemplateColumns: isCompare?'repeat(2,1fr)':'repeat(3,1fr)', gap:14, alignContent:'start' }}>
                {filtered.map(f=>(
                  <div key={f.id} className="stride-card stride-card-glow" style={{ overflow:'hidden' }}>
                    <div style={{ position:'relative' }}>
                      {isCompare ? (
                        <div style={{ display:'flex', height:180 }}>
                          <div style={{ flex:1, position:'relative', borderRight:'2px dashed var(--border-active)' }}>
                            <div className="glass badge" style={{ position:'absolute', top:8, left:8, zIndex:5 }}>Baseline</div>
                            <img src={f.prevUrl} alt="prev" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          </div>
                          <div style={{ flex:1, position:'relative' }}>
                            <div className="glass badge" style={{ position:'absolute', top:8, left:8, zIndex:5 }}>Current</div>
                            <img src={f.url} alt="curr" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            {f.bboxes.map((b,i)=><div key={i} style={{ position:'absolute', top:`${b.y}%`, left:`${b.x}%`, width:`${b.w}%`, height:`${b.h}%`, border:'2px solid var(--accent-red)', pointerEvents:'none', borderRadius:2 }} />)}
                          </div>
                        </div>
                      ) : (
                        <div style={{ position:'relative', height:180 }}>
                          <img src={f.url} alt="frame" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          {f.bboxes.map((b,i)=><div key={i} style={{ position:'absolute', top:`${b.y}%`, left:`${b.x}%`, width:`${b.w}%`, height:`${b.h}%`, border:'2px solid var(--accent-red)', pointerEvents:'none', borderRadius:2 }} />)}
                        </div>
                      )}
                      
                      {/* Badges Overlay */}
                      <div style={{ position:'absolute', top:8, right:8, display:'flex', gap:6, zIndex:10 }}>
                        {f.flagged && <div className="badge badge-red"><Flag size={10}/> URGENT</div>}
                        <div className="badge" style={{ background:statusBg(f.status), color:statusColor(f.status), border:`1px solid ${statusColor(f.status)}40` }}>{f.status}</div>
                      </div>
                      
                      {/* Compare Metrics Overlay */}
                      {isCompare && f.ssim < 0.85 && (
                        <div style={{ position:'absolute', bottom:8, right:8, zIndex:10 }}>
                          <div className="badge badge-red">Deterioration: {Math.round((1-f.ssim)*100)}%</div>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                        <div>
                          {f.type !== 'none' && <div style={{ fontSize:12, fontWeight:700, color:statusColor(f.status), textTransform:'uppercase', letterSpacing:'0.05em' }}>{f.type}</div>}
                          <div style={{ fontSize:11, color:'var(--text-primary)', marginTop:2 }}><Crosshair size={10} style={{display:'inline', marginRight:4}}/>{f.metadata.zone}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:10, color:'var(--text-muted)' }}>{new Date(f.ts).toLocaleTimeString([],{hour12:false})}</div>
                          <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{f.lat.toFixed(5)}, {f.lon.toFixed(5)}</div>
                        </div>
                      </div>
                      
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div className="progress-track" style={{ flex:1 }}>
                          <div className="progress-fill" style={{ width:`${f.conf}%`, background: f.conf>90?'var(--accent-green)':'var(--accent-amber)' }} />
                        </div>
                        <span style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', width:35 }}>{f.conf}%</span>
                        {!f.flagged && (
                          <button className="btn btn-ghost btn-sm" style={{ padding:'4px 8px' }} onClick={()=>handleFlag(f.id)}>
                            <Flag size={12}/>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline Scrubber */}
          <div className="stride-card" style={{ padding:'14px 16px', flexShrink:0, display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:'var(--text-muted)' }}>Flight Timeline</div>
              <div style={{ fontSize:11, color:'var(--text-secondary)', fontFamily:'var(--font-mono)' }}>{flightFrames.length} Frames</div>
            </div>
            
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button className="btn btn-ghost" style={{ padding:4 }}><Play size={14}/></button>
              
              <div style={{ flex:1, height:24, background:'var(--bg-secondary)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-primary)', position:'relative', display:'flex', alignItems:'center', padding:'0 4px', overflow:'hidden' }}>
                {flightFrames.map((f, i) => {
                  const isActive = f.id === activeFrameId;
                  const isFiltered = filtered.some(x=>x.id===f.id);
                  return (
                    <div 
                      key={f.id}
                      onClick={()=>setActiveFrameId(f.id)}
                      style={{ 
                        flex:1, 
                        height: isActive ? 20 : 12, 
                        background: isFiltered ? statusColor(f.status) : 'var(--border-primary)', 
                        margin:'0 1px', 
                        borderRadius:2,
                        opacity: isActive ? 1 : isFiltered ? 0.8 : 0.3,
                        cursor:'pointer',
                        transition:'all 0.1s'
                      }}
                      title={`${new Date(f.ts).toLocaleTimeString()} - ${f.status}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageShell>
  );
}

export default function MapPage() {
  return <ToastProvider><AnalysisContent /></ToastProvider>;
}
