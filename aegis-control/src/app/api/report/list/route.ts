import { NextResponse } from 'next/server';

export async function GET() {
  const reports = [
    { id: 'rep_001', filename: 'report_flight_001_2026-05-14.pdf', date: '2026-05-14', size: '2.4 MB' },
    { id: 'rep_002', filename: 'report_bridge_comparison_2026.pdf', date: '2026-05-10', size: '5.1 MB' },
  ];
  return NextResponse.json({ reports });
}
