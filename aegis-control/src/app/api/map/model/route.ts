import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const flightId = url.searchParams.get('flightId');
  const pylonId = url.searchParams.get('pylonId') || 'unknown';

  const modelDir = path.join(process.env.DATA_DIR || './data', 'models', pylonId, flightId || '');
  
  if (fs.existsSync(path.join(modelDir, 'sparse.json'))) {
     const data = JSON.parse(fs.readFileSync(path.join(modelDir, 'sparse.json'), 'utf8'));
     return NextResponse.json(data);
  }
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
