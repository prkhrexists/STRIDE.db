'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import PageShell from '@/components/PageShell';
import { ToastProvider, useToast } from '@/components/Toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Flag, Filter, Upload, Play, Pause, Download, AlertTriangle, CheckCircle2, XCircle, BarChart2, Maximize, Map as MapIcon, Image as ImageIcon, Crosshair, ChevronRight, ChevronLeft, Video } from 'lucide-react';

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
  
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid'|'map'>('grid');
  const [isCompare, setIsCompare] = useState(false);
  const [compareId, setCompareId] = useState('');
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Mode states
  const [inputSource, setInputSource] = useState<'file' | 'live'>('file');
  const [isLiveCapturing, setIsLiveCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  // Stop Live Clean Up
  useEffect(() => {
    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const flightFrames = useMemo(() => allFrames.filter(f => f.flightId === selectedFlightId).sort((a,b)=>a.ts-b.ts), [allFrames, selectedFlightId]);
  
  const filtered = useMemo(() => {
    return flightFrames.filter(f => {
      if(activeFilters.length === 0) return true;
      
      let pass = true;
      if (activeFilters.includes('Critical') && f.status !== 'CRITICAL') pass = false;
      if (activeFilters.includes('Flagged') && !f.flagged) pass = false;
      if (activeFilters.includes('Clean') && f.status !== 'CLEAN') pass = false;
      
      const typeFilters = ['Crack', 'Corrosion', 'Spalling'].filter(t => activeFilters.includes(t));
      if (typeFilters.length > 0 && !typeFilters.includes(f.type.charAt(0).toUpperCase() + f.type.slice(1))) pass = false;
      
      return pass;
    });
  }, [flightFrames, activeFilters]);

  const sf = flights.find(f=>f.id===selectedFlightId);
  const total = flightFrames.length;
  const crit = flightFrames.filter(f=>f.status==='CRITICAL').length;
  const def = flightFrames.filter(f=>f.status==='DEFECT').length;
  const clean = flightFrames.filter(f=>f.status==='CLEAN').length;

  const handleFlag = async (id: string) => {
    // Optimistic
    setAllFrames(allFrames.map(f=>f.id===id?{...f,flagged:!f.flagged}:f));
    const frame = allFrames.find(f => f.id === id);
    const newFlag = !(frame?.flagged);
    try {
      const res = await fetch(`/api/frames/${id}/flag`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagged: newFlag })
      });
      if (!res.ok) throw new Error('Failed');
      if (newFlag) warning('Frame flagged for urgent review');
    } catch (e) {
      // Rollback
      setAllFrames(allFrames.map(f=>f.id===id?{...f,flagged:!newFlag}:f));
      error('Failed to update flag state');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    info('Uploading file...');
    try {
      const res = await fetch('/api/analysis/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        success('Log imported successfully');
        setFlights([data.flight, ...flights]);
        setSelectedFlightId(data.flight.id);
      } else {
        error(data.error || 'Import failed');
      }
    } catch (err) {
      error('Failed to import file');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runAnalysis = async () => {
    if (!sf || sf.status === 'ANALYZED') return;
    
    setIsAnalyzing(true);
    setAnalyzeProgress(0);
    info('Starting AI Analysis Pipeline job...');
    
    // Set status to analyzing locally
    setFlights(flights.map(f => f.id === selectedFlightId ? { ...f, status: 'ANALYZING' } : f));
    
    try {
      const res = await fetch('/api/analyze/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flightId: selectedFlightId, frames: flightFrames })
      });
      if (!res.ok) throw new Error('Job init failed');
      const { jobId } = await res.json();
      
      const timer = setInterval(async () => {
        try {
          const stRes = await fetch(`/api/analyze/job/${jobId}`);
          if (stRes.ok) {
            const stData = await stRes.json();
            setAnalyzeProgress(stData.progress || 0);
            
            if (stData.status === 'COMPLETED') {
              clearInterval(timer);
              setIsAnalyzing(false);
              
              // Apply results
              let newFrames = [...allFrames];
              let newCrit = 0, newDef = 0, newClean = 0;
              
              stData.results.forEach((r: any) => {
                const frameIdx = newFrames.findIndex(f => f.id === r.frameId);
                if (frameIdx > -1) {
                  newFrames[frameIdx] = {
                    ...newFrames[frameIdx],
                    status: r.data.status,
                    conf: r.data.maxConf ? parseFloat((r.data.maxConf * 100).toFixed(1)) : 100,
                    url: r.data.snapshotUrl + '?t=' + Date.now(),
                    type: r.data.detections?.length ? r.data.detections[0].class : 'none',
                    bboxes: [], 
                    flagged: r.data.status === 'CRITICAL'
                  };
                  if (r.data.status === 'CRITICAL') newCrit++;
                  else if (r.data.status === 'DEFECT') newDef++;
                  else newClean++;
                }
              });
              
              setAllFrames(newFrames);
              setFlights(flights.map(f => f.id === selectedFlightId ? { ...f, status: 'ANALYZED' } : f));
              success(`Analysis complete: ${newCrit} Critical, ${newDef} Moderate, ${newClean} Clean`);
            }
          }
        } catch (e) {}
      }, 2000);
      
    } catch (e) {
      error('Failed to start analysis job');
      setIsAnalyzing(false);
      setFlights(flights.map(f => f.id === selectedFlightId ? { ...f, status: 'PENDING' } : f));
    }
  };

  const startLiveAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      
      const newFlightId = `FL-LIVE-${Date.now().toString().slice(-4)}`;
      const newFlight: Flight = {
        id: newFlightId,
        name: `Live Session ${new Date().toLocaleTimeString()}`,
        date: new Date().toISOString(),
        framesCount: 0,
        status: 'ANALYZING'
      };
      
      setFlights(prev => [newFlight, ...prev]);
      setSelectedFlightId(newFlightId);
      setIsLiveCapturing(true);
      info('Live analysis started. Capturing every 5 seconds.');

      liveIntervalRef.current = setInterval(async () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const formData = new FormData();
          formData.append('file', blob, 'frame.jpg');
          formData.append('flightId', newFlightId);
          formData.append('frameIndex', Date.now().toString());

          try {
            const res = await fetch('/api/analyze/frame', { method: 'POST', body: formData });
            if (res.ok) {
              const data = await res.json();
              const newFrame: Frame = {
                id: `fr-${Date.now()}`,
                flightId: newFlightId,
                url: data.snapshotUrl + '?t=' + Date.now(),
                prevUrl: '',
                status: data.status,
                type: data.detections?.length ? data.detections[0].class : 'none',
                conf: data.maxConf ? parseFloat((data.maxConf * 100).toFixed(1)) : 100,
                lat: 0, lon: 0, ts: Date.now(),
                bboxes: [], flagged: data.status === 'CRITICAL', ssim: 1,
                metadata: { zone: 'Live Feed' }
              };
              setAllFrames(prev => [...prev, newFrame]);
              setFlights(prev => prev.map(f => f.id === newFlightId ? { ...f, framesCount: f.framesCount + 1 } : f));
            }
          } catch (e) {
            console.error('Frame upload failed', e);
          }
        }, 'image/jpeg', 0.8);

      }, 5000); // 5 seconds
      
    } catch (e) {
      error('Webcam permission denied or unavailable. Fallback to file mode.');
      setInputSource('file');
    }
  };

  const stopLiveAnalysis = () => {
    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setIsLiveCapturing(false);
    setFlights(prev => prev.map(f => f.id === selectedFlightId ? { ...f, status: 'ANALYZED' } : f));
    success('Live analysis stopped and session finalized.');
  };

  // Timeline playback
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      if (filtered.length === 0) return;
      setActiveFrameId(curr => {
        const idx = filtered.findIndex(f => f.id === curr);
        const nextIdx = idx === -1 || idx >= filtered.length - 1 ? 0 : idx + 1;
        return filtered[nextIdx].id;
      });
    }, 500); // 2fps
    return () => clearInterval(timer);
  }, [isPlaying, filtered]);

  const toggleFilter = (f: string) => {
    setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  if (isLoading) return <PageShell title="Analysis Center" noPadding><div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',color:'var(--text-muted)'}}>Loading Inspection Data...</div></PageShell>;

  return (
    <PageShell title="Analysis Center" subtitle="Post-flight image analysis & defect detection"
      actions={
        <div style={{ display:'flex', gap:8, alignItems: 'center' }}>
          <select className="stride-select" style={{ height: 28, padding: '0 8px' }} value={inputSource} onChange={e => { setInputSource(e.target.value as 'file'|'live'); if(e.target.value==='file' && isLiveCapturing) stopLiveAnalysis(); }}>
            <option value="file">File Input</option>
            <option value="live">Live Webcam</option>
          </select>

          {inputSource === 'file' ? (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json,.csv,.zip" style={{display:'none'}} />
              <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}><Upload size={11}/> Import Logs</button>
              
              <button 
                className="btn btn-primary btn-sm" 
                onClick={runAnalysis} 
                disabled={!sf || sf.status === 'ANALYZED' || isAnalyzing}
              >
                {isAnalyzing ? <span style={{animation:'spin 1s linear infinite', display:'inline-block'}}><Play size={11}/></span> : <Play size={11}/>} 
                {isAnalyzing ? `Analyzing... ${analyzeProgress}%` : sf?.status === 'ANALYZED' ? 'Analyzed' : 'Run AI Analysis'}
              </button>
            </>
          ) : (
            <button className={`btn btn-sm ${isLiveCapturing ? 'btn-secondary' : 'btn-primary'}`} style={isLiveCapturing ? { background: 'var(--accent-red)', color: 'white', borderColor: 'transparent' } : {}} onClick={isLiveCapturing ? stopLiveAnalysis : startLiveAnalysis}>
              {isLiveCapturing ? <Pause size={11}/> : <Video size={11}/>} 
              {isLiveCapturing ? 'Stop Live Analysis' : 'Start Live Analysis'}
            </button>
          )}
        </div>
      }>
      
      <div style={{ display:'flex', gap:16, height:'calc(100vh - 130px)' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ width:280, display:'flex', flexDirection:'column', gap:12, flexShrink:0, overflowY:'auto', paddingRight:4 }}>
          
          {/* Flights List */}
          <div className="stride-card" style={{ overflow:'hidden' }}>
            <div className="card-header">
              <span className="card-header-title">{inputSource === 'live' ? 'Live Sessions' : 'Flights'}</span>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{flights.length} logs</span>
            </div>
            <div style={{ overflowY:'auto', maxHeight:240 }}>
              {flights.map(f=>(
                <div key={f.id} onClick={()=>{ setSelectedFlightId(f.id); setActiveFrameId(null); setIsPlaying(false); }} style={{ padding:'12px 14px', cursor:'pointer', borderBottom:'1px solid var(--border-primary)', background: selectedFlightId===f.id?'var(--accent-blue-glow)':'transparent', borderLeft: selectedFlightId===f.id?'3px solid var(--accent-blue)':'3px solid transparent', transition:'all 0.15s' }}>
                  <div style={{ fontSize:13, fontWeight:600, color: selectedFlightId===f.id?'var(--accent-blue-bright)':'var(--text-primary)' }}>{f.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{new Date(f.date).toLocaleDateString()} · {f.framesCount} frames</div>
                  <div style={{ fontSize:10, fontWeight:600, color:f.status==='ANALYZED'?'var(--accent-green)':'var(--accent-amber)', marginTop:4, textTransform:'uppercase' }}>{f.status}</div>
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
              {['Critical','Flagged','Clean','Crack','Corrosion','Spalling'].map(opt=>(
                <button 
                  key={opt} 
                  onClick={()=>toggleFilter(opt)} 
                  className={`btn btn-sm ${activeFilters.includes(opt)?'btn-primary':'btn-secondary'}`} 
                  style={{ padding:'4px 10px', fontSize:11 }}
                >
                  {opt}
                </button>
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
          {inputSource === 'file' && (
            <div className="stride-card" style={{ padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)' }}>{sf?.name ?? 'No Flight Selected'}</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>
                  {filtered.length} frames matched filter
                </div>
              </div>
              
              <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                {/* View Toggle */}
                <div style={{ display:'flex', background:'var(--bg-secondary)', padding:4, borderRadius:'var(--radius-md)', border:'1px solid var(--border-primary)' }}>
                  <button onClick={()=>{setViewMode('grid');setIsCompare(false);}} className={`btn btn-sm ${viewMode==='grid'&&!isCompare?'btn-primary':'btn-ghost'}`} style={{ padding:'4px 10px', height:28 }}><ImageIcon size={14}/></button>
                  <button onClick={()=>{setViewMode('map');setIsCompare(false);}} className={`btn btn-sm ${viewMode==='map'?'btn-primary':'btn-ghost'}`} style={{ padding:'4px 10px', height:28 }}><MapIcon size={14}/></button>
                </div>
                
                {/* Compare Toggle */}
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'var(--text-secondary)' }}>
                  <input type="checkbox" checked={isCompare} onChange={e=>{setIsCompare(e.target.checked); if(e.target.checked) setViewMode('grid');}} />
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
          )}

          {/* Dynamic Main Content: Grid OR Map OR Live Feed */}
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }} id="frames-scroll-container">
            {inputSource === 'live' ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ width: '100%', height: 400, background: '#000', borderRadius: 'var(--radius-lg)', position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ height: '100%', objectFit: 'contain' }} />
                  {isLiveCapturing && <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }} className="badge badge-red"><span style={{animation:'pulse 2s infinite'}}>●</span> LIVE ANALYSIS</div>}
                  {!isLiveCapturing && <div style={{ position:'absolute', top:'50%', color:'var(--text-muted)' }}>Camera inactive. Click 'Start Live Analysis'.</div>}
                </div>
                
                {/* Live grid underneath */}
                <div style={{ display:'grid', gridTemplateColumns: 'repeat(3,1fr)', gap:14, alignContent:'start' }}>
                  {filtered.map(f=>{
                    const isHighlighted = f.id === activeFrameId;
                    return (
                      <div key={f.id} className={`stride-card stride-card-glow ${isHighlighted ? 'highlight-frame' : ''}`} style={{ overflow:'hidden', border: isHighlighted ? '2px solid var(--accent-blue)' : undefined }} ref={isHighlighted ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : null}>
                        <div style={{ position:'relative', height:180 }}>
                          <img src={f.url} alt="frame" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          {f.bboxes?.map((b,i)=><div key={i} style={{ position:'absolute', top:`${b.y}%`, left:`${b.x}%`, width:`${b.w}%`, height:`${b.h}%`, border:'2px solid var(--accent-red)', pointerEvents:'none', borderRadius:2 }} />)}
                          
                          <div style={{ position:'absolute', top:8, right:8, display:'flex', gap:6, zIndex:10 }}>
                            {f.flagged && <div className="badge badge-red"><Flag size={10}/> URGENT</div>}
                            <div className="badge" style={{ background:statusBg(f.status), color:statusColor(f.status), border:`1px solid ${statusColor(f.status)}40` }}>{f.status}</div>
                          </div>
                        </div>
                        
                        <div style={{ padding:'12px 14px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                            <div>
                              {f.type !== 'none' && <div style={{ fontSize:12, fontWeight:700, color:statusColor(f.status), textTransform:'uppercase', letterSpacing:'0.05em' }}>{f.type}</div>}
                              <div style={{ fontSize:11, color:'var(--text-primary)', marginTop:2 }}><Crosshair size={10} style={{display:'inline', marginRight:4}}/>{f.metadata?.zone || 'N/A'}</div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <div style={{ fontSize:10, color:'var(--text-muted)' }}>{new Date(f.ts).toLocaleTimeString([],{hour12:false})}</div>
                            </div>
                          </div>
                          
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div className="progress-track" style={{ flex:1 }}>
                              <div className="progress-fill" style={{ width:`${f.conf}%`, background: f.conf>90?'var(--accent-green)':'var(--accent-amber)' }} />
                            </div>
                            <span style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', width:35 }}>{f.conf}%</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : viewMode === 'map' && !isCompare ? (
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
                          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={()=>handleFlag(f.id)}>
                            {f.flagged ? 'Unflag' : 'Flag for Review'}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex:1, display:'grid', gridTemplateColumns: isCompare?'1fr':'repeat(3,1fr)', gap:14, alignContent:'start' }}>
                {filtered.map(f=>{
                  let pairedFrame = null;
                  if (isCompare) {
                    const compareFrames = allFrames.filter(cf => cf.flightId === compareId);
                    // find closest frame by gps distance roughly
                    pairedFrame = compareFrames.reduce((prev, curr) => {
                      const distP = Math.pow(prev.lat - f.lat, 2) + Math.pow(prev.lon - f.lon, 2);
                      const distC = Math.pow(curr.lat - f.lat, 2) + Math.pow(curr.lon - f.lon, 2);
                      return distP < distC ? prev : curr;
                    }, compareFrames[0]);
                  }

                  const isHighlighted = f.id === activeFrameId;
                  
                  return (
                  <div key={f.id} className={`stride-card stride-card-glow ${isHighlighted ? 'highlight-frame' : ''}`} style={{ overflow:'hidden', border: isHighlighted ? '2px solid var(--accent-blue)' : undefined }} ref={isHighlighted ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : null}>
                    <div style={{ position:'relative' }}>
                      {isCompare && pairedFrame ? (
                        <div style={{ display:'flex', height:240 }}>
                          <div style={{ flex:1, position:'relative', borderRight:'2px dashed var(--border-active)' }}>
                            <div className="glass badge" style={{ position:'absolute', top:8, left:8, zIndex:5 }}>{flights.find(x=>x.id===compareId)?.name || 'Compare Flight'}</div>
                            <img src={pairedFrame.url} alt="compare" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          </div>
                          <div style={{ flex:1, position:'relative' }}>
                            <div className="glass badge" style={{ position:'absolute', top:8, left:8, zIndex:5 }}>Selected Flight</div>
                            <img src={f.url} alt="curr" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            {f.bboxes?.map((b,i)=><div key={i} style={{ position:'absolute', top:`${b.y}%`, left:`${b.x}%`, width:`${b.w}%`, height:`${b.h}%`, border:'2px solid var(--accent-red)', pointerEvents:'none', borderRadius:2 }} />)}
                          </div>
                        </div>
                      ) : (
                        <div style={{ position:'relative', height:180 }}>
                          <img src={f.url} alt="frame" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          {f.bboxes?.map((b,i)=><div key={i} style={{ position:'absolute', top:`${b.y}%`, left:`${b.x}%`, width:`${b.w}%`, height:`${b.h}%`, border:'2px solid var(--accent-red)', pointerEvents:'none', borderRadius:2 }} />)}
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
                          <div style={{ fontSize:11, color:'var(--text-primary)', marginTop:2 }}><Crosshair size={10} style={{display:'inline', marginRight:4}}/>{f.metadata?.zone || 'N/A'}</div>
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
                        
                        <button className="btn btn-ghost btn-sm" style={{ padding:'4px 8px', background: f.flagged ? 'var(--accent-red-glow)' : 'transparent' }} onClick={()=>handleFlag(f.id)}>
                          <Flag size={12} color={f.flagged ? 'var(--accent-red)' : 'var(--text-secondary)'} />
                        </button>
                      </div>
                    </div>
                  </div>
                )})}
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
              <button className={`btn ${isPlaying ? 'btn-primary' : 'btn-ghost'}`} style={{ padding:4 }} onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? <Pause size={14}/> : <Play size={14}/>}
              </button>
              
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
