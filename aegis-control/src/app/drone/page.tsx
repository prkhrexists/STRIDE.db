'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageShell from '@/components/PageShell';
import { ToastProvider, useToast } from '@/components/Toast';
import {
  Cpu, Save, Settings2, Cable, Activity, RefreshCw, HardDrive,
  Clock, Camera, Radio, CheckCircle2, XCircle, Loader2, Usb,
  PlugZap, WifiOff, Unplug, AlertTriangle, RotateCcw,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type TestState = 'idle' | 'running' | 'ok' | 'fail';
interface TestResult { state: TestState; detail?: string; thumbnail?: string; }

interface DetectedPort {
  path: string;
  manufacturer: string | null;
  vendorId: string | null;
  productId: string | null;
  score: number;
  confidence: 'CONFIRMED' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

interface DroneStatus {
  connected: boolean;
  linkActive: boolean;
  port: string | null;
  lastHeartbeat: number;
  telemetry?: Record<string, any>;
}

// ─── Port Selector ───────────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: DetectedPort['confidence'] }) {
  const colors: Record<string, string> = {
    CONFIRMED: 'var(--accent-green)',
    HIGH:      '#f59e0b',
    MEDIUM:    'var(--accent-blue)',
    LOW:       'var(--text-muted)',
  };
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
      color: colors[level] ?? 'var(--text-muted)',
      background: `${colors[level] ?? 'var(--text-muted)'}22`,
      border: `1px solid ${colors[level] ?? 'var(--text-muted)'}55`,
      borderRadius: 3, padding: '1px 5px', marginLeft: 6,
    }}>{level}</span>
  );
}

function PortSelector({
  value, onChange, ports, loading, onRefresh,
}: {
  value: string;
  onChange: (v: string) => void;
  ports: DetectedPort[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const noHighValue = ports.length === 0 || !ports.some(p => p.confidence === 'CONFIRMED' || p.confidence === 'HIGH');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-muted)' }}>
            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
            Scanning ports…
          </div>
        ) : ports.length > 0 ? (
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none', cursor: 'pointer' }}
          >
            {ports.map(p => (
              <option key={p.path} value={p.path}>
                {p.path}  ·  {p.description}{p.confidence !== 'LOW' ? `  [${p.confidence}]` : ''}
              </option>
            ))}
          </select>
        ) : (
          <div style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--accent-red)44', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={12} /> No ports found
          </div>
        )}
        <button
          className="btn btn-ghost btn-sm"
          onClick={onRefresh}
          disabled={loading}
          style={{ padding: '7px 9px', flexShrink: 0 }}
          title="Re-scan ports"
        >
          <RotateCcw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
        </button>
      </div>

      {/* Badge row for selected port */}
      {!loading && ports.length > 0 && (() => {
        const sel = ports.find(p => p.path === value);
        if (!sel) return null;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)', paddingLeft: 2 }}>
            <ConfidenceBadge level={sel.confidence} />
            <span>{sel.description}</span>
            {sel.manufacturer && <span>· {sel.manufacturer}</span>}
            {sel.vendorId && <span style={{ fontFamily: 'var(--font-mono)' }}>VID:{sel.vendorId}</span>}
          </div>
        );
      })()}

      {noHighValue && !loading && ports.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--accent-amber)', paddingLeft: 2 }}>
          <AlertTriangle size={11} /> No drone detected — check USB cable
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TestButton({
  icon: Icon, label, result, onClick,
}: {
  icon: any; label: string; result: TestResult; onClick: () => void;
}) {
  const isRunning = result.state === 'running';
  const color = result.state === 'ok' ? 'var(--accent-green)' : result.state === 'fail' ? 'var(--accent-red)' : 'var(--text-secondary)';

  return (
    <button
      className="btn btn-secondary"
      style={{ flexDirection: 'column', gap: 6, padding: '14px 8px', height: 'auto', opacity: isRunning ? 0.8 : 1 }}
      onClick={onClick}
      disabled={isRunning}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {isRunning
          ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          : result.state === 'ok'
            ? <CheckCircle2 size={14} color="var(--accent-green)" />
            : result.state === 'fail'
              ? <XCircle size={14} color="var(--accent-red)" />
              : <Icon size={14} />
        }
        <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
      </div>
      {result.detail && (
        <span style={{ fontSize: 10, color, maxWidth: 120, textAlign: 'center', lineHeight: 1.3 }}>
          {result.detail}
        </span>
      )}
      {result.thumbnail && (
        <img src={result.thumbnail} alt="camera" style={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-primary)' }} />
      )}
    </button>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: `1px solid ${ok ? 'var(--accent-green)' : 'var(--accent-red)'}40` }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? 'var(--accent-green)' : 'var(--accent-red)', boxShadow: ok ? '0 0 6px var(--accent-green)' : undefined }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: ok ? 'var(--accent-green)' : 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>{value}</span>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

function DroneSettingsContent() {
  const { success, error: toastError, info } = useToast();

  // Config
  const [piIp, setPiIp]           = useState('192.168.1.100');
  const [mavlinkPort, setMavlinkPort] = useState('14550');
  const [baudRate, setBaudRate]    = useState('115200');
  const [usbPort, setUsbPort]      = useState('/dev/ttyACM0');
  const [detectedPorts, setDetectedPorts] = useState<DetectedPort[]>([]);
  const [portsLoading, setPortsLoading]   = useState(false);
  const [maxAltitude, setMaxAltitude]   = useState(50);
  const [maxSpeed, setMaxSpeed]         = useState(8);
  const [rthAltitude, setRthAltitude]   = useState(30);
  const [captureInterval, setCaptureInterval] = useState(5);
  const [storagePath, setStoragePath]   = useState('/mnt/usb/stride_data');
  const [refreshRate, setRefreshRate]   = useState('10Hz');

  // Connection state
  const [droneStatus, setDroneStatus] = useState<DroneStatus>({ connected: false, linkActive: false, port: null, lastHeartbeat: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const statusPollRef = useRef<ReturnType<typeof setInterval>>();

  // Test results
  const [tests, setTests] = useState<Record<string, TestResult>>({
    pi:       { state: 'idle' },
    telemetry:{ state: 'idle' },
    camera:   { state: 'idle' },
    storage:  { state: 'idle' },
  });

  const setTest = (key: string, val: TestResult) =>
    setTests(prev => ({ ...prev, [key]: val }));

  // ── Load config & ports on mount ─────────────────────────────────────────
  const fetchPorts = useCallback(async (probe = true) => {
    setPortsLoading(true);
    try {
      const res = await fetch(`/api/drone/ports?probe=${probe}`);
      const data = await res.json();
      if (data.ports?.length) {
        setDetectedPorts(data.ports);
        // Auto-select best port if none chosen yet or current not in list
        const confirmed = data.ports.find((p: DetectedPort) => p.confidence === 'CONFIRMED');
        const high      = data.ports.find((p: DetectedPort) => p.confidence === 'HIGH');
        const best = confirmed ?? high ?? data.ports[0];
        setUsbPort(prev => {
          const still = data.ports.find((p: DetectedPort) => p.path === prev);
          return still ? prev : best.path;
        });
      } else {
        setDetectedPorts([]);
      }
    } catch { /* service offline */ }
    finally { setPortsLoading(false); }
  }, []);

  useEffect(() => {
    // Load persisted settings
    fetch('/api/drone/settings').then(r => r.json()).then(d => {
      if (d.config) {
        setPiIp(d.config.piIp || '192.168.1.100');
        setMavlinkPort(d.config.mavlinkPort || '14550');
        setBaudRate(d.config.baudRate || '115200');
        setUsbPort(d.config.usbPort || '/dev/ttyACM0');
        setMaxAltitude(d.config.maxAltitude || 50);
        setMaxSpeed(d.config.maxSpeed || 8);
        setRthAltitude(d.config.rthAltitude || 30);
        setCaptureInterval(d.config.captureInterval || 5);
        setStoragePath(d.config.storagePath || '/mnt/usb/stride_data');
        setRefreshRate(d.config.refreshRate || '10Hz');
      }
    }).catch(() => {});

    // Fast initial scan (no probe) then full probe in background
    fetchPorts(false).then(() => fetchPorts(true));
  }, [fetchPorts]);

  // ── Poll /api/drone/status every 3 s ─────────────────────────────────────
  const pollStatus = useCallback(() => {
    fetch('/api/drone/status').then(r => r.json()).then((d: DroneStatus) => {
      setDroneStatus(d);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    pollStatus();
    statusPollRef.current = setInterval(pollStatus, 3000);
    return () => clearInterval(statusPollRef.current);
  }, [pollStatus]);

  // ── Connect / Disconnect ──────────────────────────────────────────────────
  const handleConnect = async () => {
    setIsConnecting(true);
    info(`Opening ${usbPort} @ ${baudRate}…`);
    try {
      const res = await fetch('/api/drone/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: usbPort, baudRate: Number(baudRate) }),
      });
      const data = await res.json();
      if (data.success) {
        success(`Connected on ${data.port}`);
        pollStatus();
      } else {
        toastError(data.error ?? 'Connection failed');
      }
    } catch {
      toastError('USB service unavailable — start `npm run usb`');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await fetch('/api/drone/disconnect', { method: 'POST' });
    success('Disconnected');
    pollStatus();
  };

  // ── Test Buttons ──────────────────────────────────────────────────────────
  const runTest = async (key: string) => {
    setTest(key, { state: 'running' });
    try {
      const params = new URLSearchParams({ target: key, piIp, mavPort: mavlinkPort });
      const res  = await fetch(`/api/drone/test?${params}`);
      const data = await res.json();
      if (data.success) {
        const details: Record<string, string> = {
          pi:       `${data.latency}ms latency`,
          telemetry:`${data.packets} packets / 5s`,
          camera:   'Frame received',
          storage:  `${data.freeGb ?? '?'} GB free`,
        };
        setTest(key, { state: 'ok', detail: details[key], thumbnail: data.thumbnail });
      } else {
        setTest(key, { state: 'fail', detail: data.error ?? 'Test failed' });
      }
    } catch (e: any) {
      setTest(key, { state: 'fail', detail: e.message });
    }
  };

  // ── Save settings — writes stride.config.json via USB service ────────────
  const handleSave = async () => {
    const payload = { piIp, mavlinkPort, baudRate, usbPort, maxAltitude, maxSpeed, rthAltitude, captureInterval, storagePath, refreshRate };
    try {
      // Primary: dedicated config endpoint (USB service)
      await fetch('/api/drone/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // Also update the existing settings API for other pages
      await fetch('/api/drone/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      success('Configuration saved to stride.config.json');
    } catch { toastError('Failed to save settings'); }
  };

  // ── Other actions ─────────────────────────────────────────────────────────
  const handleAction = async (type: string) => {
    try {
      await fetch(`/api/drone/action?type=${type}`, { method: 'POST' });
      success(`${type} executed`);
    } catch { toastError(`Failed: ${type}`); }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = { width:'100%', padding:'7px 10px', background:'var(--bg-secondary)', color:'var(--text-primary)', border:'1px solid var(--border-primary)', borderRadius:'var(--radius-sm)', fontSize:13, fontFamily:'var(--font-sans)', outline:'none' };
  const selectStyle = { ...inputStyle, cursor:'pointer' };

  const ControlRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border-primary)' }}>
      <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{label}</span>
      <div style={{ width:'55%', display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>{children}</div>
    </div>
  );

  const unit = (s: string) => <span style={{ fontSize:11, color:'var(--text-muted)', width:36, textAlign:'right', flexShrink:0 }}>{s}</span>;

  const timeSince = droneStatus.lastHeartbeat
    ? `${Math.round((Date.now() - droneStatus.lastHeartbeat) / 1000)}s ago`
    : 'Never';

  return (
    <PageShell
      title="Drone Settings"
      subtitle="USB · MAVLink · Telemetry Configuration"
      isDemoMode={false}
      actions={<button className="btn btn-primary btn-sm" onClick={handleSave}><Save size={12} /> Save Config</button>}
    >
      <div style={{ display:'grid', gridTemplateColumns:'60% 40%', gap:18, alignItems:'start', maxWidth:1300 }}>

        {/* ── LEFT: Settings ───────────────────────────────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

          {/* Connection Settings */}
          <div className="stride-card">
            <div className="card-header">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Cable size={13} color="var(--accent-blue)" />
                <span className="card-header-title">Connection Settings</span>
              </div>
            </div>
            <div style={{ padding:'16px 20px' }}>
              <ControlRow label="Raspberry Pi IP">
                <input type="text" value={piIp} onChange={e => setPiIp(e.target.value)} style={inputStyle} placeholder="192.168.1.100" />
              </ControlRow>
              <ControlRow label="MAVLink UDP Port">
                <input type="text" value={mavlinkPort} onChange={e => setMavlinkPort(e.target.value)} style={inputStyle} placeholder="14550" />
              </ControlRow>
              <ControlRow label="USB Serial Port">
                <PortSelector
                  value={usbPort}
                  onChange={setUsbPort}
                  ports={detectedPorts}
                  loading={portsLoading}
                  onRefresh={() => fetchPorts(true)}
                />
              </ControlRow>
              <ControlRow label="Serial Baud Rate">
                <select value={baudRate} onChange={e => setBaudRate(e.target.value)} style={selectStyle}>
                  {['57600','115200','921600'].map(o => <option key={o}>{o}</option>)}
                </select>
              </ControlRow>

              {/* Connect / Disconnect CTA */}
              <div style={{ paddingTop:14, display:'flex', gap:10 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex:1, justifyContent:'center', opacity: droneStatus.connected ? 0.5 : 1 }}
                  onClick={handleConnect}
                  disabled={isConnecting || droneStatus.connected}
                >
                  {isConnecting
                    ? <><Loader2 size={13} style={{ animation:'spin 1s linear infinite' }} /> Connecting…</>
                    : <><PlugZap size={13} /> Connect USB</>
                  }
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ flex:1, justifyContent:'center', borderColor: droneStatus.connected ? 'var(--accent-red)' : 'var(--border-primary)', color: droneStatus.connected ? 'var(--accent-red)' : 'var(--text-muted)' }}
                  onClick={handleDisconnect}
                  disabled={!droneStatus.connected}
                >
                  <Unplug size={13} /> Disconnect
                </button>
              </div>
            </div>
          </div>

          {/* Basic Drone Settings */}
          <div className="stride-card">
            <div className="card-header">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Settings2 size={13} color="var(--accent-blue)" />
                <span className="card-header-title">Basic Drone Settings</span>
              </div>
            </div>
            <div style={{ padding:'16px 20px' }}>
              <ControlRow label="Max Altitude">
                <input type="number" min={5} max={120} value={maxAltitude} onChange={e => setMaxAltitude(+e.target.value)} style={{ ...inputStyle, width:80 }} />
                {unit('m')}
              </ControlRow>
              <ControlRow label="Max Speed">
                <input type="range" min={1} max={15} value={maxSpeed} onChange={e => setMaxSpeed(+e.target.value)} style={{ flex:1 }} />
                {unit(`${maxSpeed}m/s`)}
              </ControlRow>
              <ControlRow label="Return-to-home Altitude">
                <input type="number" value={rthAltitude} onChange={e => setRthAltitude(+e.target.value)} style={{ ...inputStyle, width:80 }} />
                {unit('m')}
              </ControlRow>
              <ControlRow label="Image Capture Interval">
                <input type="range" min={1} max={30} value={captureInterval} onChange={e => setCaptureInterval(+e.target.value)} style={{ flex:1 }} />
                {unit(`${captureInterval}s`)}
              </ControlRow>
              <ControlRow label="Storage Path">
                <input type="text" value={storagePath} onChange={e => setStoragePath(e.target.value)} style={inputStyle} />
              </ControlRow>
              <ControlRow label="Telemetry Refresh Rate">
                <select value={refreshRate} onChange={e => setRefreshRate(e.target.value)} style={selectStyle}>
                  {['1Hz','5Hz','10Hz','50Hz'].map(o => <option key={o}>{o}</option>)}
                </select>
              </ControlRow>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Status + Tests ─────────────────────────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

          {/* Connection Panel — real /api/drone/status */}
          <div className="stride-card">
            <div className="card-header" style={{ display:'flex', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Activity size={13} color="var(--accent-blue)" />
                <span className="card-header-title">Connection Panel</span>
              </div>
              <span style={{ fontSize:10, color:'var(--text-muted)' }}>polls every 3s</span>
            </div>
            <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
              <StatusRow label="USB Serial" value={droneStatus.connected ? droneStatus.port ?? 'OPEN' : 'OFFLINE'} ok={droneStatus.connected} />
              <StatusRow label="MAVLink Link" value={droneStatus.linkActive ? 'ACTIVE' : 'NO LINK'} ok={droneStatus.linkActive} />
              <StatusRow label="Last Heartbeat" value={timeSince} ok={droneStatus.linkActive} />
              <StatusRow label="Raspberry Pi" value={tests.pi.state === 'ok' ? 'ONLINE' : 'UNKNOWN'} ok={tests.pi.state === 'ok'} />
              <StatusRow label="Camera Stream" value={tests.camera.state === 'ok' ? 'STREAMING' : 'OFFLINE'} ok={tests.camera.state === 'ok'} />
              <StatusRow label="Storage Drive" value={tests.storage.state === 'ok' ? 'MOUNTED' : 'UNMOUNTED'} ok={tests.storage.state === 'ok'} />

              {/* Live telemetry mini-dashboard */}
              {droneStatus.linkActive && droneStatus.telemetry && (
                <div style={{ marginTop:8, background:'var(--bg-primary)', borderRadius:'var(--radius-md)', padding:'12px 14px', border:'1px solid var(--border-primary)' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--accent-green)', letterSpacing:'0.08em', marginBottom:10 }}>LIVE TELEMETRY</div>
                  {[
                    ['Alt',  `${droneStatus.telemetry.relative_alt?.toFixed(1) ?? 0} m`],
                    ['Spd',  `${droneStatus.telemetry.groundspeed?.toFixed(1) ?? 0} m/s`],
                    ['Bat',  `${droneStatus.telemetry.battery_pct ?? 0}%`],
                    ['GPS',  `${droneStatus.telemetry.gps_fix ?? '?'} · ${droneStatus.telemetry.gps_sats ?? 0} sats`],
                    ['Mode', droneStatus.telemetry.mode ?? 'UNKNOWN'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>{k}</span>
                      <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-primary)', fontWeight:700 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Diagnostics & Tools */}
          <div className="stride-card">
            <div className="card-header">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Cpu size={13} color="var(--accent-blue)" />
                <span className="card-header-title">Diagnostics & Tools</span>
              </div>
            </div>
            <div style={{ padding:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                <TestButton icon={Cpu}      label="Test Pi"       result={tests.pi}        onClick={() => runTest('pi')} />
                <TestButton icon={Radio}    label="Telemetry"     result={tests.telemetry} onClick={() => runTest('telemetry')} />
                <TestButton icon={Camera}   label="Camera"        result={tests.camera}    onClick={() => runTest('camera')} />
                <TestButton icon={HardDrive}label="Storage"       result={tests.storage}   onClick={() => runTest('storage')} />
              </div>

              <div style={{ height:1, background:'var(--border-primary)', margin:'16px 0' }} />

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <button className="btn btn-ghost" style={{ justifyContent:'center', border:'1px solid var(--border-primary)' }} onClick={() => handleAction('sync_clock')}>
                  <Clock size={13} /> Sync System Clock
                </button>
                <button className="btn btn-ghost" style={{ justifyContent:'center', border:'1px solid var(--border-primary)', color:'var(--accent-amber)' }} onClick={() => handleAction('restart_services')}>
                  <RefreshCw size={13} /> Restart Pi Services
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageShell>
  );
}

export default function DroneSettingsPage() {
  return <ToastProvider><DroneSettingsContent /></ToastProvider>;
}
