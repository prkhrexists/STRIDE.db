import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/snapshots?flightId=flight_12
 * Returns a list of annotated YOLO snapshots for the given flight (from public/snapshots/<flightId>/)
 * along with sidecar metadata (severity, detections, GPS).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const flightId = searchParams.get('flightId');

  if (!flightId) {
    return NextResponse.json({ error: 'Missing flightId' }, { status: 400 });
  }

  const snapshotsDir = path.join(process.cwd(), 'public', 'snapshots', flightId);
  const framesDir = path.join(process.cwd(), 'data', 'flights', flightId, 'frames');

  const snapshots: any[] = [];

  // Read annotated images from public/snapshots/<flightId>/
  if (fs.existsSync(snapshotsDir)) {
    const files = fs.readdirSync(snapshotsDir)
      .filter(f => f.endsWith('.jpg'))
      .sort((a, b) => parseInt(a) - parseInt(b));

    for (const file of files) {
      const frameIndex = parseInt(file.replace('.jpg', ''), 10);

      // Try to match the sidecar JSON from data/flights/<flightId>/frames/
      let sidecar: any = null;
      if (fs.existsSync(framesDir)) {
        const sidecarFiles = fs.readdirSync(framesDir).filter(f => f.endsWith('.json'));
        // Find sidecar with matching frameIndex
        for (const sc of sidecarFiles) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(framesDir, sc), 'utf8'));
            if (data.frameIndex === frameIndex) {
              sidecar = data;
              break;
            }
          } catch {}
        }
      }

      snapshots.push({
        frameIndex,
        snapshotUrl: `/snapshots/${flightId}/${file}`,
        status: sidecar?.yoloAnalysis?.status || sidecar?.aiAnalysis?.overallCondition || 'UNKNOWN',
        detections: sidecar?.yoloAnalysis?.detections?.length || sidecar?.aiAnalysis?.defects?.length || 0,
        maxConf: sidecar?.yoloAnalysis?.maxConf || 0,
        gps: sidecar ? { lat: sidecar.lat, lon: sidecar.lon, alt: sidecar.alt } : null,
        timestamp: sidecar?.timestamp || null,
      });
    }
  }

  return NextResponse.json({ flightId, snapshots, total: snapshots.length });
}
