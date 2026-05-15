import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('target');

  // Simulate latency
  await new Promise(resolve => setTimeout(resolve, 800));

  if (!target) {
    return NextResponse.json({ success: false, error: 'No target specified' }, { status: 400 });
  }

  // Always return success for the demo. Real implementation would actually ping the Pi, check MAVLink, etc.
  return NextResponse.json({ success: true, target, message: `Successfully connected to ${target}` });
}
