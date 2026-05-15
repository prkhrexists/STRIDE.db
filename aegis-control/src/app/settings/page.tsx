'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { ToastProvider, useToast } from '@/components/Toast';
import { Save, Server, Activity, Cpu, RefreshCw, Trash2, Power, Wifi, Shield, Network } from 'lucide-react';

function SettingsContent() {
  const { success, error, info } = useToast();
  
  // Connection Settings
  const [piIp, setPiIp] = useState('192.168.1.100');
  const [sshPort, setSshPort] = useState('22');
  const [telemetryPort, setTelemetryPort] = useState('14550');
  const [streamEndpoint, setStreamEndpoint] = useState('/stream/video.mjpeg');
  const [authKey, setAuthKey] = useState('********');

  // Status metrics
  const [status, setStatus] = useState<'OFFLINE'|'CONNECTING'|'ONLINE'>('ONLINE');
  const [latency, setLatency] = useState(24);
  const [packetLoss, setPacketLoss] = useState(0.2);
  const [lastSync, setLastSync] = useState('Just now');

  // Services Status
  const [services, setServices] = useState({
    stream: 'RUNNING',
    telemetry: 'RUNNING',
    capture: 'IDLE',
    ai: 'RUNNING'
  });

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Initial fetch of settings
    fetch('/api/system/settings')
      .then(res => res.json())
      .then(data => {
        if (data.config) {
          setPiIp(data.config.piIp || '192.168.1.100');
          setSshPort(data.config.sshPort || '22');
          setTelemetryPort(data.config.telemetryPort || '14550');
          setStreamEndpoint(data.config.streamEndpoint || '/stream/video.mjpeg');
        }
      }).catch(console.error);

    // Mock polling for latency
    const interval = setInterval(() => {
      if (status === 'ONLINE') {
        setLatency(prev => Math.max(10, prev + (Math.random() * 6 - 3)));
        setPacketLoss(prev => Math.max(0, Math.min(5, prev + (Math.random() * 0.4 - 0.2))));
        setLastSync(new Date().toLocaleTimeString());
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [status]);

  const handleSaveSettings = async () => {
    try {
      await fetch('/api/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piIp, sshPort, telemetryPort, streamEndpoint })
      });
      success('Raspberry Pi connection settings saved');
    } catch {
      error('Failed to save settings');
    }
  };

  const handleAction = async (action: string, label: string) => {
    setIsProcessing(true);
    info(`${label} initiated...`);
    
    if (action === 'reconnect') setStatus('CONNECTING');

    try {
      await fetch(`/api/system/action?type=${action}`, { method: 'POST' });
      success(`${label} completed successfully`);
      
      if (action === 'reconnect') setStatus('ONLINE');
      if (action === 'restart') {
        setServices({ stream: 'RUNNING', telemetry: 'RUNNING', capture: 'IDLE', ai: 'RUNNING' });
      }
    } catch {
      error(`Failed to execute ${label}`);
      if (action === 'reconnect') setStatus('OFFLINE');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleService = async (svc: keyof typeof services) => {
    const current = services[svc];
    const next = current === 'RUNNING' || current === 'IDLE' ? 'STOPPED' : 'RUNNING';
    setServices(p => ({ ...p, [svc]: 'STARTING...' }));
    
    setTimeout(() => {
      setServices(p => ({ ...p, [svc]: next }));
      success(`${svc} service ${next.toLowerCase()}`);
    }, 1000);
  };

  const inputStyle = { width:'100%', padding:'7px 10px', background:'var(--bg-secondary)', color:'var(--text-primary)', border:'1px solid var(--border-primary)', borderRadius:'var(--radius-sm)', fontSize:13, fontFamily:'var(--font-sans)', outline:'none' };

  const ControlRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border-primary)' }}>
      <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{label}</span>
      <div style={{ width:'60%', display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>{children}</div>
    </div>
  );

  const ServiceStatus = ({ name, status, id }: { name: string, status: string, id: keyof typeof services }) => {
    const isRunning = status === 'RUNNING' || status === 'IDLE';
    const color = isRunning ? 'var(--accent-green)' : status === 'STOPPED' ? 'var(--accent-red)' : 'var(--accent-amber)';
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: `1px solid ${color}40` }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, animation: status.includes('...') ? 'pulse-dot 1s infinite' : undefined }} />
            <span style={{ fontSize: 11, fontWeight: 700, color }}>{status}</span>
          </div>
          <button className={`btn btn-sm ${isRunning ? 'btn-danger' : 'btn-primary'}`} style={{ padding: '2px 8px', fontSize: 10 }} onClick={() => toggleService(id)} disabled={status.includes('...')}>
            {isRunning ? 'STOP' : 'START'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <PageShell title="System Architecture" subtitle="Raspberry Pi integration & service orchestrator"
      actions={<button className="btn btn-primary btn-sm" onClick={handleSaveSettings}><Save size={12} /> Save Config</button>}>
      
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, alignItems:'start', maxWidth:1300 }}>

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          {/* Connection Settings */}
          <div className="stride-card">
            <div className="card-header">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Server size={13} color="var(--accent-blue)" />
                <span className="card-header-title">Pi Connection Settings</span>
              </div>
            </div>
            <div style={{ padding:'16px 20px' }}>
              <ControlRow label="Raspberry Pi IP">
                <div style={{ position: 'relative', width: '100%' }}>
                  <Wifi size={12} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
                  <input type="text" value={piIp} onChange={e=>setPiIp(e.target.value)} style={{ ...inputStyle, paddingLeft: 30 }} />
                </div>
              </ControlRow>
              <ControlRow label="SSH Port">
                <input type="text" value={sshPort} onChange={e=>setSshPort(e.target.value)} style={inputStyle} />
              </ControlRow>
              <ControlRow label="Telemetry Port (UDP)">
                <input type="text" value={telemetryPort} onChange={e=>setTelemetryPort(e.target.value)} style={inputStyle} />
              </ControlRow>
              <ControlRow label="Stream Endpoint">
                <input type="text" value={streamEndpoint} onChange={e=>setStreamEndpoint(e.target.value)} style={inputStyle} />
              </ControlRow>
              <ControlRow label="Authentication Key">
                <div style={{ position: 'relative', width: '100%' }}>
                  <Shield size={12} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
                  <input type="password" value={authKey} onChange={e=>setAuthKey(e.target.value)} style={{ ...inputStyle, paddingLeft: 30 }} />
                </div>
              </ControlRow>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="stride-card">
            <div className="card-header">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Activity size={13} color="var(--accent-blue)" />
                <span className="card-header-title">System Actions</span>
              </div>
            </div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => handleAction('reconnect', 'Reconnection')} disabled={isProcessing}>
                <Network size={13} /> Reconnect Hardware
              </button>
              <button className="btn btn-secondary" onClick={() => handleAction('restart', 'Service restart')} disabled={isProcessing}>
                <Power size={13} /> Restart All Services
              </button>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--border-primary)' }} onClick={() => handleAction('sync', 'File sync')} disabled={isProcessing}>
                <RefreshCw size={13} /> Sync Files
              </button>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--border-primary)', color: 'var(--accent-red)' }} onClick={() => handleAction('clear', 'Cache clear')} disabled={isProcessing}>
                <Trash2 size={13} /> Clear Cache
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Connection Status */}
          <div className="stride-card">
            <div className="card-header">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Network size={13} color="var(--accent-blue)" />
                <span className="card-header-title">Hardware Health Monitor</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: status === 'ONLINE' ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)', border: `1px solid ${status === 'ONLINE' ? 'var(--accent-green)' : 'var(--accent-red)'}40`, borderRadius: '999px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: status === 'ONLINE' ? 'var(--accent-green)' : status === 'CONNECTING' ? 'var(--accent-amber)' : 'var(--accent-red)', animation: status === 'CONNECTING' ? 'pulse-dot 1s infinite' : undefined }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: status === 'ONLINE' ? 'var(--accent-green)' : status === 'CONNECTING' ? 'var(--accent-amber)' : 'var(--accent-red)' }}>{status}</span>
              </div>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Latency</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{latency.toFixed(1)}<span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>ms</span></div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Packet Loss</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: packetLoss > 2 ? 'var(--accent-amber)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{packetLoss.toFixed(2)}<span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>%</span></div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Last Sync</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent-blue)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>{lastSync}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Services Orchestrator */}
          <div className="stride-card">
            <div className="card-header">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Cpu size={13} color="var(--accent-blue)" />
                <span className="card-header-title">Service Orchestrator</span>
              </div>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ServiceStatus name="strided-stream (Video WebSocket)" status={services.stream} id="stream" />
              <ServiceStatus name="mavlink-router (Telemetry UDP)" status={services.telemetry} id="telemetry" />
              <ServiceStatus name="stride-capture (Hardware trigger)" status={services.capture} id="capture" />
              <ServiceStatus name="aegis-ai-worker (Reconstruction)" status={services.ai} id="ai" />
            </div>
          </div>

        </div>

      </div>
    </PageShell>
  );
}

export default function SettingsPage() {
  return <ToastProvider><SettingsContent /></ToastProvider>;
}
