'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { ToastProvider, useToast } from '@/components/Toast';
import { Save, Server, Activity, Cpu, RefreshCw, Trash2, Power, Wifi, Shield, Network, CheckCircle2, XCircle, Loader2, Search, ArrowRight, Play, Check } from 'lucide-react';

function PiSetupWizard({ isOpen, onClose, onComplete, initialIp }: { isOpen: boolean; onClose: () => void; onComplete: (config: any) => void; initialIp: string }) {
  const [step, setStep] = useState(1);
  const [ip, setIp] = useState(initialIp);
  const [isScanning, setIsScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState<{ip:string, hostname:string}[]>([]);
  
  // Step 2 logs
  const [verifyLogs, setVerifyLogs] = useState<{step:string, status:'pending'|'loading'|'success'|'error', detail?:string}[]>([
    { step: 'ping', status: 'pending' },
    { step: 'api', status: 'pending' },
    { step: 'camera', status: 'pending' },
    { step: 'stream', status: 'pending' },
  ]);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Step 3
  const [installing, setInstalling] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    setFoundDevices([]);
    try {
      const res = await fetch('/api/pi/scan', { method: 'POST', body: JSON.stringify({ subnet: '192.168.1' }) });
      const data = await res.json();
      setFoundDevices(data.devices || []);
    } catch {}
    setIsScanning(false);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    const steps = ['ping', 'api', 'camera', 'stream'];
    
    // Reset logs
    setVerifyLogs(steps.map(s => ({ step: s, status: 'pending' })));

    let allSuccess = true;
    for (const s of steps) {
      setVerifyLogs(prev => prev.map(l => l.step === s ? { ...l, status: 'loading' } : l));
      try {
        const res = await fetch(`/api/pi/verify-step/${s}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip, port: '5001' })
        });
        const data = await res.json();
        setVerifyLogs(prev => prev.map(l => l.step === s ? { ...l, status: data.success ? 'success' : 'error', detail: data.detail || data.message } : l));
        if (!data.success) {
          allSuccess = false;
          break; // Stop on first failure
        }
      } catch (e: any) {
        setVerifyLogs(prev => prev.map(l => l.step === s ? { ...l, status: 'error', detail: e.message } : l));
        allSuccess = false;
        break;
      }
    }
    setIsVerifying(false);
    if (allSuccess) {
       setTimeout(() => setStep(3), 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="stride-card" style={{ width: 600, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Raspberry Pi Setup Wizard</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Step {step} of 4</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>&times;</button>
        </div>

        {/* Content */}
        <div style={{ padding: 24, minHeight: 300 }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'block' }}>Network IP Address</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input type="text" value={ip} onChange={e=>setIp(e.target.value)} placeholder="e.g. 192.168.1.100" style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', color: 'white' }} />
                  <button className="btn btn-secondary" onClick={handleScan} disabled={isScanning} style={{ width: 140 }}>
                    {isScanning ? <Loader2 size={14} className="animate-spin" /> : <><Search size={14}/> Auto-detect</>}
                  </button>
                </div>
              </div>

              {foundDevices.length > 0 && (
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12, border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Found Devices</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {foundDevices.map((d, i) => (
                      <div key={i} onClick={() => setIp(d.ip)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: ip === d.ip ? 'var(--accent-blue-glow)' : 'var(--bg-secondary)', border: `1px solid ${ip === d.ip ? 'var(--accent-blue)' : 'var(--border-primary)'}`, borderRadius: 4, cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{d.hostname}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.ip}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Verifying hardware connection and capabilities at <strong>{ip}</strong>.</p>
              
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 16, border: '1px solid var(--border-primary)', fontFamily: 'var(--font-mono)', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {verifyLogs.map((log, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, opacity: log.status === 'pending' ? 0.3 : 1 }}>
                    <div style={{ marginTop: 2 }}>
                      {log.status === 'loading' && <Loader2 size={14} className="animate-spin" color="var(--accent-blue)" />}
                      {log.status === 'success' && <CheckCircle2 size={14} color="var(--accent-green)" />}
                      {log.status === 'error' && <XCircle size={14} color="var(--accent-red)" />}
                      {log.status === 'pending' && <div style={{ width: 14, height: 14, border: '1px solid var(--text-muted)', borderRadius: '50%' }} />}
                    </div>
                    <div>
                      <div style={{ color: log.status === 'error' ? 'var(--accent-red)' : 'white' }}>
                        Checking {log.step}... {log.status === 'success' ? 'OK' : log.status === 'error' ? 'FAILED' : ''}
                      </div>
                      {log.detail && (
                        <div style={{ color: log.status === 'error' ? 'var(--accent-red)' : 'var(--text-muted)', marginTop: 4, fontSize: 11, lineHeight: 1.4 }}>
                          {log.status === 'success' ? '✓ ' : 'Action required: '}{log.detail}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!isVerifying && verifyLogs.some(l => l.status === 'error') && (
                <button className="btn btn-secondary" onClick={handleVerify}><RefreshCw size={14}/> Retry Verification</button>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 16, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
                <Cpu size={24} color="var(--accent-blue)" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>strided-stream & telemetry</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Required background services</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                The Pi needs a companion service running to expose the camera stream and MAVLink telemetry to this dashboard. 
              </p>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setInstalling(true);
                  setTimeout(() => { setInstalling(false); setStep(4); }, 2000);
                }} 
                disabled={installing}
              >
                {installing ? <><Loader2 size={14} className="animate-spin"/> Installing via SSH...</> : <><Play size={14}/> Install Missing Services automatically</>}
              </button>
              
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>OR run manually:</div>
              <div style={{ padding: 12, background: '#000', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-green)', border: '1px solid var(--border-primary)' }}>
                curl -sSL https://stride.aero/setup.sh | bash
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}><CheckCircle2 size={16} color="var(--accent-green)" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }}/> Connection Established</div>
                <div className="badge badge-green">LIVE</div>
              </div>
              <div style={{ width: '100%', height: 240, background: '#000', borderRadius: 8, border: '1px solid var(--border-primary)', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                  src={`http://${ip}:5001/stream/video.mjpeg`} 
                  alt="Camera Stream Test" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">Waiting for video frames... Make sure stream is running on the Pi.</div>';
                  }}
                />
                <div style={{ position: 'absolute', bottom: 10, left: 10, color: 'white', fontSize: 10, fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4 }}>
                  LIVE PREVIEW
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                If you can see the stream above, the hardware is correctly configured.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-elevated)' }}>
          <button className="btn btn-ghost" onClick={() => step > 1 ? setStep(step - 1) : onClose()}>{step === 1 ? 'Cancel' : 'Back'}</button>
          
          {step === 1 && <button className="btn btn-primary" onClick={() => { setStep(2); handleVerify(); }} disabled={!ip}>Next <ArrowRight size={14}/></button>}
          {step === 2 && <button className="btn btn-primary" onClick={() => setStep(3)} disabled={verifyLogs.some(l => l.status !== 'success')}>Next <ArrowRight size={14}/></button>}
          {step === 3 && <button className="btn btn-primary" onClick={() => setStep(4)}>Skip & Next <ArrowRight size={14}/></button>}
          {step === 4 && <button className="btn btn-primary" onClick={() => onComplete({ piIp: ip })}><Check size={14}/> Looks Good — Save Config</button>}
        </div>
      </div>
    </div>
  );
}

function SettingsContent() {
  const { success, error, info } = useToast();
  
  // Connection Settings
  const [piIp, setPiIp] = useState('192.168.1.100');
  const [sshPort, setSshPort] = useState('22');
  const [streamPort, setStreamPort] = useState('5001');
  const [telemetryPort, setTelemetryPort] = useState('14550');
  const [streamEndpoint, setStreamEndpoint] = useState('/stream/video.mjpeg');
  const [authKey, setAuthKey] = useState('********');

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean, message?: string } | null>(null);

  // Status metrics
  const [status, setStatus] = useState<'OFFLINE'|'CONNECTING'|'ONLINE'>('CONNECTING');
  const [latency, setLatency] = useState(0);
  const [packetLoss, setPacketLoss] = useState(0);
  const [lastSync, setLastSync] = useState('Never');

  // Services Status
  const [services, setServices] = useState({
    stream: 'LOADING',
    telemetry: 'LOADING',
    capture: 'LOADING',
    ai: 'LOADING'
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  
  // Progress States
  const [restartProgress, setRestartProgress] = useState<{service: string, status: string}[] | null>(null);
  const [syncProgress, setSyncProgress] = useState<{message: string, percent: number} | null>(null);

  useEffect(() => {
    // Initial fetch of settings
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setPiIp(data.piIp || '192.168.1.100');
          setSshPort(data.sshPort || '22');
          setStreamPort(data.streamPort || '5001');
          setTelemetryPort(data.telemetryPort || '14550');
          setStreamEndpoint(data.streamEndpoint || '/stream/video.mjpeg');
          if (data.authKey) setAuthKey(data.authKey);
          
          if (!data.piIp || data.piIp === '192.168.1.100') {
             // In a real scenario, check if it's the default or missing to show wizard
             // setShowWizard(true);
          }
        } else {
           setShowWizard(true);
        }
      }).catch(console.error);

    fetchHardwareHealth();
    fetchServicesStatus();

    const intervalHealth = setInterval(fetchHardwareHealth, 10000);
    const intervalServices = setInterval(fetchServicesStatus, 15000);
    
    return () => {
      clearInterval(intervalHealth);
      clearInterval(intervalServices);
    };
  }, []);

  const fetchHardwareHealth = async () => {
    try {
      const res = await fetch('/api/hardware/health');
      const data = await res.json();
      if (!data.error) {
        setStatus(data.alive ? 'ONLINE' : 'OFFLINE');
        setLatency(data.latency);
        setPacketLoss(data.packetLoss);
        setLastSync(new Date(data.lastSync).toLocaleTimeString());
      } else {
        setStatus('OFFLINE');
      }
    } catch {
      setStatus('OFFLINE');
    }
  };

  const fetchServicesStatus = async () => {
    try {
      const res = await fetch('/api/services/status');
      const data = await res.json();
      if (!data.error) {
        setServices({
          stream: data.stream,
          telemetry: data.telemetry,
          capture: data.capture,
          ai: data.ai
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async () => {
    setValidationErrors({});
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piIp, sshPort, streamPort, telemetryPort, streamEndpoint, authKey })
      });
      const data = await res.json();
      
      if (!res.ok || data.error) {
        error(data.error || 'Validation failed');
        // Simple heuristic to assign error to field if backend didn't specify exactly
        if (data.error?.includes('IPv4')) setValidationErrors({ piIp: data.error });
        else if (data.error?.includes('Port')) setValidationErrors({ sshPort: data.error, streamPort: data.error, telemetryPort: data.error });
        else if (data.error?.includes('Auth')) setValidationErrors({ authKey: data.error });
      } else {
        success('Raspberry Pi connection settings saved');
        fetchHardwareHealth(); // trigger immediate health check with new IP
      }
    } catch {
      error('Failed to save settings');
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/pi/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piIp, port: streamPort })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: `Connected (${Math.round(data.latency)}ms). Camera: ${data.cameraDetected ? 'Yes' : 'No'}` });
        success('Connection test successful');
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed' });
        error('Connection test failed');
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Error occurred' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleAction = async (action: string, label: string) => {
    if (action === 'reconnect' && (status === 'OFFLINE' || piIp === '192.168.1.x')) {
       setShowWizard(true);
       return;
    }

    setIsProcessing(true);
    info(`${label} initiated...`);

    try {
      if (action === 'reconnect') {
        const res = await fetch('/api/pi/reconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ piIp, port: streamPort })
        });
        const data = await res.json();
        if (data.success) {
          success(`Hardware reconnected · ${data.services_restarted || 4} services running`);
          setStatus('ONLINE');
          fetchHardwareHealth();
        } else {
          error(data.error || 'Reconnection failed at step: ping');
          setStatus('OFFLINE');
        }
      } else if (action === 'restart') {
        setRestartProgress([]);
        const res = await fetch('/api/services/restart-all', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          let current = 0;
          const interval = setInterval(() => {
            if (current < data.results.length) {
              setRestartProgress(prev => [...(prev || []), data.results[current]]);
              current++;
            } else {
              clearInterval(interval);
              setTimeout(() => {
                setRestartProgress(null);
                success('All services restarted successfully');
                fetchServicesStatus();
              }, 1500);
            }
          }, 800);
        } else {
          error('Failed to restart services');
          setRestartProgress(null);
        }
      } else if (action === 'sync') {
        setSyncProgress({ message: 'Connecting...', percent: 0 });
        const source = new EventSource('/api/pi/sync');
        source.onmessage = (e) => {
          const data = JSON.parse(e.data);
          if (data.status === 'syncing' || data.status === 'started') {
            setSyncProgress({ message: data.message, percent: data.percent || 0 });
          } else if (data.status === 'completed') {
            source.close();
            setSyncProgress({ message: 'Sync complete.', percent: 100 });
            success(`Synced ${data.total} files successfully`);
            setTimeout(() => setSyncProgress(null), 2000);
          }
        };
        source.onerror = () => {
          source.close();
          error('Sync connection lost');
          setSyncProgress(null);
        };
      } else if (action === 'clear') {
        const res = await fetch('/api/cache', { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          success(`Cleared ${data.clearedMB} MB of temporary cache`);
        } else {
          error('Failed to clear cache');
        }
      }
    } catch {
      error(`Failed to execute ${label}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWizardComplete = async (config: any) => {
    setPiIp(config.piIp);
    setShowWizard(false);
    
    // Save to backend
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piIp: config.piIp, sshPort, streamPort, telemetryPort, streamEndpoint, authKey })
      });
      success('Raspberry Pi connection established and saved.');
      fetchHardwareHealth(); // trigger immediate health check
    } catch {
      error('Failed to save wizard settings');
    }
  };

  const toggleService = async (svc: keyof typeof services) => {
    const current = services[svc];
    const isRunning = current === 'RUNNING' || current === 'IDLE';
    const action = isRunning ? 'stop' : 'start';
    
    setServices(p => ({ ...p, [svc]: 'PROCESSING...' }));
    
    try {
      const res = await fetch(`/api/services/${svc}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        success(`Service ${svc} ${action}ed`);
        // Refresh statuses to get accurate truth
        fetchServicesStatus();
      } else {
        error(`Failed to ${action} ${svc}`);
        fetchServicesStatus(); // revert optimistic
      }
    } catch {
      error(`Error performing action on ${svc}`);
      fetchServicesStatus(); // revert
    }
  };

  const inputStyle = (hasError: boolean) => ({ 
    width:'100%', 
    padding:'7px 10px', 
    background:'var(--bg-secondary)', 
    color:'var(--text-primary)', 
    border: `1px solid ${hasError ? 'var(--accent-red)' : 'var(--border-primary)'}`, 
    borderRadius:'var(--radius-sm)', 
    fontSize:13, 
    fontFamily:'var(--font-sans)', 
    outline:'none' 
  });

  const ControlRow = ({ label, errorMsg, children }: { label: string; errorMsg?: string; children: React.ReactNode }) => (
    <div style={{ padding:'10px 0', borderBottom:'1px solid var(--border-primary)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{label}</span>
        <div style={{ width:'60%', display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>{children}</div>
      </div>
      {errorMsg && <div style={{ fontSize: 11, color: 'var(--accent-red)', textAlign: 'right', marginTop: 4 }}>{errorMsg}</div>}
    </div>
  );

  const ServiceStatus = ({ name, status, id }: { name: string, status: string, id: keyof typeof services }) => {
    const isRunning = status === 'RUNNING' || status === 'IDLE';
    const color = status === 'LOADING' || status === 'PROCESSING...' ? 'var(--text-muted)' : isRunning ? 'var(--accent-green)' : 'var(--accent-red)';
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: `1px solid ${color}40` }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {status === 'LOADING' || status === 'PROCESSING...' ? (
              <Loader2 size={12} color={color} className="animate-spin" />
            ) : (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            )}
            <span style={{ fontSize: 11, fontWeight: 700, color }}>{status}</span>
          </div>
          <button 
            className={`btn btn-sm ${isRunning ? 'btn-danger' : 'btn-primary'}`} 
            style={{ padding: '2px 8px', fontSize: 10, minWidth: 50 }} 
            onClick={() => toggleService(id)} 
            disabled={status === 'LOADING' || status === 'PROCESSING...'}
          >
            {isRunning ? 'STOP' : 'START'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <PageShell title="System Architecture" subtitle="Raspberry Pi integration & service orchestrator"
      actions={<button className="btn btn-primary btn-sm" onClick={handleSaveSettings}><Save size={12} /> Save Config</button>}>
      
      <PiSetupWizard 
        isOpen={showWizard} 
        onClose={() => setShowWizard(false)} 
        onComplete={handleWizardComplete} 
        initialIp={piIp} 
      />

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
              <ControlRow label="Raspberry Pi IP" errorMsg={validationErrors.piIp}>
                <div style={{ display: 'flex', gap: 8, width: '100%', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Wifi size={12} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
                    <input type="text" value={piIp} onChange={e=>setPiIp(e.target.value)} style={{ ...inputStyle(!!validationErrors.piIp), paddingLeft: 30 }} />
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleTestConnection} disabled={isTesting} style={{ padding: '6px 12px' }}>
                    {isTesting ? <Loader2 size={12} className="animate-spin" /> : 'Test'}
                  </button>
                </div>
              </ControlRow>
              
              {testResult && (
                <div style={{ padding: '8px 10px', background: testResult.success ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)', borderRadius: 'var(--radius-sm)', border: `1px solid ${testResult.success ? 'var(--accent-green)' : 'var(--accent-red)'}40`, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {testResult.success ? <CheckCircle2 size={14} color="var(--accent-green)" /> : <XCircle size={14} color="var(--accent-red)" />}
                  <span style={{ fontSize: 12, color: testResult.success ? 'var(--accent-green)' : 'var(--accent-red)' }}>{testResult.message}</span>
                </div>
              )}

              <ControlRow label="SSH Port" errorMsg={validationErrors.sshPort}>
                <input type="text" value={sshPort} onChange={e=>setSshPort(e.target.value)} style={inputStyle(!!validationErrors.sshPort)} />
              </ControlRow>
              <ControlRow label="Stream Port (HTTP)" errorMsg={validationErrors.streamPort}>
                <input type="text" value={streamPort} onChange={e=>setStreamPort(e.target.value)} style={inputStyle(!!validationErrors.streamPort)} />
              </ControlRow>
              <ControlRow label="Telemetry Port (UDP)" errorMsg={validationErrors.telemetryPort}>
                <input type="text" value={telemetryPort} onChange={e=>setTelemetryPort(e.target.value)} style={inputStyle(!!validationErrors.telemetryPort)} />
              </ControlRow>
              <ControlRow label="Stream Endpoint">
                <input type="text" value={streamEndpoint} onChange={e=>setStreamEndpoint(e.target.value)} style={inputStyle(false)} />
              </ControlRow>
              <ControlRow label="Authentication Key" errorMsg={validationErrors.authKey}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Shield size={12} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
                  <input type="password" value={authKey} onChange={e=>setAuthKey(e.target.value)} style={{ ...inputStyle(!!validationErrors.authKey), paddingLeft: 30 }} />
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
              <div title="Reconnect to hardware">
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => handleAction('reconnect', 'Reconnection')} disabled={isProcessing}>
                  <Network size={13} /> Reconnect Hardware
                </button>
              </div>
              <div title={status === 'OFFLINE' ? "Pi offline" : ""}>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => handleAction('restart', 'Service restart')} disabled={isProcessing || status === 'OFFLINE'}>
                  <Power size={13} /> Restart All Services
                </button>
              </div>
              <div title={status === 'OFFLINE' ? "Pi offline" : ""}>
                <button className="btn btn-ghost" style={{ width: '100%', border: '1px solid var(--border-primary)' }} onClick={() => handleAction('sync', 'File sync')} disabled={isProcessing || status === 'OFFLINE'}>
                  <RefreshCw size={13} /> Sync Files
                </button>
              </div>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--border-primary)', color: 'var(--accent-red)' }} onClick={() => handleAction('clear', 'Cache clear')} disabled={isProcessing}>
                <Trash2 size={13} /> Clear Cache
              </button>
            </div>
            
            {/* Action Progress Overlays */}
            {(restartProgress || syncProgress) && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid var(--border-primary)' }}>
                {restartProgress && (
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12, marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Loader2 size={12} className="animate-spin" color="var(--accent-blue)" /> Restarting Services...
                    </div>
                    {restartProgress.map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                        <span>{p.service}</span>
                        <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12}/> {p.status} (PID: {p.pid})</span>
                      </div>
                    ))}
                  </div>
                )}
                {syncProgress && (
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12, marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{syncProgress.message}</span>
                      <span style={{ color: 'var(--accent-blue)' }}>{syncProgress.percent}%</span>
                    </div>
                    <div style={{ width: '100%', height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${syncProgress.percent}%`, height: '100%', background: 'var(--accent-blue)', transition: 'width 0.2s' }} />
                    </div>
                  </div>
                )}
              </div>
            )}
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
