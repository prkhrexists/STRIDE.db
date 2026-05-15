import { NextRequest, NextResponse } from 'next/server';
import { endSession } from '@/lib/captureSession';

export async function POST(req: NextRequest) {
  try {
    const { frameCount } = await req.json();
    endSession(frameCount);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
