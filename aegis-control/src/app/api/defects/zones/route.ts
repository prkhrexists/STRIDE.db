import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get('targetId');

  // Mock defect zones based on targetId
  let zones: any[] = [];

  if (targetId === 'bridge-01') {
    zones = [
      { zoneId: 'z1', label: 'North Pillar Base', severity: 'CRITICAL', lat: 37.8199, lon: -122.4783, alt: 5, defectCount: 4, defectTypes: ['spalling', 'corrosion'] },
      { zoneId: 'z2', label: 'Mid Span Cable', severity: 'MEDIUM', lat: 37.8195, lon: -122.4784, alt: 40, defectCount: 1, defectTypes: ['corrosion'] },
      { zoneId: 'z3', label: 'South Expansion Joint', severity: 'CLEAN', lat: 37.8190, lon: -122.4785, alt: 25, defectCount: 0, defectTypes: [] },
    ];
  } else if (targetId === 'pylon-a12') {
    zones = [
      { zoneId: 'z1', label: 'Top Crossarm', severity: 'HIGH', lat: 34.0522, lon: -118.2437, alt: 45, defectCount: 2, defectTypes: ['corrosion'] },
      { zoneId: 'z2', label: 'Mid Section Brace', severity: 'CRITICAL', lat: 34.0522, lon: -118.2437, alt: 25, defectCount: 5, defectTypes: ['crack', 'delamination'] },
      { zoneId: 'z3', label: 'Concrete Foundation', severity: 'MEDIUM', lat: 34.0522, lon: -118.2437, alt: 2, defectCount: 1, defectTypes: ['spalling'] },
    ];
  } else {
    zones = [
      { zoneId: 'z1', label: 'East Wall', severity: 'LOW', lat: 40.7128, lon: -74.0060, alt: 15, defectCount: 1, defectTypes: ['crack'] },
    ];
  }

  return NextResponse.json({ zones });
}
