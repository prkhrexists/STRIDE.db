'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { ToastProvider, useToast } from '@/components/Toast';
import { Cpu, Save, Settings2, Cable, Activity, RefreshCw, HardDrive, Clock, Camera, Radio } from 'lucide-react';

function DroneSettingsContent() {
  const { success, error, info } = useToast();
  
  // Connection Settings
  const [piIp, setPiIp] = useState('192.168.1.100');
  const [mavlinkPort, setMavlinkPort] = useState('14550');
  const [baudRate, setBaudRate] = useState('115200');

  // Basic Drone Settings
  const [maxAltitude, setMaxAltitude] = useState(50);
  const [maxSpeed, setMaxSpeed] = useState(8);
  const [rthAltitude, setRthAltitude] = useState(30);
  const [captureInterval, setCaptureInterval] = useState(5);
  const [storagePath, setStoragePath] = useState('/mnt/usb/stride_data');
  const [refreshRate, setRefreshRate] = useState('10Hz');

  // Connection Panel Status
  const [statusPi, setStatusPi] = useState<'OFFLINE'|'CONNECTED'>('OFFLINE');
  const [statusTelemetry, setStatusTelemetry] = useState<'OFFLINE'|'CONNECTED'>('OFFLINE');
  const [statusCamera, setStatusCamera] = useState<'OFFLINE'|'CONNECTED'>('OFFLINE');
  const [statusStorage, setStatusStorage] = useState<'UNMOUNTED'|'MOUNTED'>('UNMOUNTED');

  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    // Initial fetch of persisted config
    fetch('/api/drone/settings')
      .then(res => res.json())
      .then(data => {
        if (data.config) {
          setPiIp(data.config.piIp || '192.168.1.100');
          setMavlinkPort(data.config.mavlinkPort || '14550');
          setBaudRate(data.config.baudRate || '115200');
          setMaxAltitude(data.config.maxAltitude || 50);
          setMaxSpeed(data.config.maxSpeed || 8);
          setRthAltitude(data.config.rthAltitude || 30);
          setCaptureInterval(data.config.captureInterval || 5);
          setStoragePath(data.config.storagePath || '/mnt/usb/stride_data');
          setRefreshRate(data.config.refreshRate || '10Hz');
        }
      }).catch(console.error);
  }, []);

  const handleSaveSettings = async () => {
    try {
      await fetch('/api/drone/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piIp, mavlinkPort, baudRate, maxAltitude, maxSpeed, rthAltitude, captureInterval, storagePath, refreshRate })
      });
      success('Tethered drone settings saved');
    } catch {
      error('Failed to save settings');
    }
  };

  const runTest = async (target: string) => {
    setIsTesting(true);
    info(`Testing ${target}...`);
    try {
      const res = await fetch(`/api/drone/test?target=${target}`);
      const data = await res.json();
      if (data.success) {
        success(`${target} test passed`);
        if (target === 'pi') setStatusPi('CONNECTED');
        if (target === 'telemetry') setStatusTelemetry('CONNECTED');
        if (target === 'camera') setStatusCamera('CONNECTED');
        if (target === 'storage') setStatusStorage('MOUNTED');
      } else {
        error(`${target} test failed`);
      }
    } catch {
      error(`Connection to ${target} timed out`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleAction = async (action: string) => {
    try {
      await fetch(`/api/drone/action?type=${action}`, { method: 'POST' });
      success(`${action} command executed successfully`);
    } catch {
      error(`Failed to execute ${action}`);
    }
  };

  const inputStyle = { width:'100%', padding:'7px 10px', background:'var(--bg-secondary)', color:'var(--text-primary)', border:'1px solid var(--border-primary)', borderRadius:'var(--radius-sm)', fontSize:13, fontFamily:'var(--font-sans)', outline:'none' };
  const selectStyle = { ...inputStyle, cursor: 'pointer' };

  const ControlRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border-primary)' }}>
      <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{label}</span>
      <div style={{ width:'55%', display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>{children}</div>
    </div>
  );

  const unit = (s: string) => <span style={{ fontSize:11, color:'var(--text-muted)', width:30, textAlign:'right', flexShrink:0 }}>{s}</span>;

  const StatusIndicator = ({ label, status, isGood }: { label: string, status: string, isGood: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: `1px solid ${isGood ? 'var(--accent-green)' : 'var(--accent-red)'}40` }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: isGood ? 'var(--accent-green)' : 'var(--accent-red)' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: isGood ? 'var(--accent-green)' : 'var(--accent-red)' }}>{status}</span>
      </div>
    </div>
  );

  return (
    <PageShell title="Drone Settings" subtitle="Tethered demonstration configuration" isDemoMode={true}
      actions={<button className="btn btn-primary btn-sm" onClick={handleSaveSettings}><Save size={12} /> Save Config</button>}>
      
      <div style={{ display:'grid', gridTemplateColumns:'60% 40%', gap:18, alignItems:'start', maxWidth:1300 }}>

        {/* LEFT COLUMN: Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          
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
                <input type="text" value={piIp} onChange={e=>setPiIp(e.target.value)} style={inputStyle} placeholder="192.168.1.100" />
              </ControlRow>
              <ControlRow label="MAVLink Port">
                <input type="text" value={mavlinkPort} onChange={e=>setMavlinkPort(e.target.value)} style={inputStyle} placeholder="14550" />
              </ControlRow>
              <ControlRow label="Serial Baud Rate">
                <select value={baudRate} onChange={e=>setBaudRate(e.target.value)} style={selectStyle}>
                  {['57600','115200','921600'].map(o=><option key={o}>{o}</option>)}
                </select>
              </ControlRow>
              <ControlRow label="USB Connection">
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>/dev/ttyACM0</span>
              </ControlRow>
              <ControlRow label="Sensor Availability">
                <span style={{ fontSize: 13, color: 'var(--accent-green)', fontWeight: 600 }}>LiDAR, IMU, GPS ACTIVE</span>
              </ControlRow>
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
                <input type="number" min={5} max={120} value={maxAltitude} onChange={e=>setMaxAltitude(+e.target.value)} style={{ ...inputStyle, width:80 }} />
                {unit('m')}
              </ControlRow>
              <ControlRow label="Max Speed">
                <input type="range" min={1} max={15} value={maxSpeed} onChange={e=>setMaxSpeed(+e.target.value)} style={{ flex:1 }} />
                {unit(`${maxSpeed}m/s`)}
              </ControlRow>
              <ControlRow label="Return-to-home Altitude">
                <input type="number" value={rthAltitude} onChange={e=>setRthAltitude(+e.target.value)} style={{ ...inputStyle, width:80 }} />
                {unit('m')}
              </ControlRow>
              <ControlRow label="Image Capture Interval">
                <input type="range" min={1} max={30} value={captureInterval} onChange={e=>setCaptureInterval(+e.target.value)} style={{ flex:1 }} />
                {unit(`${captureInterval}s`)}
              </ControlRow>
              <ControlRow label="Storage Path">
                <input type="text" value={storagePath} onChange={e=>setStoragePath(e.target.value)} style={inputStyle} />
              </ControlRow>
              <ControlRow label="Telemetry Refresh Rate">
                <select value={refreshRate} onChange={e=>setRefreshRate(e.target.value)} style={selectStyle}>
                  {['1Hz','5Hz','10Hz','50Hz'].map(o=><option key={o}>{o}</option>)}
                </select>
              </ControlRow>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Connection Panel */}
          <div className="stride-card">
            <div className="card-header">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Activity size={13} color="var(--accent-blue)" />
                <span className="card-header-title">Connection Panel</span>
              </div>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <StatusIndicator label="Raspberry Pi Detected" status={statusPi} isGood={statusPi === 'CONNECTED'} />
              <StatusIndicator label="Telemetry Stream" status={statusTelemetry} isGood={statusTelemetry === 'CONNECTED'} />
              <StatusIndicator label="Camera Stream" status={statusCamera} isGood={statusCamera === 'CONNECTED'} />
              <StatusIndicator label="Storage Drive" status={statusStorage} isGood={statusStorage === 'MOUNTED'} />
            </div>
          </div>

          {/* Test Buttons */}
          <div className="stride-card">
            <div className="card-header">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Cpu size={13} color="var(--accent-blue)" />
                <span className="card-header-title">Diagnostics & Tools</span>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <button className="btn btn-secondary" onClick={() => runTest('pi')} disabled={isTesting}>
                  <Cpu size={13} /> Test Pi Connection
                </button>
                <button className="btn btn-secondary" onClick={() => runTest('telemetry')} disabled={isTesting}>
                  <Radio size={13} /> Test Telemetry
                </button>
                <button className="btn btn-secondary" onClick={() => runTest('camera')} disabled={isTesting}>
                  <Camera size={13} /> Test Camera
                </button>
                <button className="btn btn-secondary" onClick={() => runTest('storage')} disabled={isTesting}>
                  <HardDrive size={13} /> Test Storage
                </button>
              </div>

              <div style={{ height: 1, background: 'var(--border-primary)', margin: '16px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn btn-ghost" style={{ justifyContent: 'center', border: '1px solid var(--border-primary)' }} onClick={() => handleAction('sync_clock')}>
                  <Clock size={13} /> Sync System Clock
                </button>
                <button className="btn btn-ghost" style={{ justifyContent: 'center', border: '1px solid var(--border-primary)', color: 'var(--accent-amber)' }} onClick={() => handleAction('restart_services')}>
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
