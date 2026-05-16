import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SEARCH_DIRS = [
  path.join(process.cwd(), 'public', 'data', 'flights'),
  path.join(process.cwd(), 'data', 'flights'),
];

export async function GET(req: NextRequest, { params }: { params: { flightId: string } }) {
  const { flightId } = params;

  for (const base of SEARCH_DIRS) {
    const telPath = path.join(base, flightId, 'telemetry.json');
    if (fs.existsSync(telPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(telPath, 'utf8'));
        return NextResponse.json({ data: raw });
      } catch {}
    }
  }

  // Fallback: read demo-telemetry.json from public/data/
  const demoPath = path.join(process.cwd(), 'public', 'data', 'demo-telemetry.json');
  if (fs.existsSync(demoPath)) {
    const raw = JSON.parse(fs.readFileSync(demoPath, 'utf8'));
    // Slice to reasonable length
    const arr = Array.isArray(raw) ? raw.slice(0, 200) : raw.telemetry?.slice(0, 200) ?? [];
    return NextResponse.json({ data: arr, demo: true });
  }

  return NextResponse.json({ data: [], error: 'No telemetry data found' });
}
