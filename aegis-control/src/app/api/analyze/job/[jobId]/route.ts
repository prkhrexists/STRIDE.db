import { NextResponse } from 'next/server';
import { jobs } from '../store';

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  const job = jobs[params.jobId];
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  return NextResponse.json(job);
}
