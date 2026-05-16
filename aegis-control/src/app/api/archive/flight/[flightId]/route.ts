import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SEARCH_PATHS = [
  path.resolve(process.cwd(), 'public/data/flights'),
  path.resolve(process.cwd(), 'data/flights')
];

export async function GET(req: Request, { params }: { params: { flightId: string } }) {
  const flightId = params.flightId;
  
  try {
    for (const root of SEARCH_PATHS) {
      const flightPath = path.join(root, flightId);
      if (!fs.existsSync(flightPath)) continue;
      
      const manifestPath = path.join(flightPath, 'manifest.json');
      const resultsPath = path.join(flightPath, 'results.json');
      const telemetryPath = path.join(flightPath, 'telemetry.json');
      
      let manifest: any = {};
      let results: any = {};
      let telemetryExists = fs.existsSync(telemetryPath);
      
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      }
      
      if (fs.existsSync(resultsPath)) {
        results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      }
      
      // Calculate health score
      const totalFrames = results.totalFrames || results.frameCount || 100;
      const defectFrames = results.defects?.length ?? 0;
      const healthScore = Math.max(0, Math.min(100, Math.round(((totalFrames - defectFrames) / totalFrames) * 100)));
      
      // Top 3 captures by confidence
      const topCaptures = (results.defects || [])
        .sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, 3)
        .map((d: any) => ({
          ...d,
          url: `/snapshots/${flightId}/${d.frameId}.jpg`
        }));

      // Defect type distribution
      const defectTypeCounts: Record<string, number> = {};
      (results.defects || []).forEach((d: any) => {
        const type = d.type || 'Unknown';
        defectTypeCounts[type] = (defectTypeCounts[type] || 0) + 1;
      });

      // Most common severity
      const severityCounts: Record<string, number> = {};
      (results.defects || []).forEach((d: any) => {
        const s = d.severity || 'Moderate';
        severityCounts[s] = (severityCounts[s] || 0) + 1;
      });
      const primarySeverity = Object.entries(severityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Moderate';

      return NextResponse.json({
        flightId,
        name: manifest.name ?? manifest.sessionId ?? flightId,
        structure: manifest.structure ?? manifest.structureName ?? 'Unknown',
        date: manifest.date ?? manifest.timestamp?.split('T')[0] ?? '---',
        healthScore,
        primarySeverity,
        frameCount: totalFrames,
        defectCount: defectFrames,
        defects: results.defects || [],
        topCaptures,
        defectTypeCounts,
        telemetryAvailable: telemetryExists
      });
    }
    
    return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
