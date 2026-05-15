'use client';

import { useEffect, useState, useRef } from 'react';
import styles from './live.module.css';
import ArtificialHorizon from '@/components/ArtificialHorizon';
import Compass from '@/components/Compass';
import CameraWizard, { CameraConfig } from '@/components/CameraWizard';

// Simulation constants
const DEMO_DURATION = 90; // seconds
const START_LAT = 37.7749;
const START_LON = -122.4194;

function generateDemoTelemetry(timeSec: number) {
  const battery_remaining = Math.max(72, 100 - (timeSec / DEMO_DURATION) * 28);
  const voltage_battery = 16.8 - (1 - battery_remaining / 100) * 2.0;
  
  let alt = 0;
  let climb = 0;
  if (timeSec < 15) {
    alt = (timeSec / 15) * 45;
    climb = 3.0;
  } else if (timeSec < 75) {
    alt = 45 + Math.sin(timeSec * 2) * 0.5;
    climb = Math.cos(timeSec * 2) * 1.0;
  } else if (timeSec <= 90) {
    alt = 45 - ((timeSec - 75) / 15) * 45;
    alt = Math.max(0, alt);
    climb = -3.0;
  }
  
  let groundspeed = 0;
  if (timeSec > 5 && timeSec < 15) groundspeed = 5;
  else if (timeSec >= 15 && timeSec < 75) groundspeed = 2;
  else if (timeSec >= 75 && timeSec < 85) groundspeed = 5;
  else if (timeSec >= 85) groundspeed = 0.5;
  
  let lat = START_LAT;
  let lon = START_LON;
  let heading = 0;
  
  if (timeSec >= 15 && timeSec < 75) {
    const legTime = timeSec - 15;
    const legIndex = Math.floor(legTime / 15);
    const legProgress = (legTime % 15) / 15;
    const meterOffset = 1 / 111111;
    const legDist = 200 * meterOffset;
    const stepSide = 50 * meterOffset;
    
    lon = START_LON + legIndex * stepSide;
    if (legIndex % 2 === 0) {
      lat = START_LAT + legProgress * legDist;
      heading = 0;
    } else {
      lat = START_LAT + legDist - (legProgress * legDist);
      heading = 180;
    }
  }

  const roll = (Math.sin(timeSec * 3) * 3 + (Math.random() - 0.5) * 1) * (Math.PI / 180);
  const pitch = (Math.cos(timeSec * 2) * 2 + (Math.random() - 0.5) * 1) * (Math.PI / 180);
  const yaw = heading * (Math.PI / 180);

  let mode = 'GUIDED';
  if (timeSec >= 5 && timeSec < 15) mode = 'AUTO';
  else if (timeSec >= 15 && timeSec < 75) mode = 'LOITER';
  else if (timeSec >= 75) mode = 'RTL';

  return {
    HEARTBEAT: { base_mode: 81, system_status: 4, autopilot: 3, custom_mode: mode },
    GLOBAL_POSITION_INT: { lat, lon, alt, relative_alt: alt, vx: groundspeed * 100, vy: 0, vz: climb * 100 },
    ATTITUDE: { roll, pitch, yaw, rollspeed: 0, pitchspeed: 0 },
    GPS_RAW_INT: { fix_type: 3, satellites_visible: 14, eph: 1.2 },
    SYS_STATUS: { battery_remaining: Math.round(battery_remaining), voltage_battery: Math.round(voltage_battery * 1000), current_battery: 1500 },
    VFR_HUD: { airspeed: groundspeed, groundspeed, heading, throttle: alt > 0 ? 45 : 0, alt, climb }
  };
}

export default function LivePage() {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [lastPacketTime, setLastPacketTime] = useState<Date | null>(null);
  
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoTime, setDemoTime] = useState(0);
  
  const [cameraConfig, setCameraConfig] = useState<CameraConfig | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Capture System State
  const [captureInterval, setCaptureInterval] = useState(6);
  const [isCapturing, setIsCapturing] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [statusLogs, setStatusLogs] = useState<{msg: string, type: string}[]>([]);
  
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const captureTimerRef = useRef<NodeJS.Timeout>();
  const frameCountRef = useRef(0);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setStatusLogs(prev => [{ msg: `[${time}] ${msg}`, type }, ...prev].slice(0, 50));
  };

  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  useEffect(() => {
    const defectSource = new EventSource('/api/events/defects');
    defectSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'CRITICAL_DEFECT') {
          playBeep();
          addLog(`CRITICAL DEFECT DETECTED: ${data.defects[0]?.description}`, 'error');
          window.dispatchEvent(new CustomEvent('defect-located', {
            detail: { lat: data.gps.lat, lon: data.gps.lon }
          }));
          alert(`CRITICAL DEFECT DETECTED!\nType: ${data.defects[0]?.type}\nLoc: ${data.defects[0]?.location}`);
        }
      } catch (e) { }
    };
    return () => defectSource.close();
  }, []);

  useEffect(() => {
    const savedDemo = sessionStorage.getItem('demoTime');
    if (savedDemo) {
      setDemoTime(parseFloat(savedDemo));
      setIsDemoMode(true);
    }
    const savedCam = localStorage.getItem('aegis_picam_config');
    if (savedCam) {
      setCameraConfig(JSON.parse(savedCam));
    }
    addLog('Dashboard initialized.', 'info');
  }, []);

  useEffect(() => {
    if (isDemoMode) return;

    const eventSource = new EventSource('/api/mavlink/stream');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setTelemetry((prev: any) => ({ ...prev, [data.type]: data }));
        setLastPacketTime(new Date());
      } catch (e) {
        console.error("Error parsing telemetry data", e);
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [isDemoMode]);

  useEffect(() => {
    if (!isDemoMode || demoTime >= DEMO_DURATION) return;

    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = (time - previousTimeRef.current) / 1000;
        setDemoTime((prev) => {
          const newTime = Math.min(prev + deltaTime, DEMO_DURATION);
          sessionStorage.setItem('demoTime', newTime.toString());
          return newTime;
        });
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isDemoMode, demoTime]);

  useEffect(() => {
    if (isDemoMode) {
      setTelemetry(generateDemoTelemetry(demoTime));
      setLastPacketTime(new Date());
    }
  }, [demoTime, isDemoMode]);

  // Capture Loop
  useEffect(() => {
    if (isCapturing) {
      frameCountRef.current = 0;
      setFrameCount(0);
      
      const captureFrame = async () => {
        frameCountRef.current += 1;
        const f = frameCountRef.current;
        setFrameCount(f);
        
        try {
          const res = await fetch('/api/capture/frame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pylonId: 'pylon_A3', // default test target
              interval: captureInterval,
              timestamp: Date.now(),
              cameraConfig: JSON.parse(localStorage.getItem('aegis_picam_config') || '{}'),
              frameIndex: f
            })
          });
          const data = await res.json();
          if (data.success) {
            addLog(`Frame captured — pylon_A3 — GPS ${data.gps.lat.toFixed(4)}, ${data.gps.lon.toFixed(4)}`, 'success');
          } else {
            addLog(`Frame failed: ${data.error}`, 'error');
          }
        } catch (err: any) {
          addLog(`Capture error: ${err.message}`, 'error');
        }
      };
      
      captureFrame(); // initial capture immediately
      captureTimerRef.current = setInterval(captureFrame, captureInterval * 1000);
      
      return () => {
        if (captureTimerRef.current) clearInterval(captureTimerRef.current);
      };
    }
  }, [isCapturing, captureInterval]);

  const toggleDemoMode = () => {
    if (!isDemoMode) {
      setDemoTime(0);
      sessionStorage.setItem('demoTime', '0');
    } else {
      sessionStorage.removeItem('demoTime');
      setTelemetry(null);
    }
    setIsDemoMode(!isDemoMode);
  };

  const skipToLanding = () => {
    setDemoTime(75);
    sessionStorage.setItem('demoTime', '75');
  };

  const handleConnectCamera = (config: CameraConfig) => {
    setCameraConfig(config);
    setIsWizardOpen(false);
    addLog(`Connected to camera via ${config.method}`, 'success');
  };

  const handleDisconnectCamera = () => {
    setCameraConfig(null);
    localStorage.removeItem('aegis_picam_config');
    addLog('Camera disconnected', 'info');
    if (isCapturing) handleStopCapture();
  };

  const handleStartCapture = () => {
    if (!cameraConfig && !isDemoMode) {
      addLog("Cannot start capture. Pi Camera is offline.", "error");
      return;
    }
    setIsCapturing(true);
    addLog(`Started capture session with ${captureInterval}s interval`, 'info');
  };

  const handleStopCapture = async () => {
    setIsCapturing(false);
    if (captureTimerRef.current) clearInterval(captureTimerRef.current);
    
    try {
      await fetch('/api/capture/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameCount: frameCountRef.current })
      });
      addLog(`Session ended — ${frameCountRef.current} frames captured. View in Change Detection.`, 'success');
      alert(`Session ended — ${frameCountRef.current} frames captured. View in Change Detection.`);
    } catch (e) {
      addLog('Error ending session', 'error');
    }
  };

  // Removed blocking loader to allow UI to render without telemetry

  const isDemoComplete = isDemoMode && demoTime >= DEMO_DURATION;

  return (
    <div className={styles.container}>
      {isWizardOpen && (
        <CameraWizard 
          onClose={() => setIsWizardOpen(false)} 
          onConnect={handleConnectCamera} 
        />
      )}

      {isDemoMode && (
        <div className={styles.demoBanner}>
          <span>DEMO MODE ACTIVE</span>
          <div className={styles.progressContainer}>
            <div className={styles.progressBar} style={{ width: `${(demoTime / DEMO_DURATION) * 100}%` }}></div>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/" className={styles.demoToggle} style={{ textDecoration: 'none', backgroundColor: '#334155' }}>
            &larr; Dashboard
          </a>
          <h1 className={styles.title}>Live Flight Telemetry</h1>
        </div>
        <div className={styles.headerControls}>
          {lastPacketTime && (
            <div className={styles.timestamp}>
              Last packet: {lastPacketTime.toLocaleTimeString()}
            </div>
          )}
          <button onClick={toggleDemoMode} className={`${styles.demoToggle} ${isDemoMode ? styles.demoToggleActive : ''}`}>
            {isDemoMode ? 'Exit Demo Mode' : 'Enter Demo Mode'}
          </button>
          {isDemoMode && !isDemoComplete && (
            <button onClick={skipToLanding} className={styles.skipButton}>
              Skip to landing
            </button>
          )}
        </div>
      </div>

      {/* Pi Camera Panel */}
      <div className={styles.cameraPanel}>
        <div className={styles.cameraHeader}>
          <h2 className={styles.cameraTitle}>
            Pi Camera Feed
            {cameraConfig ? (
              <span className={`${styles.badge} ${styles.badgeConnected}`}>Connected</span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeOffline}`}>Offline</span>
            )}
          </h2>
          {cameraConfig && (
            <button className={styles.disconnectBtn} onClick={handleDisconnectCamera} title="Disconnect">
              &times;
            </button>
          )}
        </div>
        <div className={styles.cameraBody}>
          {isCapturing && (
            <div className={styles.frameBadge}>FRAME #{frameCount}</div>
          )}
          {cameraConfig || isDemoMode ? (
            <img 
              src={`/api/picam/stream?ip=${cameraConfig?.ip || '127.0.0.1'}&port=${cameraConfig?.port || '5001'}&t=${Date.now()}`} 
              alt="Live Stream" 
              className={styles.cameraStream} 
              style={{
                transform: `
                  ${cameraConfig?.orientation === 'Flip Horizontal' ? 'scaleX(-1)' : ''}
                  ${cameraConfig?.orientation === 'Rotate 180' ? 'rotate(180deg)' : ''}
                `
              }}
              onError={(e) => {
                if (isDemoMode) {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" fill="%236b7280" font-family="sans-serif" font-size="24" text-anchor="middle">Demo Camera Feed (Placeholder)</text></svg>';
                } else {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" fill="%23000"/><text x="50%" y="50%" fill="%236b7280" font-family="sans-serif" font-size="24" text-anchor="middle">Stream Interrupted</text></svg>';
                }
              }}
            />
          ) : (
            <div className={styles.offlineState}>
              <p>PI CAMERA OFFLINE</p>
              <button className={styles.connectBtn} onClick={() => setIsWizardOpen(true)}>
                Connect to Pi
              </button>
            </div>
          )}
        </div>
        
        {/* Capture Controls Footer */}
        <div className={styles.captureControls}>
          <div className={styles.captureSlider}>
            <label style={{ color: '#d1d5db', fontSize: '0.875rem' }}>Capture Interval: {captureInterval}s</label>
            <input 
              type="range" 
              min="2" 
              max="60" 
              step="2" 
              value={captureInterval} 
              onChange={e => setCaptureInterval(parseInt(e.target.value))}
              disabled={isCapturing}
              style={{ flex: 1 }}
            />
          </div>
          {!isCapturing ? (
            <button className={styles.captureBtn} onClick={handleStartCapture}>Start Capture</button>
          ) : (
            <button className={`${styles.captureBtn} ${styles.captureBtnStop}`} onClick={handleStopCapture}>Stop Capture</button>
          )}
        </div>
      </div>

      {/* Status Log Panel */}
      <div className={styles.statusLogPanel}>
        <h3 className={styles.statusLogTitle}>STATUS LOG</h3>
        {statusLogs.length === 0 ? (
          <div style={{ color: '#6b7280', fontStyle: 'italic' }}>System idle.</div>
        ) : (
          statusLogs.map((log, i) => (
            <div key={i} className={`${styles.logEntry} ${log.type === 'success' ? styles.logSuccess : log.type === 'error' ? styles.logError : ''}`}>
              {log.msg}
            </div>
          ))
        )}
      </div>

      {isDemoComplete ? (
        <div className={styles.demoCompleteCard}>
          <h2>Demo complete.</h2>
          <p>Connect your Pixhawk to see live data.</p>
          <button onClick={toggleDemoMode} className={styles.demoToggle}>Exit Demo Mode</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {/* Heartbeat Card */}
          <div className={styles.card}>
            <h2 className={`${styles.cardTitle} ${styles.heartbeatTitle}`}>Heartbeat</h2>
            {telemetry?.HEARTBEAT ? (
              <div>
                <p className={styles.dataRow}><span className={styles.label}>Mode:</span> {telemetry.HEARTBEAT.custom_mode || telemetry.HEARTBEAT.base_mode}</p>
                <p className={styles.dataRow}><span className={styles.label}>System Status:</span> {telemetry.HEARTBEAT.system_status}</p>
                <p className={styles.dataRow}><span className={styles.label}>Autopilot:</span> {telemetry.HEARTBEAT.autopilot}</p>
              </div>
            ) : <p className={styles.waiting}>Waiting for data...</p>}
          </div>

          {/* Global Position Card */}
          <div className={styles.card}>
            <h2 className={`${styles.cardTitle} ${styles.positionTitle}`}>Position</h2>
            {telemetry?.GLOBAL_POSITION_INT ? (
              <div>
                <p className={styles.dataRow}><span className={styles.label}>Lat:</span> {telemetry.GLOBAL_POSITION_INT.lat?.toFixed(6)}</p>
                <p className={styles.dataRow}><span className={styles.label}>Lon:</span> {telemetry.GLOBAL_POSITION_INT.lon?.toFixed(6)}</p>
                <p className={styles.dataRow}><span className={styles.label}>Alt:</span> {telemetry.GLOBAL_POSITION_INT.alt?.toFixed(1)}m</p>
                <p className={styles.dataRow}><span className={styles.label}>Rel Alt:</span> {telemetry.GLOBAL_POSITION_INT.relative_alt?.toFixed(1)}m</p>
              </div>
            ) : <p className={styles.waiting}>Waiting for data...</p>}
          </div>

          {/* Attitude Card */}
          <div className={styles.card}>
            <h2 className={`${styles.cardTitle} ${styles.attitudeTitle}`}>Attitude</h2>
            {telemetry?.ATTITUDE ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ArtificialHorizon roll={telemetry.ATTITUDE.roll} pitch={telemetry.ATTITUDE.pitch} />
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '1rem', fontSize: '0.875rem' }}>
                  <p className={styles.dataRow}><span className={styles.label}>R:</span> {(telemetry.ATTITUDE.roll * (180 / Math.PI)).toFixed(1)}°</p>
                  <p className={styles.dataRow}><span className={styles.label}>P:</span> {(telemetry.ATTITUDE.pitch * (180 / Math.PI)).toFixed(1)}°</p>
                  <p className={styles.dataRow}><span className={styles.label}>Y:</span> {(telemetry.ATTITUDE.yaw * (180 / Math.PI)).toFixed(1)}°</p>
                </div>
              </div>
            ) : <p className={styles.waiting}>Waiting for data...</p>}
          </div>

          {/* GPS Raw Int Card */}
          <div className={styles.card}>
            <h2 className={`${styles.cardTitle} ${styles.gpsTitle}`}>GPS Status</h2>
            {telemetry?.GPS_RAW_INT ? (
              <div>
                <p className={styles.dataRow}><span className={styles.label}>Fix Type:</span> {telemetry.GPS_RAW_INT.fix_type}</p>
                <p className={styles.dataRow}><span className={styles.label}>Satellites:</span> {telemetry.GPS_RAW_INT.satellites_visible}</p>
                <p className={styles.dataRow}><span className={styles.label}>EPH:</span> {telemetry.GPS_RAW_INT.eph}</p>
              </div>
            ) : <p className={styles.waiting}>Waiting for data...</p>}
          </div>

          {/* System Status Card */}
          <div className={styles.card}>
            <h2 className={`${styles.cardTitle} ${styles.systemTitle}`}>System</h2>
            {telemetry?.SYS_STATUS ? (
              <div>
                <p className={styles.dataRow}><span className={styles.label}>Battery:</span> {telemetry.SYS_STATUS.battery_remaining}%</p>
                <p className={styles.dataRow}><span className={styles.label}>Voltage:</span> {(telemetry.SYS_STATUS.voltage_battery / 1000).toFixed(1)}V</p>
                <p className={styles.dataRow}><span className={styles.label}>Current:</span> {(telemetry.SYS_STATUS.current_battery / 100).toFixed(1)}A</p>
              </div>
            ) : <p className={styles.waiting}>Waiting for data...</p>}
          </div>

          {/* VFR HUD Card */}
          <div className={styles.card}>
            <h2 className={`${styles.cardTitle} ${styles.vfrTitle}`}>Compass & HUD</h2>
            {telemetry?.VFR_HUD ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Compass heading={telemetry.VFR_HUD.heading} />
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  <p className={styles.dataRow}><span className={styles.label}>AS:</span> {telemetry.VFR_HUD.airspeed?.toFixed(1)}</p>
                  <p className={styles.dataRow}><span className={styles.label}>GS:</span> {telemetry.VFR_HUD.groundspeed?.toFixed(1)}</p>
                  <p className={styles.dataRow}><span className={styles.label}>Climb:</span> {telemetry.VFR_HUD.climb?.toFixed(1)}</p>
                  <p className={styles.dataRow}><span className={styles.label}>THR:</span> {telemetry.VFR_HUD.throttle}%</p>
                </div>
              </div>
            ) : <p className={styles.waiting}>Waiting for data...</p>}
          </div>
        </div>
      )}
    </div>
  );
}
