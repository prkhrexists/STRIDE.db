'use client';

import React from 'react';

interface Props {
  heading: number; // degrees 0-359
}

export default function Compass({ heading }: Props) {
  const radius = 65;
  const cx = 80;
  const cy = 80;

  const renderTicks = () => {
    const ticks = [];
    for (let i = 0; i < 360; i += 10) {
      const isMajor = i % 30 === 0;
      const length = isMajor ? 10 : 5;
      const strokeWidth = isMajor ? 2 : 1;
      
      ticks.push(
        <line
          key={i}
          x1={cx}
          y1={cy - radius}
          x2={cx}
          y2={cy - radius + length}
          stroke="#9ca3af"
          strokeWidth={strokeWidth}
          transform={`rotate(${i} ${cx} ${cy})`}
        />
      );
    }
    return ticks;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div 
        style={{ 
          width: 160, 
          height: 160, 
          position: 'relative', 
          backgroundColor: '#1f2937', 
          borderRadius: '50%',
          border: '2px solid #374151',
          overflow: 'hidden'
        }}
      >
        <svg width="160" height="160" style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Compass Ticks */}
          {renderTicks()}
          
          {/* Cardinal Labels */}
          <text x={cx} y={20} fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">N</text>
          <text x={148} y={cy + 5} fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">E</text>
          <text x={cx} y={152} fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">S</text>
          <text x={12} y={cy + 5} fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">W</text>
          
          {/* White arrow pointing north (always up) */}
          <polygon points={`${cx},28 ${cx-6},40 ${cx+6},40`} fill="#ffffff" />

          {/* Red arrow pointing to heading */}
          <g style={{ 
            transform: `rotate(${heading}deg)`, 
            transformOrigin: `${cx}px ${cy}px`, 
            transition: 'transform 200ms ease' 
          }}>
            <line x1={cx} y1={cy} x2={cx} y2={cy - radius + 15} stroke="#ef4444" strokeWidth="2" />
            <polygon points={`${cx},${cy - radius + 5} ${cx-5},${cy - radius + 15} ${cx+5},${cy - radius + 15}`} fill="#ef4444" />
          </g>
          
          {/* Center pivot point */}
          <circle cx={cx} cy={cy} r={4} fill="#ffffff" />
        </svg>
      </div>
      <div style={{ marginTop: '0.75rem', fontSize: '1.25rem', fontWeight: 'bold', color: '#60a5fa' }}>
        {Math.round(heading)}°
      </div>
    </div>
  );
}
