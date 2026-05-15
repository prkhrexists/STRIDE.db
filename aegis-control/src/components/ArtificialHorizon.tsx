'use client';

import React, { useEffect, useRef } from 'react';

interface Props {
  roll: number; // radians
  pitch: number; // radians
}

export default function ArtificialHorizon({ roll, pitch }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      
      // Rotate by roll
      ctx.translate(cx, cy);
      ctx.rotate(roll);
      
      // Pitch offsets vertically. 1 degree = 3px
      const pitchDeg = pitch * (180 / Math.PI);
      const pitchOffset = pitchDeg * 3;
      
      ctx.translate(0, pitchOffset);

      // Draw Sky & Ground
      ctx.fillStyle = '#1a3a5c'; // Sky
      ctx.fillRect(-width * 2, -height * 2, width * 4, height * 2);
      
      ctx.fillStyle = '#5c3a1a'; // Ground
      ctx.fillRect(-width * 2, 0, width * 4, height * 2);

      // Horizon line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-width * 2, 0);
      ctx.lineTo(width * 2, 0);
      ctx.stroke();
      
      ctx.restore();

      // Fixed UI: Roll Arc
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, cx - 15, Math.PI, 0);
      ctx.stroke();

      const ticks = [-90, -60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60, 90];
      ticks.forEach(tick => {
        ctx.save();
        ctx.rotate((tick - 90) * (Math.PI / 180));
        ctx.beginPath();
        ctx.moveTo(cx - 15, 0);
        ctx.lineTo(cx - (tick % 30 === 0 ? 25 : 20), 0);
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();

      // Fixed Orange Aircraft Symbol
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      
      // Center dot
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.stroke();
      
      // Wings
      ctx.beginPath();
      ctx.moveTo(-40, 0);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-10, 10);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(40, 0);
      ctx.lineTo(10, 0);
      ctx.lineTo(10, 10);
      ctx.stroke();
      
      ctx.restore();
    };

    // Redraw using requestAnimationFrame
    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [roll, pitch]);

  return (
    <canvas 
      ref={canvasRef} 
      width={180} 
      height={180} 
      style={{ 
        borderRadius: '50%', 
        backgroundColor: '#000', 
        display: 'block', 
        margin: '0 auto',
        border: '2px solid #374151'
      }}
    />
  );
}
