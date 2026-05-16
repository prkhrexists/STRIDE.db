import { NextResponse } from 'next/server';
import { jobs } from './store'; // We will create store.ts to hold memory state

export async function POST(req: Request) {
  try {
    const { flightId, frames } = await req.json();

    if (!flightId || !frames || !Array.isArray(frames)) {
      return NextResponse.json({ error: 'Missing flightId or frames array' }, { status: 400 });
    }

    const jobId = `job-${Date.now()}`;
    
    jobs[jobId] = {
      id: jobId,
      flightId,
      status: 'RUNNING',
      progress: 0,
      total: frames.length,
      results: []
    };

    // Start background processing
    (async () => {
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        try {
          // Call local analyze endpoint
          // In production, we'd directly use child_process here instead of fetch loop,
          // but calling our own API is simpler to reuse the exact python call logic.
          const res = await fetch(`http://localhost:${process.env.PORT || 3000}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'file', filePath: frame.url, flightId, frameIndex: i })
          });
          
          if (res.ok) {
            const data = await res.json();
            jobs[jobId].results.push({ frameId: frame.id, data });
          }
        } catch (e) {
          console.error('Job error on frame', i, e);
        }
        jobs[jobId].progress = Math.round(((i + 1) / frames.length) * 100);
      }
      jobs[jobId].status = 'COMPLETED';
    })();

    return NextResponse.json({ jobId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
