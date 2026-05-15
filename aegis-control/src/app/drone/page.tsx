'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';

export default function DronePage() {
  // Flight Parameters
  const [maxAltitude, setMaxAltitude] = useState(50);
  const [maxSpeed, setMaxSpeed] = useState(8);
  const [rthAltitude, setRthAltitude] = useState(30);
  const [geofence, setGeofence] = useState(500);
  const [lowBattAction, setLowBattAction] = useState('RTL');
  const [lowBattThreshold, setLowBattThreshold] = useState(20);
  const [lostCommsTimeout, setLostCommsTimeout] = useState(10);
  const [lostCommsAction, setLostCommsAction] = useState('RTL');
  const [inspectSpeed, setInspectSpeed] = useState(1.5);

  // Camera Sync
  const [triggerSource, setTriggerSource] = useState('Time interval');
  const [minInterval, setMinInterval] = useState(6);
  const [autoFocus, setAutoFocus] = useState(true);
  const [hdr, setHdr] = useState(false);
  const [gpsAcc, setGpsAcc] = useState('3D Fix');

  // Pre-arm checks
  const [checks, setChecks] = useState<any[]>([]);
  const [checksReady, setChecksReady] = useState(false);
  const [checksFails, setChecksFails] = useState(0);
  const [isRunningChecks, setIsRunningChecks] = useState(false);

  // Presets
  const [gridSpacing, setGridSpacing] = useState(10);
  const [gridAlt, setGridAlt] = useState(30);
  const [orbitRad, setOrbitRad] = useState(15);
  const [orbitAlt, setOrbitAlt] = useState(20);
  const [facadeW, setFacadeW] = useState(30);
  const [facadeH, setFacadeH] = useState(40);
  const [facadeStand, setFacadeStand] = useState(5);
  const [toast, setToast] = useState('');

  // Logs
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    runPrearmChecks();
  }, []);

  const runPrearmChecks = async () => {
    setIsRunningChecks(true);
    try {
      const res = await fetch('/api/drone/prearm-check');
      const data = await res.json();
      setChecks(data.checks || []);
      setChecksReady(data.ready);
      setChecksFails(data.fails);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunningChecks(false);
    }
  };

  const handleSaveSettings = async () => {
    const config = { maxAltitude, maxSpeed, rthAltitude, geofence, lowBattAction, lowBattThreshold, lostCommsTimeout, lostCommsAction, inspectSpeed, triggerSource, minInterval, autoFocus, hdr, gpsAcc };
    try {
      await fetch('/api/drone/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      showToastMsg('Settings saved to drone.json');
    } catch (err) {
      console.error(err);
    }
  };

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleUsePreset = (name: string, payload: any) => {
    localStorage.setItem('aegis_mission_preset', JSON.stringify({ name, payload }));
    showToastMsg('Mission preset saved — arm drone to begin');
  };

  const fetchLogs = async () => {
    setShowLogs(!showLogs);
    if (!showLogs) {
      const res = await fetch('/api/drone/logs');
      const data = await res.json();
      setLogs(data.logs || []);
    }
  };

  const ControlRow = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #30363d' }}>
      <span style={{ fontSize: '0.875rem', color: '#c9d1d9' }}>{label}</span>
      <div style={{ width: '50%', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
        {children}
      </div>
    </div>
  );

  return (
    <PageShell title="Drone Settings" backHref="/">
      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem', fontFamily: 'system-ui', color: '#c9d1d9' }}>
        
        {/* Subtitle simulation */}
        <div style={{ fontSize: '0.875rem', color: '#8b949e', marginTop: '-1.5rem', marginBottom: '2rem' }}>DHMR-32000 configuration</div>

        {toast && (
          <div style={{ position: 'fixed', top: '1rem', right: '1rem', backgroundColor: '#238636', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 'bold', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', animation: 'fadeIn 0.3s' }}>
            {toast}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: Flight Parameters */}
          <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #30363d', backgroundColor: '#0d1117' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Flight parameters</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <ControlRow label="Max altitude">
                <input type="number" min="5" max="120" value={maxAltitude} onChange={e => setMaxAltitude(Number(e.target.value))} style={{ width: '80px', padding: '0.5rem', backgroundColor: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem' }} /> <span style={{ fontSize: '0.75rem', color: '#8b949e' }}>m</span>
              </ControlRow>
              <ControlRow label="Max speed">
                <input type="range" min="1" max="15" value={maxSpeed} onChange={e => setMaxSpeed(Number(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: '0.75rem', color: '#8b949e', width: '40px', textAlign: 'right' }}>{maxSpeed} m/s</span>
              </ControlRow>
              <ControlRow label="Return-to-home altitude">
                <input type="number" value={rthAltitude} onChange={e => setRthAltitude(Number(e.target.value))} style={{ width: '80px', padding: '0.5rem', backgroundColor: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem' }} /> <span style={{ fontSize: '0.75rem', color: '#8b949e' }}>m</span>
              </ControlRow>
              <ControlRow label="Geofence radius">
                <input type="number" value={geofence} onChange={e => setGeofence(Number(e.target.value))} style={{ width: '80px', padding: '0.5rem', backgroundColor: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem' }} /> <span style={{ fontSize: '0.75rem', color: '#8b949e' }}>m</span>
              </ControlRow>
              <ControlRow label="Low battery action">
                <select value={lowBattAction} onChange={e => setLowBattAction(e.target.value)} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem' }}>
                  <option>Land</option><option>RTL</option><option>Continue</option>
                </select>
              </ControlRow>
              <ControlRow label="Low battery threshold">
                <input type="range" min="10" max="30" value={lowBattThreshold} onChange={e => setLowBattThreshold(Number(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: '0.75rem', color: '#8b949e', width: '40px', textAlign: 'right' }}>{lowBattThreshold}%</span>
              </ControlRow>
              <ControlRow label="Lost comms timeout">
                <input type="range" min="3" max="30" value={lostCommsTimeout} onChange={e => setLostCommsTimeout(Number(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: '0.75rem', color: '#8b949e', width: '40px', textAlign: 'right' }}>{lostCommsTimeout}s</span>
              </ControlRow>
              <ControlRow label="Lost comms action">
                <select value={lostCommsAction} onChange={e => setLostCommsAction(e.target.value)} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem' }}>
                  <option>Hover</option><option>RTL</option><option>Land</option>
                </select>
              </ControlRow>
              <ControlRow label="Inspection mode speed">
                <input type="range" min="0.5" max="3" step="0.1" value={inspectSpeed} onChange={e => setInspectSpeed(Number(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: '0.75rem', color: '#8b949e', width: '40px', textAlign: 'right' }}>{inspectSpeed} m/s</span>
              </ControlRow>

              <h3 style={{ fontSize: '1rem', marginTop: '2rem', marginBottom: '1rem', color: '#8b949e' }}>Camera-drone sync settings</h3>
              <ControlRow label="Trigger source">
                <select value={triggerSource} onChange={e => setTriggerSource(e.target.value)} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem' }}>
                  <option>Time interval</option><option>GPS waypoint</option><option>Manual</option>
                </select>
              </ControlRow>
              <ControlRow label="Min capture interval">
                <input type="range" min="1" max="30" value={minInterval} onChange={e => setMinInterval(Number(e.target.value))} style={{ flex: 1 }} disabled={triggerSource !== 'Time interval'} />
                <span style={{ fontSize: '0.75rem', color: '#8b949e', width: '40px', textAlign: 'right' }}>{minInterval}s</span>
              </ControlRow>
              <ControlRow label="Auto-focus mode">
                <input type="checkbox" checked={autoFocus} onChange={e => setAutoFocus(e.target.checked)} />
              </ControlRow>
              <ControlRow label="HDR capture">
                <input type="checkbox" checked={hdr} onChange={e => setHdr(e.target.checked)} />
              </ControlRow>
              <ControlRow label="GPS accuracy required">
                <select value={gpsAcc} onChange={e => setGpsAcc(e.target.value)} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem' }}>
                  <option>2D Fix</option><option>3D Fix</option><option>RTK Fix</option>
                </select>
              </ControlRow>

              <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                <button onClick={handleSaveSettings} style={{ padding: '0.75rem 2rem', backgroundColor: '#238636', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 'bold' }}>Save Parameters</button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* CARD 1: Pre-arm checklist */}
            <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '0.5rem', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #30363d', backgroundColor: '#0d1117', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Pre-arm checklist</h2>
                <button onClick={runPrearmChecks} disabled={isRunningChecks} style={{ background: 'none', border: 'none', color: '#58a6ff', cursor: 'pointer', fontSize: '0.875rem' }}>{isRunningChecks ? 'Checking...' : '↻ Re-run'}</button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {checks.map(c => {
                    const color = c.status === 'pass' ? '#22c55e' : c.status === 'warn' ? '#eab308' : '#ef4444';
                    return (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                          <span style={{ color: '#8b949e' }}>{c.label}</span>
                        </div>
                        <span style={{ fontWeight: 'bold', color: color }}>{c.value} {c.status === 'pass' && '✓'}</span>
                      </div>
                    );
                  })}
                </div>
                
                {checksReady ? (
                  <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', color: '#22c55e', padding: '0.75rem', borderRadius: '0.375rem', textAlign: 'center', fontWeight: 'bold' }}>
                    READY TO ARM
                  </div>
                ) : (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.75rem', borderRadius: '0.375rem', textAlign: 'center', fontWeight: 'bold' }}>
                    CANNOT ARM — {checksFails} issues
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2: Mission presets */}
            <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '0.5rem', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #30363d', backgroundColor: '#0d1117' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Mission presets</h2>
              </div>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                <div style={{ border: '1px solid #30363d', borderRadius: '0.375rem', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#58a6ff' }}>⊞ Grid survey</h4>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <div><label style={{ fontSize: '0.7rem', color: '#8b949e' }}>Spacing (m)</label><input type="number" value={gridSpacing} onChange={e => setGridSpacing(Number(e.target.value))} style={{ width: '100%', padding: '0.25rem', backgroundColor: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem' }} /></div>
                    <div><label style={{ fontSize: '0.7rem', color: '#8b949e' }}>Altitude (m)</label><input type="number" value={gridAlt} onChange={e => setGridAlt(Number(e.target.value))} style={{ width: '100%', padding: '0.25rem', backgroundColor: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem' }} /></div>
                  </div>
                  <button onClick={() => handleUsePreset('Grid Survey', { spacing: gridSpacing, alt: gridAlt })} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#21262d', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}>Use this mission</button>
                </div>

                <div style={{ border: '1px solid #30363d', borderRadius: '0.375rem', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#58a6ff' }}>⭕ Perimeter orbit</h4>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <div><label style={{ fontSize: '0.7rem', color: '#8b949e' }}>Radius (m)</label><input type="number" value={orbitRad} onChange={e => setOrbitRad(Number(e.target.value))} style={{ width: '100%', padding: '0.25rem', backgroundColor: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem' }} /></div>
                    <div><label style={{ fontSize: '0.7rem', color: '#8b949e' }}>Altitude (m)</label><input type="number" value={orbitAlt} onChange={e => setOrbitAlt(Number(e.target.value))} style={{ width: '100%', padding: '0.25rem', backgroundColor: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem' }} /></div>
                  </div>
                  <button onClick={() => handleUsePreset('Perimeter Orbit', { radius: orbitRad, alt: orbitAlt })} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#21262d', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}>Use this mission</button>
                </div>

                <div style={{ border: '1px solid #30363d', borderRadius: '0.375rem', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#58a6ff' }}>🏢 Facade scan</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div><label style={{ fontSize: '0.7rem', color: '#8b949e' }}>Width (m)</label><input type="number" value={facadeW} onChange={e => setFacadeW(Number(e.target.value))} style={{ width: '100%', padding: '0.25rem', backgroundColor: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem' }} /></div>
                    <div><label style={{ fontSize: '0.7rem', color: '#8b949e' }}>Height (m)</label><input type="number" value={facadeH} onChange={e => setFacadeH(Number(e.target.value))} style={{ width: '100%', padding: '0.25rem', backgroundColor: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem' }} /></div>
                    <div><label style={{ fontSize: '0.7rem', color: '#8b949e' }}>Standoff (m)</label><input type="number" value={facadeStand} onChange={e => setFacadeStand(Number(e.target.value))} style={{ width: '100%', padding: '0.25rem', backgroundColor: '#0d1117', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem' }} /></div>
                  </div>
                  <button onClick={() => handleUsePreset('Facade Scan', { w: facadeW, h: facadeH, stand: facadeStand })} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#21262d', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}>Use this mission</button>
                </div>

                <div style={{ border: '1px dashed #30363d', borderRadius: '0.375rem', padding: '1rem', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#8b949e' }}>Manual waypoints</h4>
                  <a href="/map" style={{ display: 'inline-block', width: '100%', padding: '0.5rem', backgroundColor: 'transparent', color: '#58a6ff', border: '1px solid #30363d', borderRadius: '0.25rem', textDecoration: 'none', fontSize: '0.875rem' }}>Open in Mission Planner ↗</a>
                </div>

              </div>
            </div>
            
          </div>
        </div>

        {/* BOTTOM CARD: Drone Info */}
        <div style={{ marginTop: '1.5rem', backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '0.5rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #30363d', backgroundColor: '#0d1117', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Drone Information</h2>
            <button onClick={fetchLogs} style={{ padding: '0.5rem 1rem', backgroundColor: '#21262d', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}>{showLogs ? 'Hide Logs' : 'Download flight logs'}</button>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem' }}>
               <div><div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase' }}>Firmware version</div><div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>ArduCopter 4.3.0</div></div>
               <div><div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase' }}>Autopilot type</div><div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Pixhawk 6C</div></div>
               <div><div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase' }}>Frame type</div><div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Quadrotor</div></div>
               <div><div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase' }}>Serial number</div><div style={{ fontSize: '1.1rem', fontWeight: 'bold', fontFamily: 'monospace' }}>DHMR-32000-XYZ</div></div>
               <div><div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase' }}>Last calibration</div><div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>2026-05-10</div></div>
            </div>

            {showLogs && (
              <div style={{ marginTop: '2rem', borderTop: '1px solid #30363d', paddingTop: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0' }}>Available DataFlash Logs (.bin)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {logs.map((log, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '0.375rem' }}>
                      <div style={{ display: 'flex', gap: '2rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#58a6ff' }}>{log.name}</span>
                        <span style={{ color: '#8b949e' }}>{log.date}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.875rem', color: '#8b949e' }}>{log.size}</span>
                        <button style={{ padding: '0.25rem 0.75rem', backgroundColor: '#21262d', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}>↓ Download</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </PageShell>
  );
}
