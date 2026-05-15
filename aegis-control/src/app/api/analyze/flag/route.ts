import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { flightId, frameId, flagged } = await req.json();

    const resultPath = path.join(process.cwd(), 'data', 'flights', flightId, 'analysis');
    const filePath = path.join(resultPath, `${frameId}.json`);

    let analysis: any = {};
    if (fs.existsSync(filePath)) {
      analysis = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    // Update flag
    analysis.flagged = flagged;
    analysis.flaggedAt = flagged ? Date.now() : null;

    // Ensure directory exists
    fs.mkdirSync(resultPath, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(analysis, null, 2));

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    return NextResponse.json({ error: 'Flagging failed' }, { status: 500 });
  }
}