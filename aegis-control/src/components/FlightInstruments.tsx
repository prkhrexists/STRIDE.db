'use client';

import React, { useEffect, useRef } from 'react';

interface ArtificialHorizonProps {
  roll: number;   // degrees
  pitch: number;  // degrees
  size?: number;
}

export function ArtificialHorizon({ roll, pitch, size = 120 }: ArtificialHorizonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2 - 4;

    ctx.clearRect(0, 0, w, h);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Rotate for roll
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((roll * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    // Pitch offset (each degree ≈ 2px at this scale)
    const pitchPx = pitch * (r / 45);

    // Sky
    ctx.fillStyle = '#1a4a7a';
    ctx.fillRect(0, 0, w, cy + pitchPx);

    // Ground
    ctx.fillStyle = '#6b3d1a';
    ctx.fillRect(0, cy + pitchPx, w, h);

    // Horizon line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, cy + pitchPx);
    ctx.lineTo(w, cy + pitchPx);
    ctx.stroke();

    // Pitch ladder
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.font = `${Math.round(r * 0.12)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'right';

    for (let deg = -30; deg <= 30; deg += 5) {
      if (deg === 0) continue;
      const y = cy + pitchPx - deg * (r / 45);
      const len = deg % 10 === 0 ? r * 0.35 : r * 0.2;
      ctx.beginPath();
      ctx.moveTo(cx - len, y);
      ctx.lineTo(cx + len, y);
      ctx.stroke();
      if (deg % 10 === 0) {
        ctx.fillText(`${deg}`, cx - len - 3, y + 4);
      }
    }

    ctx.restore();

    // Fixed reference — aircraft symbol
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    // Left wing
    ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy); ctx.lineTo(cx - r * 0.15, cy); ctx.stroke();
    // Right wing
    ctx.beginPath(); ctx.moveTo(cx + r * 0.15, cy); ctx.lineTo(cx + r * 0.5, cy); ctx.stroke();
    // Center dot
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700'; ctx.fill();

    // Roll arc indicator
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 6, -Math.PI * 0.7, -Math.PI * 0.3);
    ctx.stroke();

    // Roll pointer
    const rollRad = (roll * Math.PI) / 180;
    const ptr = r - 6;
    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const px = cx + ptr * Math.sin(rollRad - Math.PI / 2 + Math.PI);
    const py = cy + ptr * Math.cos(rollRad - Math.PI / 2 + Math.PI);
    ctx.moveTo(px, py);
    ctx.lineTo(cx + (ptr - 8) * Math.sin(rollRad - Math.PI / 2 + Math.PI), cy + (ptr - 8) * Math.cos(rollRad - Math.PI / 2 + Math.PI));
    ctx.stroke();

    // Border
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(59,130,246,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [roll, pitch]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ borderRadius: '50%', display: 'block' }}
    />
  );
}

interface CompassProps {
  heading: number;
  size?: number;
}

export function CompassWidget({ heading, size = 100 }: CompassProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2 - 4;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.strokeStyle = 'rgba(59,130,246,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Rotate for heading
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-heading * Math.PI) / 180);

    // Cardinal directions
    const cardinals = [
      { label: 'N', angle: 0, color: '#EF4444' },
      { label: 'E', angle: 90, color: '#9CA3AF' },
      { label: 'S', angle: 180, color: '#9CA3AF' },
      { label: 'W', angle: 270, color: '#9CA3AF' },
    ];

    ctx.font = `bold ${Math.round(r * 0.22)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    cardinals.forEach(({ label, angle, color }) => {
      const rad = (angle * Math.PI) / 180;
      const tx = Math.sin(rad) * (r * 0.72);
      const ty = -Math.cos(rad) * (r * 0.72);
      ctx.fillStyle = color;
      ctx.fillText(label, tx, ty);
    });

    // Tick marks
    for (let i = 0; i < 36; i++) {
      const rad = (i * 10 * Math.PI) / 180;
      const inner = i % 3 === 0 ? r * 0.82 : r * 0.88;
      const outer = r * 0.95;
      const sx = Math.sin(rad) * inner;
      const sy = -Math.cos(rad) * inner;
      const ex = Math.sin(rad) * outer;
      const ey = -Math.cos(rad) * outer;
      ctx.strokeStyle = i % 9 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = i % 9 === 0 ? 1.5 : 0.8;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    }

    ctx.restore();

    // Fixed heading pointer (always points up)
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.52);
    ctx.lineTo(cx - 5, cy - r * 0.38);
    ctx.lineTo(cx + 5, cy - r * 0.38);
    ctx.closePath();
    ctx.fillStyle = '#3B82F6';
    ctx.fill();

    // Heading text
    ctx.font = `bold ${Math.round(r * 0.26)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F3F4F6';
    ctx.fillText(`${Math.round(heading).toString().padStart(3,'0')}°`, cx, cy);

  }, [heading]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: 'block' }}
    />
  );
}
