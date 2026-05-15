import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Mock Reconstruction Pipeline API
  // In a real scenario, this would interface with a photogrammetry backend (e.g. WebODM, Metashape API)
  
  const models = [
    {
      id: 'bridge_01',
      name: 'Highway Bridge Deck',
      type: 'Bridge',
      status: 'RECONSTRUCTED',
      health_score: 78,
      risk_level: 'MODERATE',
      point_cloud_url: '/models/bridge_pc.las', // Mock
      mesh_url: '/models/bridge_mesh.obj',      // Mock
      stats: {
        images_stitched: 450,
        points: 1200000,
        mesh_faces: 350000,
        defects_mapped: 12,
      },
      defects: [
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
      status: 'PROCESSING',
      health_score: null,
      risk_level: 'UNKNOWN',
      stats: { images_stitched: 840, points: 0, mesh_faces: 0, defects_mapped: 0 },
      defects: []
    }
  ];

  return NextResponse.json({ models });
}
