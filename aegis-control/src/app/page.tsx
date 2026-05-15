'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import { ToastProvider, useToast } from '@/components/Toast';
import { ArtificialHorizon, CompassWidget } from '@/components/FlightInstruments';
import {
  Activity, Battery, Gauge, Navigation, Radio, Camera,
  Video, Image as ImageIcon, Zap, AlertTriangle, CheckCircle2,
  Play, Square, RefreshCw, Shield, Cpu, Wifi, Crosshair, Map as MapIcon, RotateCcw, MonitorPlay
} from 'lucide-react';

// --- Types ---
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
interface LogEntry { id: string; ts: string; level: LogLevel; source: string; message: string; }
interface PiStatus { connected: boolean; cpu_pct?: number; ram_pct?: number; storage_used_gb?: number; storage_total_gb?: number; camera_connected?: boolean; temperature_c?: number; capture_active?: boolean; total_captured?: number; capture_elapsed_s?: number; }
interface Telemetry { timestamp: number; altitude: number; groundspeed: number; airspeed: number; heading: number; roll: number; pitch: number; yaw: number; battery_pct: number; battery_voltage: number; battery_current: number; gps_sats: number; gps_fix: string; mode: string; armed: boolean; signal_strength: number; imu_status: string; phase: string; }

// --- Subcomponents ---
function TelemetryPanel({ telemetry, onCommand }: { telemetry: Telemetry | null, onCommand: (cmd: string) => void }) {
  const connected = !!telemetry;
  const alt = telemetry?.altitude ?? 0;
  const spd = telemetry?.groundspeed ?? 0;
  const hdg = telemetry?.heading ?? 0;
  const bat = telemetry?.battery_pct ?? 0;
  const mode = telemetry?.mode ?? 'OFFLINE';
  const batColor = bat > 40 ? 'var(--accent-green)' : bat > 20 ? 'var(--accent-amber)' : 'var(--accent-red)';
  const armed = telemetry?.armed ?? false;

  return (
    <div className="stride-card" style={{ display:'flex', flexDirection:'column', overflow:'hidden', height: '100%' }}>
      <div className="card-header">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Activity size={13} color="var(--accent-blue)" />
          <span className="card-header-title">Flight Telemetry</span>
        </div>
        <div className="badge" style={{ background: connected?'var(--accent-green-glow)':'var(--accent-red-glow)', color: connected?'var(--accent-green)':'var(--accent-red)', borderColor: connected?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.3)' }}>
          <div className={`status-dot ${connected?'status-online':'status-offline'}`} />
          {connected ? 'LINK ACTIVE' : 'NO LINK'}
        </div>
      </div>

      <div style={{ padding:14, flex:1, display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>
        {/* Instruments row */}
        <div style={{ display:'flex', justifyContent:'space-around', alignItems:'center', paddingBottom:14, borderBottom:'1px solid var(--border-primary)' }}>
          <div style={{ textAlign:'center' }}>
            <ArtificialHorizon roll={telemetry?.roll ?? 0} pitch={telemetry?.pitch ?? 0} size={90} />
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:6, fontWeight:600 }}>ATTITUDE</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <CompassWidget heading={telemetry?.heading ?? 0} size={90} />
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:6, fontWeight:600 }}>HEADING</div>
          </div>
        </div>

        {/* Primary Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { label:'Altitude', value: `${alt.toFixed(1)} m`, color:'var(--accent-blue)' },
            { label:'Speed', value: `${spd.toFixed(1)} m/s`, color:'var(--text-primary)' },
            { label:'GPS', value: connected ? `${telemetry.gps_sats} Sats (${telemetry.gps_fix})` : '---', color: connected && telemetry.gps_sats > 8 ? 'var(--accent-green)' : 'var(--accent-amber)' },
            { label:'Mode', value: mode, color:'var(--text-primary)' },
            { label:'Signal', value: connected ? `${telemetry.signal_strength}%` : '---', color:'var(--accent-green)' },
            { label:'IMU', value: telemetry?.imu_status ?? '---', color:'var(--accent-green)' },
          ].map((s,i) => (
            <div key={i} style={{ background:'var(--bg-elevated)', padding:'8px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-primary)' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase' }}>{s.label}</div>
              <div style={{ fontSize:13, fontWeight:700, color:s.color, fontFamily:'var(--font-mono)', marginTop:2 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Battery */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <Battery size={12} color={batColor} />
              <span style={{ fontSize:11, color:'var(--text-secondary)', fontWeight:600 }}>Battery</span>
            </div>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>
              {connected ? `${telemetry.battery_voltage.toFixed(1)}V · ${telemetry.battery_current.toFixed(1)}A` : ''}
            </span>
            <span style={{ fontSize:13, fontWeight:700, color: batColor, fontFamily:'var(--font-mono)' }}>{connected ? `${bat}%` : '---'}</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${bat}%`, background: batColor }} /></div>
        </div>

        {/* Action Buttons */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:'auto' }}>
          <button className={`btn ${armed ? 'btn-danger' : 'btn-success'}`} onClick={() => onCommand(armed ? 'disarm' : 'arm')} disabled={!connected} style={{ justifyContent:'center' }}>
            {armed ? 'Disarm' : 'Arm Drone'}
          </button>
          <button className="btn btn-primary" onClick={() => onCommand('takeoff')} disabled={!connected || !armed || telemetry?.phase !== 'ground'} style={{ justifyContent:'center' }}>
            Takeoff
          </button>
          <button className="btn btn-secondary" onClick={() => onCommand('start_mission')} disabled={!connected || !armed} style={{ justifyContent:'center' }}>
            <MapIcon size={12}/> Mission
          </button>
          <button className="btn btn-secondary" onClick={() => onCommand('rth')} disabled={!connected || !armed} style={{ justifyContent:'center' }}>
            <RotateCcw size={12}/> RTH
          </button>
        </div>
      </div>
    </div>
  );
}

function PiConnectionPanel({ status }: { status: PiStatus | null }) {
  const connected = status?.connected;
  return (
    <div className="stride-card" style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div className="card-header">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Cpu size={13} color="var(--accent-blue)" />
          <span className="card-header-title">Pi Connection</span>
        </div>
        <div className={`status-dot ${connected?'status-online':'status-offline'}`} />
      </div>
      <div style={{ padding:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {[
          { label:'Status', value: connected ? 'ONLINE' : 'OFFLINE', color: connected ? 'var(--accent-green)' : 'var(--accent-red)' },
          { label:'Camera', value: status?.camera_connected ? 'CONNECTED' : 'NOT DETECTED', color: status?.camera_connected ? 'var(--accent-green)' : 'var(--accent-red)' },
          { label:'CPU Temp', value: connected ? `${status?.temperature_c?.toFixed(1)}°C` : '---', color: 'var(--text-primary)' },
          { label:'CPU Load', value: connected ? `${status?.cpu_pct?.toFixed(1)}%` : '---', color: 'var(--text-primary)' },
          { label:'RAM Used', value: connected ? `${status?.ram_used_mb}MB / ${status?.ram_total_mb}MB` : '---', color: 'var(--text-primary)' },
          { label:'Storage', value: connected ? `${status?.storage_used_gb}GB / ${status?.storage_total_gb}GB` : '---', color: 'var(--text-primary)' },
        ].map((s,i) => (
          <div key={i} style={{ padding:'6px 0', borderBottom:'1px solid var(--border-primary)' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', marginBottom:2 }}>{s.label}</div>
            <div style={{ fontSize:12, fontWeight:600, color: s.color, fontFamily:'var(--font-mono)' }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityLogPanel({ logs }: { logs: LogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const levelColor = (l: LogLevel) => l==='ERROR'?'var(--accent-red)':l==='WARN'?'var(--accent-amber)':l==='SUCCESS'?'var(--accent-green)':'var(--accent-blue)';

  return (
    <div className="stride-card" style={{ display:'flex', flexDirection:'column', overflow:'hidden', flex:1 }}>
      <div className="card-header">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Activity size={13} color="var(--accent-blue)" />
          <span className="card-header-title">Activity Log</span>
        </div>
      </div>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'8px 12px', display:'flex', flexDirection:'column', gap:4, background:'var(--bg-secondary)' }}>
        {logs.map((l, i) => (
          <div key={i} style={{ display:'flex', gap:10, fontSize:11, fontFamily:'var(--font-mono)', padding:'4px 0', borderBottom: i<logs.length-1?'1px dashed var(--border-primary)':'none' }}>
            <span style={{ color:'var(--text-muted)' }}>{new Date(l.ts).toLocaleTimeString([], {hour12:false})}</span>
            <span style={{ color:levelColor(l.level), width:55, flexShrink:0 }}>[{l.level}]</span>
            <span style={{ color:'var(--text-secondary)', width:60, flexShrink:0 }}>{l.source}</span>
            <span style={{ color:'var(--text-primary)', flex:1 }}>{l.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaControls({ status, onAction }: { status: PiStatus | null, onAction: (a:string, p?:any)=>void }) {
  const [interval, setInterval] = useState('5');
  const [res, setRes] = useState('1080p');
  const active = status?.capture_active ?? false;
  const count = status?.total_captured ?? 0;
  const elapsed = status?.capture_elapsed_s ?? 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s/60);
    const secs = s%60;
    return `${m.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
  };

  return (
    <div className="stride-card" style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div className="card-header">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Camera size={13} color="var(--accent-blue)" />
          <span className="card-header-title">Media & Capture</span>
        </div>
        {active && <div className="badge badge-red"><div className="status-dot status-offline" style={{animation:'pulse-dot 1s infinite'}}/> REC {formatTime(elapsed)}</div>}
      </div>
      <div style={{ padding:14, display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <label style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase' }}>Interval</label>
            <select className="stride-select" value={interval} onChange={e=>setInterval(e.target.value)} disabled={active}>
              <option value="1">1s</option><option value="3">3s</option><option value="5">5s</option><option value="10">10s</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase' }}>Resolution</label>
            <select className="stride-select" value={res} onChange={e=>setRes(e.target.value)} disabled={active}>
              <option value="720p">1280x720</option><option value="1080p">1920x1080</option><option value="4k">3840x2160</option>
            </select>
          </div>
        </div>
        
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderTop:'1px solid var(--border-primary)' }}>
          <span style={{ fontSize:11, color:'var(--text-secondary)' }}>Images Captured</span>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--font-mono)' }}>{count}</span>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button className={`btn ${active ? 'btn-danger' : 'btn-success'}`} style={{ flex:1, justifyContent:'center' }} onClick={() => onAction(active ? 'stop' : 'start', { interval: parseInt(interval) })}>
            {active ? <><Square size={12}/> Stop Capture</> : <><Play size={12}/> Start Capture</>}
          </button>
          <button className="btn btn-secondary" onClick={() => onAction('snapshot')} disabled={active} title="Take single snapshot">
            <Camera size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

const DEMO_STEPS = [
  { id: 'connect', label: '1. Establishing Drone Connection', duration: 2000, log: 'Initiating MAVLink handshake...' },
  { id: 'telemetry', label: '2. Telemetry Synchronization', duration: 1500, log: 'Receiving flight parameters. Altitude locked.' },
  { id: 'camera', label: '3. Camera Stream Activation', duration: 2000, log: 'Video websocket connected at 1080p/30fps.' },
  { id: 'capture', label: '4. Autonomous Image Capture', duration: 4000, log: 'Executing waypoint mission. 24 frames captured.' },
  { id: 'upload', label: '5. Encrypted Flight Upload', duration: 2500, log: 'Syncing 1.2GB flight data to Aegis Cloud...' },
  { id: 'detect', label: '6. AI Defect Detection', duration: 3000, log: 'Running computer vision models. 14 anomalies detected.' },
  { id: 'analyze', label: '7. Structural Health Analysis', duration: 2500, log: 'Calculating structural degradation... Score: 78%' },
  { id: 'reconstruct', label: '8. 3D Model Reconstruction', duration: 3500, log: 'Generating point cloud and mesh from flight images.' },
  { id: 'report', label: '9. AI Report Generation', duration: 2000, log: 'Compiling executive summary and priority action list.' },
  { id: 'export', label: '10. PDF Export Preparation', duration: 1500, log: 'Finalizing formatting. PDF ready for download.' },
];

function CinematicDemoOverlay({ stepIndex, onCancel }: { stepIndex: number, onCancel: () => void }) {
  if (stepIndex < 0 || stepIndex >= DEMO_STEPS.length) return null;
  const step = DEMO_STEPS[stepIndex];
  const progress = ((stepIndex + 1) / DEMO_STEPS.length) * 100;

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(3, 5, 9, 0.85)', backdropFilter: 'blur(16px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: 'linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.25) 50%)', backgroundSize: '100% 4px' }}>
      <div className="stride-card" style={{ width: 540, padding: 40, border: '1px solid rgba(59, 130, 246, 0.3)', boxShadow: '0 0 80px rgba(59, 130, 246, 0.15), inset 0 0 20px rgba(59, 130, 246, 0.05)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--accent-blue)', animation: 'pulse-dot 1s infinite' }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: 'white', letterSpacing: '0.05em' }}>STRIDE ENTERPRISE DEMO</span>
        </div>
        
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: 8 }}>{step.label}</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32, fontFamily: 'var(--font-mono)' }}>{step.log}</div>

        <div style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))', transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>Sequence {stepIndex + 1} of {DEMO_STEPS.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>

        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 32, color: 'var(--text-muted)' }} onClick={onCancel}>
          Cancel Demo Sequence
        </button>
      </div>
    </div>
  );
}

// --- Main Content ---
function DashboardContent() {
  const { success, error, info } = useToast();
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [piStatus, setPiStatus] = useState<PiStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [camUrl, setCamUrl] = useState('');
  
  // Cinematic Demo State
  const [demoStep, setDemoStep] = useState(-1);

  // Setup Streams
  useEffect(() => {
    const telEs = new EventSource(`/api/telemetry/stream?demo=${isDemoMode?'1':'0'}`);
    telEs.onmessage = (e) => { try { setTelemetry(JSON.parse(e.data)); } catch {} };
    
    const logEs = new EventSource('/api/logs/stream');
    logEs.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'backfill') setLogs(d.entries);
        else if (d.type === 'entry') setLogs(p => [...p, d.entry].slice(-100));
      } catch {}
    };

    const piPoll = setInterval(async () => {
      try {
        const res = await fetch('/api/pi/status');
        if (res.ok) {
          const data = await res.json();
          setPiStatus(data);
          if (data.connected && !camUrl) {
            setCamUrl(data.simulated ? '/cracks/04168eeebk3f94229020b7d905d28c43-1-_JPG.rf.b7456ec9aed620a184c515508604468c.jpg' : `${process.env.NEXT_PUBLIC_PI_URL || 'http://192.168.1.100:5001'}/stream`);
          } else if (!data.connected) {
            setCamUrl('');
          }
        }
      } catch {
        setPiStatus(null);
        setCamUrl('');
      }
    }, 1000);

    return () => { telEs.close(); logEs.close(); clearInterval(piPoll); };
  }, [isDemoMode]);

  // Demo Orchestration Engine
  useEffect(() => {
    if (isDemoMode && demoStep === -1) {
      setDemoStep(0); // Start demo
    } else if (!isDemoMode && demoStep !== -1) {
      setDemoStep(-1); // Cancel demo
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (demoStep >= 0 && demoStep < DEMO_STEPS.length) {
      const step = DEMO_STEPS[demoStep];
      
      // Inject Log & Toast
      info(step.label);
      setLogs(p => [...p, { id: Math.random().toString(), ts: new Date().toISOString(), level: 'INFO', source: 'DEMO_SEQ', message: step.log }]);

      // Visual Side Effects per step
      if (step.id === 'camera') setCamUrl('/cracks/04168eeebk3f94229020b7d905d28c43-1-_JPG.rf.b7456ec9aed620a184c515508604468c.jpg');
      if (step.id === 'capture') setPiStatus(p => p ? { ...p, capture_active: true } : null);
      if (step.id === 'upload') setPiStatus(p => p ? { ...p, capture_active: false, total_captured: 24 } : null);
      if (step.id === 'detect') setLogs(p => [...p, { id: Math.random().toString(), ts: new Date().toISOString(), level: 'WARN', source: 'AI_CORE', message: 'Critical defect (Spalling) found on NW Facade.' }]);

      const timer = setTimeout(() => {
        setDemoStep(demoStep + 1);
      }, step.duration);
      return () => clearTimeout(timer);
    } else if (demoStep === DEMO_STEPS.length) {
      success('Cinematic Demo Complete!');
      setDemoStep(-1);
      setIsDemoMode(false);
    }
  }, [demoStep]);

  const handleDroneCmd = async (action: string) => {
    try {
      const res = await fetch('/api/drone/command', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action}) });
      const data = await res.json();
      if (data.success) success(data.message);
      else error(data.message);
    } catch { error('Failed to send command to drone'); }
  };

  const handlePiCmd = async (action: string, payload?: any) => {
    try {
      const res = await fetch('/api/pi/status', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action, ...payload}) });
      const data = await res.json();
      if (data.success) info(data.message);
      else error(data.message);
    } catch { error('Failed to send command to Pi'); }
  };

  return (
    <PageShell title="Flight Operations" subtitle="STRIDE GCS Dashboard" isDemoMode={isDemoMode} onToggleDemo={() => setIsDemoMode(!isDemoMode)} systemStatus={telemetry ? 'online' : 'offline'} noPadding>
      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr 340px', gap:14, padding:14, height:'100%', overflow:'hidden', position:'relative' }}>
        
        <CinematicDemoOverlay stepIndex={demoStep} onCancel={() => setIsDemoMode(false)} />

        {/* LEFT COLUMN: Media & Logs */}
        <div style={{ display:'flex', flexDirection:'column', gap:14, height:'100%', overflow:'hidden' }}>
          <MediaControls status={piStatus} onAction={handlePiCmd} />
          <PiConnectionPanel status={piStatus} />
          <ActivityLogPanel logs={logs} />
        </div>

        {/* CENTER COLUMN: Camera Feed */}
        <div className="stride-card" style={{ display:'flex', flexDirection:'column', overflow:'hidden', position:'relative', background:'#000' }}>
          {/* Top Overlays */}
          <div style={{ position:'absolute', top:14, left:14, zIndex:10, display:'flex', gap:8 }}>
            <div className="glass badge" style={{ padding:'5px 12px' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background: camUrl ? 'var(--accent-red)' : 'var(--text-muted)', animation: camUrl ? 'pulse-dot 1s infinite' : 'none' }} />
              <span style={{ fontSize:11, fontWeight:700 }}>{camUrl ? 'LIVE FEED' : 'OFFLINE'}</span>
            </div>
            {camUrl && <div className="glass badge"><MonitorPlay size={11} color="var(--accent-green)"/> 30 FPS</div>}
          </div>

          {/* Crosshair Overlay */}
          {camUrl && (
            <div style={{ position:'absolute', inset:0, zIndex:5, pointerEvents:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Crosshair size={40} color="rgba(255,255,255,0.3)" strokeWidth={1} />
            </div>
          )}

          {/* Feed Content */}
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
            {camUrl ? (
              <img src={camUrl} alt="Live Feed" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={() => setCamUrl('')} />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, color:'var(--text-muted)' }}>
                {/* Animated offline grid */}
                <div style={{ position:'absolute', inset:0, backgroundSize:'40px 40px', backgroundImage:'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)', pointerEvents:'none' }} />
                
                <div style={{ position:'relative', width:64, height:64, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ position:'absolute', inset:0, border:'2px dashed var(--border-active)', borderRadius:'50%', animation:'spin 10s linear infinite' }} />
                  <Camera size={24} color="var(--text-muted)" />
                </div>
                <div style={{ textAlign:'center', zIndex:1 }}>
                  <div style={{ fontSize:16, fontWeight:600, color:'var(--text-secondary)' }}>Awaiting Pi Stream</div>
                  <div style={{ fontSize:12, marginTop:4 }}>Camera feed is currently offline or disconnected</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom HUD */}
          {camUrl && telemetry && (
            <div style={{ position:'absolute', bottom:14, left:14, right:14, zIndex:10, display:'flex', gap:10, justifyContent:'center' }}>
              {[
                { label:'ALT', value: `${telemetry.altitude.toFixed(1)}m` },
                { label:'SPD', value: `${telemetry.groundspeed.toFixed(1)}m/s` },
                { label:'HDG', value: `${Math.round(telemetry.heading)}°` },
                { label:'BAT', value: `${telemetry.battery_pct}%` },
              ].map(s => (
                <div key={s.label} className="glass" style={{ padding:'4px 12px', borderRadius:'var(--radius-sm)', display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.7)', fontWeight:600 }}>{s.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'white', fontFamily:'var(--font-mono)' }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Telemetry */}
        <div style={{ height:'100%', overflow:'hidden' }}>
          <TelemetryPanel telemetry={telemetry} onCommand={handleDroneCmd} />
        </div>

      </div>
    </PageShell>
  );
}

export default function HomePage() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}
