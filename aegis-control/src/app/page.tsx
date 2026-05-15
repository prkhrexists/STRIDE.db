'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import CameraWizard, { CameraConfig } from '@/components/CameraWizard';

const DEMO_DURATION = 90;

function generateDemoTelemetry(timeSec: number) {
  const battery_remaining = Math.max(0, 100 - (timeSec / DEMO_DURATION) * 100);
  
  let alt = 0, groundspeed = 0;
  if (timeSec < 15) { alt = (timeSec / 15) * 45; groundspeed = 5; }
  else if (timeSec < 75) { alt = 45 + Math.sin(timeSec * 2) * 0.5; groundspeed = 20; }
  else { alt = 45 - ((timeSec - 75) / 15) * 45; alt = Math.max(0, alt); groundspeed = 2; }
  
  const heading = (timeSec * 5) % 360;

  return {
    SYS_STATUS: { battery_remaining: Math.round(battery_remaining) },
    VFR_HUD: { airspeed: groundspeed, groundspeed, heading, alt },
    HEARTBEAT: { custom_mode: timeSec < 15 ? 'AUTO' : 'LOITER' }
  };
}

export default function UAVCastDashboard() {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [cameraConfig, setCameraConfig] = useState<CameraConfig | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoTime, setDemoTime] = useState(0);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [mediaMode, setMediaMode] = useState<'video' | 'photo'>('video');
  
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  useEffect(() => {
    const savedCam = localStorage.getItem('aegis_picam_config');
    if (savedCam) setCameraConfig(JSON.parse(savedCam));
    const savedDemo = sessionStorage.getItem('demoTime') !== null;
    setIsDemoMode(savedDemo);
  }, []);

  useEffect(() => {
    if (isDemoMode) return;
    const eventSource = new EventSource('/api/mavlink/stream');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setTelemetry((prev: any) => ({ ...prev, [data.type]: data }));
      } catch (e) {}
    };
    return () => eventSource.close();
  }, [isDemoMode]);

  useEffect(() => {
    if (!isDemoMode) return;
    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = (time - previousTimeRef.current) / 1000;
        setDemoTime((prev) => (prev + deltaTime) % DEMO_DURATION);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      setTelemetry(generateDemoTelemetry(demoTime));
    }
  }, [demoTime, isDemoMode]);

  const toggleDemo = () => {
    if (isDemoMode) sessionStorage.removeItem('demoTime');
    else sessionStorage.setItem('demoTime', '1');
    setIsDemoMode(!isDemoMode);
    setTelemetry(null);
  };

  const isConnected = !!telemetry?.VFR_HUD;
  const alt = isConnected ? (telemetry?.VFR_HUD?.alt || 0) : null;
  const bat = isConnected ? (telemetry?.SYS_STATUS?.battery_remaining || 0) : null;
  const spd = isConnected ? (telemetry?.VFR_HUD?.groundspeed || 0) : null;
  const mode = isConnected ? (telemetry?.HEARTBEAT?.custom_mode || 'DISARMED') : 'DISARMED';

  const mockAgents = [
    { id: 'Agent-01', task: 'Perimeter Scan', status: 'Active', color: '#10b981' },
    { id: 'Agent-02', task: 'Thermal Imaging', status: 'Idle', color: '#f59e0b' },
    { id: 'Agent-03', task: 'SSIM Baseline', status: 'Active', color: '#10b981' },
    { id: 'Agent-04', task: 'Relay Node', status: 'Active', color: '#10b981' },
    { id: 'Agent-05', task: 'Offline', status: 'Disconnected', color: '#ef4444' },
  ];

  return (
    <div className={styles.gcsContainer}>
      {isWizardOpen && (
        <CameraWizard onClose={() => setIsWizardOpen(false)} onConnect={(config) => { setCameraConfig(config); setIsWizardOpen(false); }} />
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <nav className={styles.sidebar}>
        <div className={styles.brand}>AEGIS <span>PRO</span></div>
        
        <div className={styles.backBtn}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </div>

        <div className={styles.navSection}>Operations</div>
        <Link href="/" className={`${styles.navItem} ${styles.navActive}`}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Dashboard
        </Link>
        <Link href="/map" className={styles.navItem}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/></svg>
          Flight Map
        </Link>
        <Link href="/search" className={styles.navItem}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Search
        </Link>
        <Link href="/chat" className={styles.navItem}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Chat
        </Link>

        <div className={styles.navSection}>Management</div>
        <Link href="/drone" className={styles.navItem}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Drone
        </Link>
        <Link href="/files" className={styles.navItem}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
          Files
        </Link>
        <Link href="/settings" className={styles.navItem}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Settings
        </Link>
        <div className={styles.navItem} onClick={toggleDemo}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          {isDemoMode ? 'Exit Demo' : 'Start Demo'}
        </div>
      </nav>

      {/* MAIN DASHBOARD GRID */}
      <main className={styles.dashboardGrid}>
        
        {/* CENTRAL PANEL: VISUALS (Top Left/Center span) */}
        <div className={`${styles.panel} ${styles.visualsPanel}`}>
          <div className={styles.camOverlays}>
            <div className={styles.overlayBadge}>
              <div className={styles.redDot}></div> HDR REC
            </div>
            <div className={styles.overlayBadge}>Live Camera</div>
          </div>
          
          {cameraConfig ? (
            <img src={`/api/picam/stream?ip=${cameraConfig?.ip}&port=${cameraConfig?.port}`} className={styles.cameraFeed} alt="Feed" />
          ) : (
            <div className={styles.testPattern}>
              <div className={styles.testRow}>
                <div className={styles.testColor} style={{background: '#e5e5e5'}}></div>
                <div className={styles.testColor} style={{background: '#fde047'}}></div>
                <div className={styles.testColor} style={{background: '#67e8f9'}}></div>
                <div className={styles.testColor} style={{background: '#86efac'}}></div>
                <div className={styles.testColor} style={{background: '#f9a8d4'}}></div>
                <div className={styles.testColor} style={{background: '#ef4444'}}></div>
                <div className={styles.testColor} style={{background: '#3b82f6'}}></div>
              </div>
              <div className={styles.testRow} style={{flex: 0.2}}>
                <div className={styles.testColor} style={{background: '#1d4ed8'}}></div>
                <div className={styles.testColor} style={{background: '#000000'}}></div>
                <div className={styles.testColor} style={{background: '#a855f7'}}></div>
                <div className={styles.testColor} style={{background: '#262626'}}></div>
                <div className={styles.testColor} style={{background: '#0a0a0a'}}></div>
                <div className={styles.testColor} style={{background: '#525252'}}></div>
                <div className={styles.testColor} style={{background: '#737373'}}></div>
              </div>
            </div>
          )}
        </div>

        {/* TOP-RIGHT: TELEMETRY (Spans full right side) */}
        <div className={`${styles.panel} ${styles.telemetryPanel}`}>
          <div className={styles.panelHeader}>
            Telemetry
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={toggleDemo} 
                style={{ padding: '0.25rem 0.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                {isDemoMode ? 'Stop Demo' : 'Run Demo'}
              </button>
              <Link 
                href="/settings#drone" 
                style={{ padding: '0.25rem 0.5rem', backgroundColor: '#0d9488', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'none' }}
              >
                Connect Drone
              </Link>
            </div>
          </div>
          <div className={styles.telemetryContent}>
            <div>
              <div className={styles.droneTitle}>DHMR-32000</div>
              <div style={{color: '#a3a3a3', fontSize: '0.75rem'}}>{isConnected ? 'Connected ? Latency 12ms' : 'Disconnected'}</div>
            </div>
            
            <div className={styles.statusBars}>
              <div className={styles.statusGroup}>
                <div className={styles.statusHeader}>
                  <span>Altitude</span>
                  <span className={styles.statusValue}>{alt !== null ? `${alt.toFixed(1)} M` : '--'}</span>
                </div>
                <div className={styles.progressBar}><div className={styles.progressFill} style={{width: alt !== null ? `${Math.min(alt / 120 * 100, 100)}%` : '0%'}}></div></div>
              </div>

              <div className={styles.statusGroup}>
                <div className={styles.statusHeader}>
                  <span>Battery Status</span>
                  <span className={styles.statusValue} style={{color: bat === null ? '#a3a3a3' : (bat === 0 ? '#ef4444' : '#3b82f6')}}>{bat !== null ? `${bat}%` : '--'}</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{width: bat !== null ? `${bat}%` : '0%', background: bat === null ? 'transparent' : (bat === 0 ? '#ef4444' : '#3b82f6')}}></div>
                </div>
              </div>
            </div>

            <div className={styles.dataGrid}>
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>Speed</span>
                <span className={styles.dataVal}>{spd !== null ? `${spd.toFixed(1)} Km/h` : '--'}</span>
              </div>
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>Zone</span>
                <span className={`${styles.dataVal} ${mode !== 'DISARMED' ? styles.active : ''}`}>{isConnected ? (mode !== 'DISARMED' ? 'Green' : 'Safe') : '--'}</span>
              </div>
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>Distance</span>
                <span className={styles.dataVal}>{alt !== null ? `${(alt * 1.5).toFixed(1)} Km` : '--'}</span>
              </div>
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>ISO</span>
                <span className={styles.dataVal}>{isConnected ? '6000' : '--'}</span>
              </div>
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>Shutter</span>
                <span className={styles.dataVal}>{isConnected ? '1/50.0' : '--'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM-LEFT: MEDIA CONTROLS */}
        <div className={`${styles.panel} ${styles.mediaPanel}`}>
          <div className={styles.panelHeader}>Media Controls</div>
          <div className={styles.mediaContent}>
            <div className={styles.mediaToggle}>
              <div className={`${styles.toggleBtn} ${mediaMode === 'video' ? styles.active : ''}`} onClick={() => setMediaMode('video')}>Video</div>
              <div className={`${styles.toggleBtn} ${mediaMode === 'photo' ? styles.active : ''}`} onClick={() => setMediaMode('photo')}>Photo</div>
            </div>
            
            <div className={styles.dataGrid} style={{marginTop: 0}}>
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>Frame</span>
                <span className={styles.dataVal}>1920:1080</span>
              </div>
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>Format</span>
                <span className={styles.dataVal}>MP4</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM-CENTER: MULTI-AGENT MANAGEMENT */}
        <div className={`${styles.panel} ${styles.agentsPanel}`}>
          <div className={styles.panelHeader}>Multi-Agent Management</div>
          <div className={styles.agentList}>
            {mockAgents.map((agent) => (
              <div key={agent.id} className={styles.agentRow}>
                <div className={styles.agentInfo}>
                  <div className={styles.agentIcon} style={{backgroundColor: agent.color}}></div>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span className={styles.agentName}>{agent.id}</span>
                    <span className={styles.agentTask}>{agent.task}</span>
                  </div>
                </div>
                <div className={styles.agentStatus} style={{color: agent.color}}>
                  {agent.status}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
