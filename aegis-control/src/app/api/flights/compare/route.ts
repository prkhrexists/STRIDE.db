import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function haversineDist(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // meters
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function POST(req: Request) {
  try {
    const { flightId1, flightId2, pylonFilter } = await req.json();

    // In a real app, we would load the analysis JSONs for both flights from disk/DB
    // const flight1Dir = path.join(process.cwd(), 'data', 'flights', flightId1, 'analysis');
    // const flight2Dir = path.join(process.cwd(), 'data', 'flights', flightId2, 'analysis');

    // Mock delta comparison
    const deltas = [
      {
        frameId: 'frame1',
        matchedFrameId: 'frame_prev_1',
        distanceMeters: 1.2,
        ssim: 0.81,
        ssimDelta: -0.12,
        defectDelta: 1,
        newDefects: [{ type: 'crack', severity: 'high' }],
        resolvedDefects: []
      },
      {
        frameId: 'frame2',
        matchedFrameId: 'frame_prev_2',
        distanceMeters: 0.5,
        ssim: 0.95,
        ssimDelta: -0.01,
        defectDelta: 0,
        newDefects: [],
        resolvedDefects: []
      }
    ];

    return NextResponse.json({ success: true, deltas });
  } catch (error) {
    return NextResponse.json({ error: 'Comparison failed' }, { status: 500 });
  }
}