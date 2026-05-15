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
  const manifestPath = path.join(FLIGHTS_DIR, `flight_${currentSessionId}`, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    sessionId: currentSessionId,
    timestamp: new Date().toISOString(),
    frameCount
  }, null, 2));
  currentSessionId = null; // Next capture will create a new session
}
