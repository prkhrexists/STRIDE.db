import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.SARVAM_API_KEY;
  return NextResponse.json({
    status: key ? 'online' : 'offline',
    model: 'sarvam-m',
  });
}
