'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';

type Tab = 'picam' | 'drone';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('picam');

  useEffect(() => {
    if (window.location.hash === '#drone') {
      setActiveTab('drone');
    }
  }, []);

  // --- PiCam State ---
  const [picamConnMethod, setPicamConnMethod] = useState('wifi');
  const [picamIp, setPicamIp] = useState('192.168.1.100');
  const [picamPort, setPicamPort] = useState('5001');
  const [picamPath, setPicamPath] = useState('/dev/ttyUSB0');
  const [picamRtsp, setPicamRtsp] = useState('rtsp://192.168.1.100:8554/stream');
  
  const [picamRes, setPicamRes] = useState('1920x1080');
  const [picamQuality, setPicamQuality] = useState(75);
  const [picamFlip, setPicamFlip] = useState(false);
  const [picamFormat, setPicamFormat] = useState('JPEG');

  const [picamAutoCap, setPicamAutoCap] = useState(false);
  const [picamInterval, setPicamInterval] = useState(10);
  const [picamGps, setPicamGps] = useState(true);
  const [picamMaxFrames, setPicamMaxFrames] = useState(200);

  const [picamStatus, setPicamStatus] = useState<'OFFLINE' | 'TESTING' | 'CONNECTED'>('OFFLINE');
  const [picamLastSaved, setPicamLastSaved] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // --- Drone State ---
  const [droneConnType, setDroneConnType] = useState('udp');
  const [droneHost, setDroneHost] = useState('0.0.0.0');
  const [dronePort, setDronePort] = useState('14550');
  const [dronePath, setDronePath] = useState('/dev/ttyACM0');
  const [droneBaud, setDroneBaud] = useState('115200');

  const [droneName, setDroneName] = useState('DHMR-32000');
  const [droneAutopilot, setDroneAutopilot] = useState('ArduCopter');
  const [droneFrame, setDroneFrame] = useState('Quad');

  const [droneRate, setDroneRate] = useState('5Hz');
  const [droneRecord, setDroneRecord] = useState(true);
  const [droneGeofence, setDroneGeofence] = useState(50);

  const [droneStatus, setDroneStatus] = useState<'OFFLINE' | 'SEARCHING' | 'CONNECTED'>('OFFLINE');
  const [droneSysInfo, setDroneSysInfo] = useState('');
  const [droneLastSaved, setDroneLastSaved] = useState<string | null>(null);

  const [prevDroneConnType, setPrevDroneConnType] = useState('udp'); // to track changes requiring restart

  // --- Handlers ---
  const testPiCam = async () => {
    setPicamStatus('TESTING');
    try {
      const res = await fetch(`/api/picam/ping?ip=${picamConnMethod === 'wifi' || picamConnMethod === 'ethernet' ? picamIp : 'local'}`);
      if (res.ok) setPicamStatus('CONNECTED');
      else setPicamStatus('OFFLINE');
    } catch {
      setPicamStatus('OFFLINE');
    }
  };

  const savePiCam = async () => {
    const config = { method: picamConnMethod, ip: picamIp, port: picamPort, path: picamPath, rtsp: picamRtsp, res: picamRes, quality: picamQuality, flip: picamFlip, format: picamFormat, autoCap: picamAutoCap, interval: picamInterval, gps: picamGps, maxFrames: picamMaxFrames };
    const res = await fetch('/api/settings/save', { method: 'POST', body: JSON.stringify({ type: 'picam', config }) });
    const data = await res.json();
    if (data.success) setPicamLastSaved(data.timestamp);
  };

  const testDrone = async () => {
    setDroneStatus('SEARCHING');
    try {
      const res = await fetch('/api/mavlink/test', { method: 'POST' });
      const data = await res.json();
      if (data.connected) {
        setDroneStatus('CONNECTED');
        setDroneSysInfo(`${data.autopilot} (${data.firmware})`);
      } else {
        setDroneStatus('OFFLINE');
      }
    } catch {
      setDroneStatus('OFFLINE');
    }
  };

  const saveDrone = async () => {
    const config = { type: droneConnType, host: droneHost, port: dronePort, path: dronePath, baud: droneBaud, name: droneName, autopilot: droneAutopilot, frame: droneFrame, rate: droneRate, record: droneRecord, geofence: droneGeofence };
    const res = await fetch('/api/settings/save', { method: 'POST', body: JSON.stringify({ type: 'mavlink', config }) });
    const data = await res.json();
    if (data.success) {
      setDroneLastSaved(data.timestamp);
      if (droneConnType !== prevDroneConnType) {
        await fetch('/api/mavlink/restart', { method: 'POST' });
        setPrevDroneConnType(droneConnType);
      }
    }
  };

  // --- UI Components ---
  const Input = ({ label, value, onChange, type = "text" }: any) => (
    <div style={{ flex: 1 }}>
      <label style={{ display: 'block', fontSize: '0.75rem', color: '#8b949e', marginBottom: '0.25rem' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0d1117', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '0.25rem' }} />
    </div>
  );

  const Select = ({ label, value, onChange, options }: any) => (
    <div style={{ flex: 1 }}>
      <label style={{ display: 'block', fontSize: '0.75rem', color: '#8b949e', marginBottom: '0.25rem' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0d1117', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '0.25rem' }}>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <PageShell title="Settings" backHref="/">
      <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem', fontFamily: 'system-ui', color: '#c9d1d9' }}>
        
        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', justifyContent: 'center' }}>
          <button 
            onClick={() => setActiveTab('picam')}
            style={{ padding: '0.5rem 2rem', borderRadius: '9999px', fontWeight: 'bold', cursor: 'pointer', border: 'none', backgroundColor: activeTab === 'picam' ? '#1f6feb' : '#21262d', color: activeTab === 'picam' ? 'white' : '#8b949e', transition: 'all 0.2s' }}
          >
            Pi Camera
          </button>
          <button 
            onClick={() => setActiveTab('drone')}
            style={{ padding: '0.5rem 2rem', borderRadius: '9999px', fontWeight: 'bold', cursor: 'pointer', border: 'none', backgroundColor: activeTab === 'drone' ? '#1f6feb' : '#21262d', color: activeTab === 'drone' ? 'white' : '#8b949e', transition: 'all 0.2s' }}
          >
            Drone Connection
          </button>
        </div>

        {/* TAB 1: Pi Camera */}
        {activeTab === 'picam' && (
          <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #30363d', backgroundColor: '#0d1117' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Raspberry Pi Camera</h2>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Section A: Connection Method */}
              <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#8b949e', textTransform: 'uppercase' }}>Section A: Connection Method</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { id: 'wifi', label: 'Wi-Fi (same network)' },
                    { id: 'usb', label: 'USB cable (direct)' },
                    { id: 'ethernet', label: 'Ethernet cable' },
                    { id: 'rtsp', label: 'RTSP stream URL' }
                  ].map(m => (
                    <div key={m.id} style={{ border: '1px solid #30363d', borderRadius: '0.375rem', padding: '1rem', backgroundColor: picamConnMethod === m.id ? 'rgba(31, 111, 235, 0.1)' : 'transparent' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: picamConnMethod === m.id ? 'bold' : 'normal' }}>
                        <input type="radio" name="picam_conn" checked={picamConnMethod === m.id} onChange={() => setPicamConnMethod(m.id)} />
                        {m.label}
                      </label>
                      {picamConnMethod === m.id && (
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', paddingLeft: '2rem' }}>
                          {(m.id === 'wifi' || m.id === 'ethernet') && (
                            <>
                              <Input label="IP Address" value={picamIp} onChange={setPicamIp} />
                              <Input label="Port" value={picamPort} onChange={setPicamPort} />
                              <Input label="Stream Path" value={picamPath} onChange={setPicamPath} />
                            </>
                          )}
                          {m.id === 'usb' && <Input label="Serial Port Path" value={picamPath} onChange={setPicamPath} />}
                          {m.id === 'rtsp' && <Input label="RTSP URL" value={picamRtsp} onChange={setPicamRtsp} />}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section B: Stream Settings */}
              <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#8b949e', textTransform: 'uppercase' }}>Section B: Stream Settings</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', backgroundColor: '#0d1117', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #30363d' }}>
                  <Select label="Resolution" value={picamRes} onChange={setPicamRes} options={['640x480', '1280x720', '1920x1080']} />
                  <div>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#8b949e', marginBottom: '0.25rem' }}>
                      <span>Quality</span>
                      <span>{picamQuality}%</span>
                    </label>
                    <input type="range" min="10" max="100" value={picamQuality} onChange={e => setPicamQuality(parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" id="flip" checked={picamFlip} onChange={e => setPicamFlip(e.target.checked)} />
                    <label htmlFor="flip">Flip horizontal</label>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#8b949e', marginBottom: '0.5rem' }}>Capture Format</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <label><input type="radio" name="format" checked={picamFormat === 'JPEG'} onChange={() => setPicamFormat('JPEG')} /> JPEG</label>
                      <label><input type="radio" name="format" checked={picamFormat === 'PNG'} onChange={() => setPicamFormat('PNG')} /> PNG</label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section C: Test + Connect */}
              <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#8b949e', textTransform: 'uppercase' }}>Section C: Status & Diagnostics</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', backgroundColor: '#0d1117', padding: '1.5rem', borderRadius: '0.375rem', border: '1px solid #30363d' }}>
                  <button onClick={testPiCam} style={{ padding: '0.5rem 1.5rem', backgroundColor: '#21262d', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 'bold' }}>Test Connection</button>
                  <button onClick={() => setShowPreviewModal(true)} style={{ padding: '0.5rem 1.5rem', backgroundColor: '#1f6feb', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 'bold' }}>Connect & Preview</button>
                  
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid #30363d', backgroundColor: picamStatus === 'CONNECTED' ? 'rgba(34, 197, 94, 0.1)' : picamStatus === 'OFFLINE' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: picamStatus === 'CONNECTED' ? '#22c55e' : picamStatus === 'OFFLINE' ? '#ef4444' : '#eab308', animation: picamStatus === 'TESTING' ? 'pulse 1s infinite' : 'none' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: picamStatus === 'CONNECTED' ? '#22c55e' : picamStatus === 'OFFLINE' ? '#ef4444' : '#eab308' }}>{picamStatus}</span>
                  </div>
                </div>
              </div>

              {/* Section D: Trigger Settings */}
              <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#8b949e', textTransform: 'uppercase' }}>Section D: Capture Automation</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', backgroundColor: '#0d1117', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #30363d' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="checkbox" checked={picamAutoCap} onChange={e => setPicamAutoCap(e.target.checked)} />
                      Auto-capture interval
                    </label>
                    <div style={{ paddingLeft: '1.5rem' }}>
                      <input type="range" min="2" max="60" value={picamInterval} onChange={e => setPicamInterval(parseInt(e.target.value))} disabled={!picamAutoCap} style={{ width: '100%', cursor: picamAutoCap ? 'pointer' : 'not-allowed' }} />
                      <div style={{ fontSize: '0.75rem', color: '#8b949e' }}>Every {picamInterval} seconds</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="checkbox" checked={picamGps} onChange={e => setPicamGps(e.target.checked)} />
                      Capture on GPS waypoint arrival
                    </label>
                    <Input label="Max frames per flight" type="number" value={picamMaxFrames} onChange={setPicamMaxFrames} />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #30363d', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <button onClick={savePiCam} style={{ padding: '0.75rem 2.5rem', backgroundColor: '#238636', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>Save Pi Camera Config</button>
                {picamLastSaved && <div style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: '0.5rem' }}>Last saved: {new Date(picamLastSaved).toLocaleString()}</div>}
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: Drone Connection */}
        {activeTab === 'drone' && (
          <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #30363d', backgroundColor: '#0d1117' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>MAVLink Drone</h2>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Section A: Connection Type */}
              <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#8b949e', textTransform: 'uppercase' }}>Section A: Telemetry Connection</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { id: 'udp', label: 'UDP (Pixhawk over Wi-Fi)' },
                    { id: 'tcp', label: 'TCP (direct cable)' },
                    { id: 'serial', label: 'Serial / USB' },
                    { id: 'demo', label: 'Demo mode (no hardware)' }
                  ].map(m => (
                    <div key={m.id} style={{ border: '1px solid #30363d', borderRadius: '0.375rem', padding: '1rem', backgroundColor: droneConnType === m.id ? 'rgba(31, 111, 235, 0.1)' : 'transparent' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: droneConnType === m.id ? 'bold' : 'normal' }}>
                        <input type="radio" name="drone_conn" checked={droneConnType === m.id} onChange={() => setDroneConnType(m.id)} />
                        {m.label}
                      </label>
                      {droneConnType === m.id && m.id !== 'demo' && (
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', paddingLeft: '2rem' }}>
                          {(m.id === 'udp' || m.id === 'tcp') && (
                            <>
                              <Input label="Host" value={droneHost} onChange={setDroneHost} />
                              <Input label="Port" value={dronePort} onChange={setDronePort} />
                            </>
                          )}
                          {m.id === 'serial' && (
                            <>
                              <Input label="Device Path" value={dronePath} onChange={setDronePath} />
                              <Select label="Baud Rate" value={droneBaud} onChange={setDroneBaud} options={['57600', '115200', '921600']} />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section B: Drone Profile */}
              <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#8b949e', textTransform: 'uppercase' }}>Section B: Drone Profile</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', backgroundColor: '#0d1117', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #30363d' }}>
                  <Input label="Drone Name" value={droneName} onChange={setDroneName} />
                  <Select label="Autopilot Type" value={droneAutopilot} onChange={setDroneAutopilot} options={['ArduCopter', 'ArduPlane', 'PX4']} />
                  <Select label="Frame Type" value={droneFrame} onChange={setDroneFrame} options={['Quad', 'Hex', 'Octo', 'Fixed-wing']} />
                </div>
              </div>

              {/* Section C: Status + Test */}
              <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#8b949e', textTransform: 'uppercase' }}>Section C: Link Status</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', backgroundColor: '#0d1117', padding: '1.5rem', borderRadius: '0.375rem', border: '1px solid #30363d' }}>
                  {droneConnType === 'demo' ? (
                    <button onClick={testDrone} style={{ padding: '0.5rem 1.5rem', backgroundColor: '#8957e5', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 'bold' }}>Start Demo Telemetry</button>
                  ) : (
                    <button onClick={testDrone} style={{ padding: '0.5rem 1.5rem', backgroundColor: '#21262d', color: 'white', border: '1px solid #30363d', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 'bold' }}>Test Connection</button>
                  )}
                  
                  {droneSysInfo && <div style={{ fontSize: '0.875rem', color: '#8b949e' }}>System: {droneSysInfo}</div>}

                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid #30363d', backgroundColor: droneStatus === 'CONNECTED' ? 'rgba(34, 197, 94, 0.1)' : droneStatus === 'OFFLINE' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: droneStatus === 'CONNECTED' ? '#22c55e' : droneStatus === 'OFFLINE' ? '#ef4444' : '#eab308', animation: droneStatus === 'SEARCHING' ? 'pulse 1s infinite' : 'none' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: droneStatus === 'CONNECTED' ? '#22c55e' : droneStatus === 'OFFLINE' ? '#ef4444' : '#eab308' }}>{droneStatus}</span>
                  </div>
                </div>
              </div>

              {/* Section D: Telemetry Settings */}
              <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#8b949e', textTransform: 'uppercase' }}>Section D: Telemetry Behavior</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', backgroundColor: '#0d1117', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #30363d' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Select label="Stream Update Rate" value={droneRate} onChange={setDroneRate} options={['1Hz', '5Hz', '10Hz']} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="checkbox" checked={droneRecord} onChange={e => setDroneRecord(e.target.checked)} />
                      Record telemetry to local file
                    </label>
                  </div>
                  <div>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#8b949e', marginBottom: '0.25rem' }}>
                      <span>Geofence Altitude Limit</span>
                      <span>{droneGeofence}m</span>
                    </label>
                    <input type="range" min="0" max="120" value={droneGeofence} onChange={e => setDroneGeofence(parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #30363d', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <button onClick={saveDrone} style={{ padding: '0.75rem 2.5rem', backgroundColor: '#238636', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>Save MAVLink Config</button>
                {droneLastSaved && <div style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: '0.5rem' }}>Last saved: {new Date(droneLastSaved).toLocaleString()}</div>}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#161b22', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #30363d', width: '640px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
               <h3 style={{ margin: 0 }}>Live MJPEG Stream</h3>
               <button onClick={() => setShowPreviewModal(false)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
             </div>
             <div style={{ width: '100%', height: '480px', backgroundColor: '#0d1117', border: '1px dashed #30363d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e', position: 'relative' }}>
               <img src={`/api/picam/stream?ip=${picamConnMethod === 'wifi' || picamConnMethod === 'ethernet' ? picamIp : '127.0.0.1'}&port=${picamPort}`} alt="Camera Stream" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.currentTarget.src = "https://images.unsplash.com/photo-1590492825656-9a54523fa5d9?auto=format&fit=crop&w=640&q=80"} />
               <div style={{ position: 'absolute', top: '10px', left: '10px', color: 'red', fontWeight: 'bold', textShadow: '1px 1px 2px black' }}>• LIVE REC</div>
             </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}} />
    </PageShell>
  );
}
