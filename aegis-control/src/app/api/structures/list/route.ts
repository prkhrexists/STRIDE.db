import { NextResponse } from 'next/server';

export async function GET() {
  const structures = [
    { id: 'bridge-01', name: 'Golden Gate Bridge - North Tower', type: 'bridge', lastInspected: '2026-05-10', healthScore: 82, totalDefects: 12 },
    { id: 'bldg-hq', name: 'HQ Building Facade', type: 'building', lastInspected: '2026-05-12', healthScore: 95, totalDefects: 2 },
    { id: 'pylon-a12', name: 'High Voltage Pylon A12', type: 'pylon', lastInspected: '2026-05-14', healthScore: 68, totalDefects: 8 },
  ];

  return NextResponse.json({ structures });
}
