import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { piIp, port } = await req.json();
    if (!piIp) return NextResponse.json({ error: 'piIp required' }, { status: 400 });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const start = Date.now();
    try {
      const response = await fetch(`http://${piIp}:${port || 5001}/api/ping`, {
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      clearTimeout(timeoutId);

      return NextResponse.json({
        success: true,
        latency: Date.now() - start,
        piVersion: data.version || 'Unknown',
        cameraDetected: data.camera || false,
        services: data.services || []
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      return NextResponse.json({
        success: false,
        latency: Date.now() - start,
        error: err.name === 'AbortError' ? 'Connection timed out' : err.message
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
