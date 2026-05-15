import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const FLIGHTS_DIR = path.join(DATA_DIR, 'flights');

export async function GET() {
  try {
    if (!fs.existsSync(FLIGHTS_DIR)) return NextResponse.json({ pylons: [] });

    const pylonMap = new Map<string, any>();
    const dirs = fs.readdirSync(FLIGHTS_DIR).filter(d => d.startsWith('flight_'));

    dirs.forEach(flightDir => {
      const framesDir = path.join(FLIGHTS_DIR, flightDir, 'frames');
      if (!fs.existsSync(framesDir)) return;

      const manifestPath = path.join(FLIGHTS_DIR, flightDir, 'manifest.json');
      let flightTimestamp = Date.now();
      if (fs.existsSync(manifestPath)) {
        flightTimestamp = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).timestamp;
      }

      fs.readdirSync(framesDir).filter(f => f.endsWith('.json')).forEach(file => {
        const meta = JSON.parse(fs.readFileSync(path.join(framesDir, file), 'utf8'));
        const pylonId = meta.pylonId || 'Unknown';

        if (!pylonMap.has(pylonId)) {
          pylonMap.set(pylonId, {
            pylonId,
            defects: [],
            latestFlight: flightTimestamp,
            frames: [],
            totalInspections: 0,
            criticalCount: 0,
            healthScoreSum: 0
          });
        }

        const pd = pylonMap.get(pylonId);
        pd.totalInspections += 1;
        if (flightTimestamp > pd.latestFlight) pd.latestFlight = flightTimestamp;

        const imgUrl = `/api/flights/image?flightId=${flightDir}&file=${file.replace('.json', '.jpg')}`;
        
        let frameHealth = 100;
        let severityClass = 'low';

        if (meta.aiAnalysis) {
          const ai = meta.aiAnalysis;
          if (ai.overallCondition === 'critical' || ai.needsImmediateAttention) {
             frameHealth = 0;
             severityClass = 'critical';
             pd.criticalCount += 1;
          } else if (ai.overallCondition === 'poor' || ai.overallCondition === 'high') {
             frameHealth = 25;
             severityClass = 'high';
          } else if (ai.overallCondition === 'fair' || ai.overallCondition === 'medium') {
             frameHealth = 50;
             severityClass = 'medium';
          } else if (ai.overallCondition === 'good' || ai.overallCondition === 'low') {
             frameHealth = 85;
          }

          if (ai.defects && ai.defects.length > 0) {
            ai.defects.forEach((d: any) => {
              pd.defects.push({ ...d, imgUrl, lat: meta.lat, lon: meta.lon, frameIndex: meta.frameIndex, pylonId });
            });
          }
        }

        pd.healthScoreSum += frameHealth;
        pd.frames.push({
          imgUrl, lat: meta.lat, lon: meta.lon, frameIndex: meta.frameIndex, severity: severityClass, timestamp: meta.timestamp, pylonId
        });
      });
    });

    const results = Array.from(pylonMap.values()).map(pd => {
      return {
        ...pd,
        healthScore: pd.totalInspections > 0 ? Math.round(pd.healthScoreSum / pd.totalInspections) : 100
      };
    });

    return NextResponse.json({ pylons: results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
