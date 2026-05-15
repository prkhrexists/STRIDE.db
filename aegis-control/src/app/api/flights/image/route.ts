import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const flightId = req.nextUrl.searchParams.get('flightId');
  const file = req.nextUrl.searchParams.get('file');

  if (!flightId || !file) return new Response('Missing params', { status: 400 });

  const filepath = path.join(process.env.DATA_DIR || './data', 'flights', flightId, 'frames', file);

  if (!fs.existsSync(filepath)) return new Response('Not found', { status: 404 });

  const buffer = fs.readFileSync(filepath);
  return new Response(buffer, {
    headers: { 'Content-Type': 'image/jpeg' }
  });
}
