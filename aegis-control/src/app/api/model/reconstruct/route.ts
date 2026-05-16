import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const FLIGHTS_DIRS = [
  path.resolve(process.cwd(), 'data', 'flights'),
  path.resolve(process.cwd(), 'public', 'data', 'flights'),
];

function loadRealDefects() {
  const allDefects: any[] = [];
  let totalFrames = 0;

  for (const root of FLIGHTS_DIRS) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs.readdirSync(root).filter(d => {
      try { return fs.statSync(path.join(root, d)).isDirectory(); } catch { return false; }
    });

    for (const dir of dirs) {
      const resultsPath = path.join(root, dir, 'results.json');
      if (fs.existsSync(resultsPath)) {
        try {
          const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
          totalFrames += results.totalFrames || results.frameCount || 0;
          if (results.defects) {
            allDefects.push(...results.defects);
          }
        } catch {}
      }
    }
  }
  return { allDefects, totalFrames };
}

export async function GET(req: NextRequest) {
  const { allDefects, totalFrames } = loadRealDefects();

  // Map real defects into 3D positions for the viewer
  const realDefects3D = allDefects.slice(0, 12).map((d, i) => ({
    id: d.id || `rd${i + 1}`,
    type: d.type || 'Unknown',
    severity: d.severity || 'MODERATE',
    position: d.position || [
      (Math.sin(i * 1.5) * 4),
      (Math.cos(i * 0.7) * 3),
      (i * 0.5 - 2),
    ],
    repair: d.recommendedAction || 'Monitor',
    area: `${(0.2 + Math.random() * 2).toFixed(1)} sq m`,
    zone: d.location || d.zone || 'General',
    confidence: typeof d.confidence === 'number' ? d.confidence : 0.8,
  }));

  // Use real defect count for stats, fallback to mock data for the 3D model geometry
  const models = [
    {
      id: 'bridge_01',
      name: 'Highway Bridge Deck',
      type: 'Bridge',
      status: 'RECONSTRUCTED',
      health_score: allDefects.length > 0
        ? Math.max(0, 100 - allDefects.length * 3)
        : 78,
      risk_level: allDefects.filter(d => d.severity === 'CRITICAL').length >= 2
        ? 'CRITICAL'
        : allDefects.length > 5
          ? 'MODERATE'
          : 'LOW',
      point_cloud_url: '/models/bridge_pc.las',
      mesh_url: '/models/bridge_mesh.obj',
      stats: {
        images_stitched: totalFrames || 450,
        points: 1200000,
        mesh_faces: 350000,
        defects_mapped: realDefects3D.length || 12,
      },
      defects: realDefects3D.length > 0 ? realDefects3D : [
        { id: 'd1', type: 'Crack', severity: 'CRITICAL', position: [2, 0.5, -1], repair: 'Epoxy Injection', area: '0.4 sq m', zone: 'Pier 3' },
        { id: 'd2', type: 'Spalling', severity: 'MODERATE', position: [-3, -1, 2], repair: 'Patching', area: '1.2 sq m', zone: 'Deck Underside' },
        { id: 'd3', type: 'Corrosion', severity: 'WARNING', position: [0, 2, 4], repair: 'Anti-corrosive coating', area: '2.5 sq m', zone: 'Cable Anchor' },
      ]
    },
    {
      id: 'tower_01',
      name: 'Comms Tower A',
      type: 'Tower',
      status: 'RECONSTRUCTED',
      health_score: 92,
      risk_level: 'LOW',
      stats: { images_stitched: 210, points: 850000, mesh_faces: 120000, defects_mapped: 3 },
      defects: [
        { id: 'd4', type: 'Corrosion', severity: 'MODERATE', position: [0, 5, 0], repair: 'Sandblasting & Paint', area: '0.5 sq m', zone: 'Level 2 Crossbrace' },
      ]
    },
    {
      id: 'dam_01',
      name: 'Hydro Dam Spillway',
      type: 'Dam',
      status: totalFrames > 0 ? 'RECONSTRUCTED' : 'PROCESSING',
      health_score: totalFrames > 0 ? 65 : null,
      risk_level: totalFrames > 0 ? 'CRITICAL' : 'UNKNOWN',
      stats: { images_stitched: totalFrames || 840, points: totalFrames > 0 ? 2100000 : 0, mesh_faces: totalFrames > 0 ? 580000 : 0, defects_mapped: 0 },
      defects: []
    }
  ];

  return NextResponse.json({ models });
}
