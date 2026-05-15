import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Shared activity log store (module-level, dev only)
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
export interface LogEntry {
  id: string;
  ts: string;
  level: LogLevel;
  source: string;
  message: string;
}

const LOG_POOL: Array<{ level: LogLevel; source: string; message: string }> = [
  { level:'SUCCESS', source:'DRONE',   message:'MAVLink heartbeat received — ArduCopter 4.3' },
  { level:'INFO',    source:'PI-CAM',  message:'Camera initialised — IMX708 1920×1080@30fps' },
  { level:'INFO',    source:'CAPTURE', message:'Frame captured → frame_1715760001.jpg' },
  { level:'INFO',    source:'CAPTURE', message:'Frame captured → frame_1715760006.jpg' },
  { level:'INFO',    source:'CAPTURE', message:'Frame captured → frame_1715760011.jpg' },
  { level:'SUCCESS', source:'AI',      message:'Defect detected — CRACK 94% conf @ NW Facade' },
  { level:'WARN',    source:'BATTERY', message:'Battery at 34% — recommend RTH soon' },
  { level:'INFO',    source:'TELEM',   message:'Altitude 42.3m · Speed 8.2m/s · HDG 145°' },
  { level:'INFO',    source:'GPS',     message:'GPS 3D RTK Fix · 14 satellites · HDOP 0.7' },
  { level:'SUCCESS', source:'REPORT',  message:'Inspection report generated — 3 flights, 14 defects' },
  { level:'ERROR',   source:'PI-CAM',  message:'Frame timeout — retrying stream connection' },
  { level:'SUCCESS', source:'PI-CAM',  message:'Stream reconnected — latency 12ms' },
  { level:'INFO',    source:'MISSION', message:'Waypoint 4/12 reached — altitude hold OK' },
  { level:'INFO',    source:'STORAGE', message:'Frames saved to /data/flights/FL-003/' },
  { level:'WARN',    source:'IMU',     message:'Vibration level elevated — check motor mounts' },
  { level:'SUCCESS', source:'DRONE',   message:'Return-to-home initiated — ETA 2m 18s' },
  { level:'INFO',    source:'FLIGHT',  message:'FL-003 upload complete — 24 frames, 48.2MB' },
];

let logIdx = 0;
let seqId = 1000;

function makeEntry(): LogEntry {
  const template = LOG_POOL[logIdx % LOG_POOL.length];
  logIdx++;
  return {
    id: `log-${seqId++}`,
    ts: new Date().toISOString(),
    level: template.level,
    source: template.source,
    message: template.message,
  };
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      // Emit initial backfill (last 8 logs)
      const backfill: LogEntry[] = LOG_POOL.slice(0, 8).map((t, i) => ({
        id: `log-init-${i}`,
        ts: new Date(Date.now() - (8 - i) * 12000).toISOString(),
        level: t.level,
        source: t.source,
        message: t.message,
      }));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type:'backfill', entries: backfill })}\n\n`));

      // Emit new entries at random intervals
      const emitNext = () => {
        if (closed) return;
        const entry = makeEntry();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type:'entry', entry })}\n\n`));
        const delay = 3000 + Math.random() * 7000;
        setTimeout(emitNext, delay);
      };

      setTimeout(emitNext, 2000);

      req.signal.addEventListener('abort', () => {
        closed = true;
        try { controller.close(); } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
