import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Check if real flight data exists locally, otherwise return dynamic simulated data.
  // We'll scan a hypothetical "data/flights" directory at the root.
  const dataDir = path.join(process.cwd(), 'data', 'flights');
  
  try {
    const stats = await fs.stat(dataDir);
    if (stats.isDirectory()) {
      // Logic for reading real flight data goes here in the future
      // E.g., read subdirs, parse EXIF data using piexifjs, read JSON metadata
    }
  } catch {}

  // Fallback to sophisticated simulated data for demo
  const flights = [
    { id: 'FL-001', name: 'Baseline Scan - North Tower', date: '2026-05-10T09:15:00Z', framesCount: 120, status: 'Analyzed' },
    { id: 'FL-002', name: 'Post-Storm Inspection', date: '2026-05-13T14:30:00Z', framesCount: 85, status: 'Analyzed' },
    { id: 'FL-003', name: 'Routine Sweep - Deck', date: '2026-05-15T08:00:00Z', framesCount: 156, status: 'Analyzing' },
  ];

  // Generate dynamic frames
  const zones = ['North Tower', 'South Tower', 'Main Deck', 'Support Cable', 'NW Pylon'];
  const defectTypes = ['crack', 'corrosion', 'spalling', 'none'];
  
  const generateFrames = (flightId: string, count: number, startLat: number, startLon: number) => {
    const frames = [];
    let lat = startLat;
    let lon = startLon;
    for (let i = 0; i < count; i++) {
      // Simulate drone path
      lat += (Math.random() - 0.4) * 0.0001;
      lon += (Math.random() - 0.5) * 0.0001;
      
      const hasDefect = Math.random() > 0.6;
      let type = 'none';
      let status = 'CLEAN';
      let conf = 90 + Math.random() * 9;
      let bboxes = [];
      let flagged = false;
      
      if (hasDefect) {
        type = defectTypes[Math.floor(Math.random() * 3)];
        status = Math.random() > 0.8 ? 'CRITICAL' : 'DEFECT';
        conf = 75 + Math.random() * 23;
        flagged = status === 'CRITICAL';
        bboxes.push({ x: 10 + Math.random()*60, y: 10 + Math.random()*60, w: 10 + Math.random()*15, h: 10 + Math.random()*15, type });
      }

      // Base urls for dummy images
      const imgBase = [
        '/cracks/04168eeebk3f94229020b7d905d28c43-1-_JPG.rf.b7456ec9aed620a184c515508604468c.jpg',
        '/cracks/051db2e93r6ab3306b143857cdfc0f5b_JPG.rf.f98a0392ca42febb5011b415437b7b13.jpg',
        '/cracks/0580e2947g659d6a75533e1c9c2c703b_JPG.rf.ecc450605bdf508ca1429e34580b5416.jpg',
        '/cracks/06c46c1c3k59894d6a348b4ed49a3b97_JPG.rf.c849db369eb9958b676665e1a58ffefc.jpg',
        '/cracks/0f44791f8hc5835dec0fdba80f1dd46d_JPG.rf.31149f77d5bc50f48258be6fafdbbd53.jpg',
        '/cracks/1022aacceub3c1729bcbc0519805630b_JPG.rf.de40fde27e36cfb956e4bc24fce906e9.jpg'
      ];
      
      frames.push({
        id: `${flightId}-frame-${i}`,
        flightId,
        url: imgBase[i % imgBase.length],
        prevUrl: imgBase[(i+1) % imgBase.length], // For SSIM compare
        status,
        type,
        conf: parseFloat(conf.toFixed(1)),
        lat,
        lon,
        ts: Date.now() - (count - i) * 10000,
        bboxes,
        metadata: { zone: zones[Math.floor(Math.random() * zones.length)] },
        flagged,
        ssim: 0.80 + Math.random() * 0.19 // 0.8 to 0.99
      });
    }
    return frames;
  };

  const frames = [
    ...generateFrames('FL-001', 30, 34.0522, -118.2437),
    ...generateFrames('FL-002', 25, 34.0524, -118.2430),
    ...generateFrames('FL-003', 40, 34.0520, -118.2440),
  ];

  return NextResponse.json({ flights, frames });
}
