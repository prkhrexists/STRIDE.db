'use client';

import React, { useState } from 'react';
import styles from './CameraWizard.module.css';

export interface CameraConfig {
  method: string;
  ip: string;
  port: string;
  serialPath: string;
  rtspUrl: string;
  resolution: string;
  quality: number;
  orientation: string;
}

interface Props {
  onClose: () => void;
  onConnect: (config: CameraConfig) => void;
}

export default function CameraWizard({ onClose, onConnect }: Props) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<CameraConfig>({
    method: 'wifi',
    ip: '192.168.1.100',
    port: '5001',
    serialPath: '/dev/ttyUSB0',
    rtspUrl: '',
    resolution: '1280x720',
    quality: 75,
    orientation: 'Normal'
  });
  
  const [pingResult, setPingResult] = useState<{success: boolean, latency?: number, error?: string} | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const updateConfig = (key: keyof CameraConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const testPing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await fetch(`/api/picam/ping?ip=${config.ip}&port=${config.port}`);
      const data = await res.json();
      setPingResult(data);
    } catch (e) {
      setPingResult({ success: false, error: 'Network error or timeout' });
    }
    setIsPinging(false);
  };

  const loadPreview = () => {
    // Bust cache with timestamp
    setPreviewUrl(`/api/picam/snapshot?ip=${config.ip}&port=${config.port}&t=${Date.now()}`);
  };

  const handleConnect = () => {
    localStorage.setItem('aegis_picam_config', JSON.stringify(config));
    onConnect(config);
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Connect to Pi Camera</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.body}>
          {step === 1 && (
            <div>
              <p className={styles.label} style={{marginBottom: '1rem'}}>Step 1: Connection Method</p>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input type="radio" checked={config.method === 'wifi'} onChange={() => updateConfig('method', 'wifi')} />
                  Wi-Fi / Same network (recommended)
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" checked={config.method === 'usb'} onChange={() => updateConfig('method', 'usb')} />
                  USB cable (direct serial)
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" checked={config.method === 'ethernet'} onChange={() => updateConfig('method', 'ethernet')} />
                  Ethernet cable
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" checked={config.method === 'rtsp'} onChange={() => updateConfig('method', 'rtsp')} />
                  RTSP stream (external)
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className={styles.label} style={{marginBottom: '1rem'}}>Step 2: Enter Credentials</p>
              
              {config.method === 'wifi' || config.method === 'ethernet' ? (
                <>
                  <div className={styles.field}>
                    <label className={styles.label}>IP Address</label>
                    <input className={styles.input} type="text" value={config.ip} onChange={e => updateConfig('ip', e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Port</label>
                    <input className={styles.input} type="text" value={config.port} onChange={e => updateConfig('port', e.target.value)} />
                  </div>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={testPing} disabled={isPinging}>
                    {isPinging ? 'Pinging...' : 'Test Connection'}
                  </button>
                  {pingResult && (
                    <div className={`${styles.pingResult} ${pingResult.success ? styles.pingSuccess : styles.pingError}`}>
                      {pingResult.success ? `Success! Latency: ${pingResult.latency}ms` : `Error: ${pingResult.error}`}
                    </div>
                  )}
                </>
              ) : config.method === 'usb' ? (
                <div className={styles.field}>
                  <label className={styles.label}>Serial Port Path</label>
                  <input className={styles.input} type="text" value={config.serialPath} onChange={e => updateConfig('serialPath', e.target.value)} placeholder="/dev/ttyUSB0" />
                </div>
              ) : (
                <div className={styles.field}>
                  <label className={styles.label}>RTSP URL</label>
                  <input className={styles.input} type="text" value={config.rtspUrl} onChange={e => updateConfig('rtspUrl', e.target.value)} placeholder="rtsp://..." />
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <p className={styles.label} style={{marginBottom: '1rem'}}>Step 3: Stream Settings</p>
              
              <div className={styles.field}>
                <label className={styles.label}>Resolution</label>
                <select className={styles.select} value={config.resolution} onChange={e => updateConfig('resolution', e.target.value)}>
                  <option>640x480</option>
                  <option>1280x720</option>
                  <option>1920x1080</option>
                </select>
              </div>
              
              <div className={styles.field}>
                <label className={styles.label}>Quality ({config.quality})</label>
                <input type="range" min="10" max="100" value={config.quality} onChange={e => updateConfig('quality', parseInt(e.target.value))} />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Orientation</label>
                <select className={styles.select} value={config.orientation} onChange={e => updateConfig('orientation', e.target.value)}>
                  <option>Normal</option>
                  <option>Flip Horizontal</option>
                  <option>Rotate 180</option>
                </select>
              </div>

              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadPreview}>Load Preview Frame</button>
              
              <div className={styles.previewContainer}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className={styles.previewImage} onError={() => setPreviewUrl(null)} />
                ) : (
                  <span style={{color: '#6b7280', fontSize: '0.875rem'}}>No preview available</span>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <p className={styles.label} style={{marginBottom: '1rem'}}>Step 4: Confirm & Connect</p>
              <div style={{ backgroundColor: '#111827', padding: '1rem', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
                <p><strong>Method:</strong> {config.method}</p>
                <p><strong>Target:</strong> {config.method === 'rtsp' ? config.rtspUrl : config.method === 'usb' ? config.serialPath : `${config.ip}:${config.port}`}</p>
                <p><strong>Resolution:</strong> {config.resolution}</p>
                <p><strong>Quality:</strong> {config.quality}</p>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.stepIndicator}>Step {step} of 4</div>
          <div className={styles.btnGroup}>
            {step > 1 && <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handlePrev}>Back</button>}
            {step < 4 ? (
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleNext}>Next</button>
            ) : (
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleConnect}>Connect</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
