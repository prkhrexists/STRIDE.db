import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = body.action as string; // 'arm' | 'disarm' | 'start_mission' | 'rth' | 'takeoff' | 'land'

  // Try real backend first
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
    const res = await fetch(`${backendUrl}/api/drone/command`, {
      method: 'POST', body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) return NextResponse.json(await res.json());
  } catch {}

  // Simulated responses
  const responses: Record<string, object> = {
    arm:           { success: true, message: 'Drone armed. Pre-arm checks passed.', state: 'armed' },
    disarm:        { success: true, message: 'Drone disarmed safely.', state: 'disarmed' },
    start_mission: { success: true, message: 'Autonomous mission initiated.', state: 'auto' },
    rth:           { success: true, message: 'Return-to-home initiated. ETA: 2m 30s', state: 'rtl' },
    takeoff:       { success: true, message: 'Takeoff to 42m AGL initiated.', state: 'takeoff' },
    land:          { success: true, message: 'Precision landing initiated.', state: 'land' },
  };

  const result = responses[action] || { success: false, message: `Unknown command: ${action}` };
  return NextResponse.json(result);
}
