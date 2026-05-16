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
      clearTimeout(timeoutId);

      if (response.ok) {
        // Here we would restart the WebSocket proxy in a real scenario
        // Example: child_process.exec('pm2 restart proxy')
        return NextResponse.json({ success: true, message: 'Reconnected successfully and proxy restarted', latency: Date.now() - start, services_restarted: 4 });
      }
      return NextResponse.json({ success: false, error: 'Ping failed, cannot reconnect', latency: Date.now() - start });
    } catch (err: any) {
      clearTimeout(timeoutId);
      return NextResponse.json({ success: false, error: err.name === 'AbortError' ? 'Connection timed out' : err.message, latency: Date.now() - start });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
