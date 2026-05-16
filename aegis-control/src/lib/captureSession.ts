import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const FLIGHTS_DIR = path.join(DATA_DIR, 'flights');

if (!fs.existsSync(FLIGHTS_DIR)) {
  fs.mkdirSync(FLIGHTS_DIR, { recursive: true });
}

let currentSessionId: number | null = null;

export function getOrCreateSessionId(): number {
  if (currentSessionId !== null) return currentSessionId;
  
  const dirs = fs.readdirSync(FLIGHTS_DIR);
  let maxId = 0;
  for (const dir of dirs) {
    if (dir.startsWith('flight_')) {
      const id = parseInt(dir.split('_')[1], 10);
      if (!isNaN(id) && id > maxId) maxId = id;
    }
  }
  
  currentSessionId = maxId + 1;
  const sessionDir = path.join(FLIGHTS_DIR, `flight_${currentSessionId}`, 'frames');
  fs.mkdirSync(sessionDir, { recursive: true });
  return currentSessionId;
}

export function getSessionDir() {
  const id = getOrCreateSessionId();
  return path.join(FLIGHTS_DIR, `flight_${id}`);
}

export function endSession(frameCount: number) {
  if (currentSessionId === null) return;

  const flightDir = path.join(FLIGHTS_DIR, `flight_${currentSessionId}`);
  const framesDir = path.join(flightDir, 'frames');

  // ─── Write manifest.json ──────────────────────────────────────────────
  const manifestPath = path.join(flightDir, 'manifest.json');
  const manifest = {
    sessionId: currentSessionId,
    name: `Inspection Flight ${currentSessionId}`,
    structure: 'Structure Survey',
    structureType: 'Building',
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    frameCount,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // ─── Aggregate sidecar JSONs → results.json ───────────────────────────
  const allDefects: any[] = [];
  let totalFrames = 0;
  let framesWithDefects = 0;

  if (fs.existsSync(framesDir)) {
    const files = fs.readdirSync(framesDir).filter(f => f.endsWith('.json'));
    totalFrames = files.length;

    for (const file of files) {
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(framesDir, file), 'utf8'));
        if (meta.aiAnalysis?.defects?.length > 0) {
          framesWithDefects++;
          for (const defect of meta.aiAnalysis.defects) {
            allDefects.push({
              ...defect,
              frameFile: file.replace('.json', '.jpg'),
              gps: { lat: meta.lat, lon: meta.lon, alt: meta.alt },
              frameIndex: meta.frameIndex,
              pylonId: meta.pylonId,
            });
          }
        }
      } catch (err) {
        console.warn(`[captureSession] Failed to parse ${file}:`, err);
      }
    }
  }

  const healthScore = totalFrames > 0
    ? Math.max(0, Math.min(100, Math.round(((totalFrames - framesWithDefects) / totalFrames) * 100)))
    : 100;

  const criticalCount = allDefects.filter(d => d.severity === 'CRITICAL').length;
  const riskLevel = criticalCount >= 3 ? 'CRITICAL' : criticalCount >= 1 ? 'MODERATE' : healthScore >= 90 ? 'LOW' : 'MODERATE';

  const resultsPath = path.join(flightDir, 'results.json');
  const results = {
    totalFrames: totalFrames || frameCount,
    frameCount: totalFrames || frameCount,
    framesWithDefects,
    defects: allDefects,
    healthScore,
    riskLevel,
    summary: `${allDefects.length} defects detected across ${framesWithDefects} of ${totalFrames} frames. Health score: ${healthScore}%.`,
  };
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  console.log(`[captureSession] Session ${currentSessionId} ended: ${frameCount} frames, ${allDefects.length} defects, health ${healthScore}%`);

  // Also write a metadata.json alias for contextBuilder compatibility
  const metadataPath = path.join(flightDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify({
    id: `FL-${String(currentSessionId).padStart(3, '0')}`,
    name: manifest.name,
    date: manifest.date,
    structure: manifest.structure,
    frameCount: totalFrames || frameCount,
  }, null, 2));

  currentSessionId = null; // Next capture will create a new session
}
