import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const flightId = formData.get('flightId') as string || 'live';
    const frameIndex = formData.get('frameIndex') as string || Date.now().toString();

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'public', 'data', 'flights', flightId, 'frames');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Save the raw frame
    const filename = `frame-${frameIndex}.jpg`;
    const filepath = path.join(outputDir, filename);
    await fs.writeFile(filepath, buffer);

    // Construct relative path for python analyzer
    const relFilepath = `public/data/flights/${flightId}/frames/${filename}`;

    // Call analyzer
    const cmd = `python server/analyzer.py --source file --filepath "${relFilepath}" --flightId "${flightId}" --frameIndex "${frameIndex}"`;
    const { stdout, stderr } = await execAsync(cmd);
    
    // Parse python output robustly
    const jsonStr = stdout.substring(stdout.indexOf('{'));
    const result = JSON.parse(jsonStr);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Frame analysis error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}