import { NextRequest, NextResponse } from 'next/server';
import { startReportJob } from '@/lib/reportGenerator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { flightId } = await req.json();
    if (!flightId) return NextResponse.json({ error: 'flightId required' }, { status: 400 });
    const jobId = startReportJob(flightId);
    return NextResponse.json({ jobId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
