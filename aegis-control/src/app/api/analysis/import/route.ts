import { NextRequest, NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const flightId = `FL-${Date.now().toString().slice(-4)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Basic logic for ZIP extraction or parsing other files
    if (file.name.endsWith('.zip')) {
      const zip = new AdmZip(buffer);
      const outputDir = path.join(process.cwd(), 'public', 'data', 'flights', flightId, 'frames');
      await fs.mkdir(outputDir, { recursive: true });
      zip.extractAllTo(outputDir, true);
    } else if (file.name.endsWith('.json') || file.name.endsWith('.csv')) {
      // Simulate processing json or csv
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Here we'd save the flight info to DB. We'll return it so the frontend can mock it.
    const newFlight = {
      id: flightId,
      name: file.name,
      date: new Date().toISOString(),
      framesCount: file.name.endsWith('.zip') ? 24 /* mock count */ : 0,
      status: 'ANALYZING'
    };

    return NextResponse.json({ success: true, flight: newFlight });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
