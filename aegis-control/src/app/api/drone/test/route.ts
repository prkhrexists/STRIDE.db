import { NextRequest, NextResponse } from 'next/server';
import dgram from 'dgram';

const PI_PROXY = `http://localhost:${process.env.PI_PROXY_PORT ?? 3001}`;

export async function GET(req: NextRequest) {
  const target = new URL(req.url).searchParams.get('target') ?? 'pi';
  const piIp   = new URL(req.url).searchParams.get('piIp') ?? '192.168.1.100';
  const mavPort= Number(new URL(req.url).searchParams.get('mavPort') ?? 14550);

  switch (target) {
    // ── Pi Connection ────────────────────────────────────────────────────────
    case 'pi': {
      const t0 = Date.now();
      try {
        const r = await fetch(`${PI_PROXY}/api/ping`, { signal: AbortSignal.timeout(4000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return NextResponse.json({ success: true, latency: Date.now() - t0 });
      } catch (e: any) {
        // Fallback: try direct Pi URL
        try {
          const t1 = Date.now();
          const r2 = await fetch(`http://${piIp}:3001/api/ping`, { signal: AbortSignal.timeout(4000) });
          if (r2.ok) return NextResponse.json({ success: true, latency: Date.now() - t1 });
        } catch {}
        return NextResponse.json({ success: false, error: e.message, latency: null });
      }
    }

    // ── Telemetry (UDP MAVLink sniff for 5s) ─────────────────────────────────
    case 'telemetry': {
      try {
        const count = await new Promise<number>((resolve) => {
          let packets = 0;
          const sock = dgram.createSocket('udp4');
          sock.on('message', () => { packets++; });
          sock.on('error',   () => resolve(0));
          sock.bind(mavPort, '0.0.0.0', () => {});
          setTimeout(() => { sock.close(); resolve(packets); }, 5000);
        });
        return NextResponse.json({ success: count > 0, packets: count, port: mavPort });
      } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
      }
    }

    // ── Camera Frame ─────────────────────────────────────────────────────────
    case 'camera': {
      try {
        const r = await fetch(`${PI_PROXY}/camera/frame`, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const buf = Buffer.from(await r.arrayBuffer());
        const b64 = buf.toString('base64');
        return NextResponse.json({ success: true, thumbnail: `data:image/jpeg;base64,${b64}` });
      } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
      }
    }

    // ── Storage Check ────────────────────────────────────────────────────────
    case 'storage': {
      try {
        const r = await fetch(`${PI_PROXY}/api/storage/check`, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        return NextResponse.json({ success: data.writable === true, path: data.path, freeGb: data.freeGb });
      } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
      }
    }

    default:
      return NextResponse.json({ success: false, error: 'Unknown target' }, { status: 400 });
  }
}
