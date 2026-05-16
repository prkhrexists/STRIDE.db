import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Search both public and root data directories
const SEARCH_PATHS = [
  path.resolve(process.cwd(), 'public/data/flights'),
  path.resolve(process.cwd(), 'data/flights')
];

export async function GET() {
  try {
    const allFlights = [];
    
    for (const root of SEARCH_PATHS) {
      if (!fs.existsSync(root)) continue;
      
      const flightDirs = fs.readdirSync(root).filter(d => fs.statSync(path.join(root, d)).isDirectory());
      
      for (const dir of flightDirs) {
        const flightPath = path.join(root, dir);
        const manifestPath = path.join(flightPath, 'manifest.json');
        const resultsPath = path.join(flightPath, 'results.json');
        
        let manifest: any = {};
        let results: any = {};
        
        if (fs.existsSync(manifestPath)) {
          try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (_) {}
        }
        
        if (fs.existsSync(resultsPath)) {
          try { results = JSON.parse(fs.readFileSync(resultsPath, 'utf8')); } catch (_) {}
        }
        
        // Calculate health score if not present
        let healthScore = manifest.healthScore;
        if (healthScore === undefined && results.defects) {
          const totalFrames = results.totalFrames || results.frameCount || 100;
          const defectFrames = results.defects.length;
          healthScore = Math.max(0, Math.min(100, Math.round(((totalFrames - defectFrames) / totalFrames) * 100)));
        }

        allFlights.push({
          id: dir,
          flightId: dir,
          name: manifest.name ?? manifest.sessionId ?? dir,
          structure: manifest.structure ?? manifest.structureName ?? 'Unknown',
          structureType: manifest.structureType ?? 'Bridge', // Default
          date: manifest.date ?? manifest.timestamp?.split('T')[0] ?? '---',
          defectCount: results.defects?.length ?? 0,
          healthScore: healthScore ?? 100,
          status: results.defects ? 'Report Ready' : 'Archived',
          severity: manifest.severity ?? 'Moderate',
          frameCount: results.totalFrames || results.frameCount || 0
        });
      }
    }
    
    // Sort newest first
    allFlights.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return NextResponse.json({ flights: allFlights });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
