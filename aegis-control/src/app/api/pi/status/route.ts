import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simulated Pi system state (persisted in module memory for dev)
let captureActive = false;
let totalCaptured = 0;
let captureStart: number | null = null;

export async function GET(req: NextRequest) {
  // Try real Pi backend first
  try {
    const piUrl = process.env.PI_URL || 'http://192.168.1.100:5001';
    const res = await fetch(`${piUrl}/status`, { signal: AbortSignal.timeout(800) });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ connected: true, ...data });
    }
  } catch {}

  // Simulated Pi status
  const now = Date.now();
  const cpu = 28 + Math.sin(now / 3000) * 12 + Math.random() * 5;
  const ram_used = 512 + Math.sin(now / 5000) * 80;
  const ram_total = 3840;

  return NextResponse.json({
    connected: false, // Will become true when real Pi is reachable
    simulated: true,
    last_heartbeat: new Date().toISOString(),
    cpu_pct: parseFloat(cpu.toFixed(1)),
    ram_used_mb: Math.round(ram_used),
    ram_total_mb: ram_total,
    ram_pct: parseFloat(((ram_used / ram_total) * 100).toFixed(1)),
    storage_used_gb: 11.6,
    storage_total_gb: 32.0,
    storage_pct: 36.3,
    camera_connected: false,
    camera_model: 'IMX708 (Pi Camera 3)',
    temperature_c: 48 + Math.random() * 4,
    capture_active: captureActive,
    total_captured: totalCaptured,
    capture_elapsed_s: captureActive && captureStart ? Math.floor((now - captureStart) / 1000) : 0,
    os: 'Raspberry Pi OS Bookworm',
    hostname: 'stride-pi',
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // Try real Pi
  try {
    const piUrl = process.env.PI_URL || 'http://192.168.1.100:5001';
    const res = await fetch(`${piUrl}/capture/${body.action}`, {
      method: 'POST', body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(1500)
    });
    if (res.ok) return NextResponse.json(await res.json());
  } catch {}

  // Simulated capture control
  if (body.action === 'start') {
    captureActive = true; captureStart = Date.now();
    return NextResponse.json({ success: true, message: 'Capture started', interval: body.interval || 5 });
  }
  if (body.action === 'stop') {
    captureActive = false; captureStart = null;
    return NextResponse.json({ success: true, message: 'Capture stopped', total: totalCaptured });
  }
  if (body.action === 'snapshot') {
    totalCaptured += 1;
    return NextResponse.json({ success: true, filename: `frame_${Date.now()}.jpg`, total: totalCaptured });
  }

  return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
}
