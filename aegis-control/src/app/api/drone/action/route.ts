import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  // Simulate latency
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (!type) {
    return NextResponse.json({ success: false, error: 'No action type specified' }, { status: 400 });
  }

  // Always return success for the demo.
  return NextResponse.json({ success: true, type, message: `Action ${type} executed` });
}
