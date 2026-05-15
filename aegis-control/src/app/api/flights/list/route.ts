import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const FLIGHTS_DIR = path.join(DATA_DIR, 'flights');

export async function GET() {
  try {
    if (!fs.existsSync(FLIGHTS_DIR)) {
      return NextResponse.json({ flights: [] });
    }

    const flights = [];
    const dirs = fs.readdirSync(FLIGHTS_DIR);

    for (const dir of dirs) {
      if (dir.startsWith('flight_')) {
        const manifestPath = path.join(FLIGHTS_DIR, dir, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          
          // Read frames to extract pylons
          const framesDir = path.join(FLIGHTS_DIR, dir, 'frames');
          const pylons = new Set<string>();
          
          if (fs.existsSync(framesDir)) {
            const files = fs.readdirSync(framesDir);
            for (const file of files) {
              if (file.endsWith('.json')) {
                const meta = JSON.parse(fs.readFileSync(path.join(framesDir, file), 'utf8'));
                if (meta.pylonId) pylons.add(meta.pylonId);
              }
            }
          }

          flights.push({
            flightId: dir,
            sessionId: manifest.sessionId,
            date: manifest.timestamp,
            frameCount: manifest.frameCount,
            pylons: Array.from(pylons)
          });
        }
      }
    }

    // Sort by descending sessionId
    flights.sort((a, b) => b.sessionId - a.sessionId);

    return NextResponse.json({ flights });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
