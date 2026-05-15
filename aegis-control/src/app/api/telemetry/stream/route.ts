import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function noise(t: number, scale = 1) { return (Math.sin(t * 1.3) + Math.sin(t * 2.7) + Math.sin(t * 0.7)) / 3 * scale; }

let droneT = 0;
let phase: 'ground' | 'takeoff' | 'cruise' | 'rtl' | 'land' = 'ground';
let phaseTimer = 0;
let battery = 96;
let yaw = 145;
let roll = 0;
let pitch = 0;

function nextTelemetry() {
  droneT += 0.5;
  phaseTimer += 0.5;

  // Phase transitions
  if (phase === 'ground' && phaseTimer > 10) { phase = 'takeoff'; phaseTimer = 0; }
  else if (phase === 'takeoff' && phaseTimer > 15) { phase = 'cruise'; phaseTimer = 0; }
  else if (phase === 'cruise' && phaseTimer > 60) { phase = 'rtl'; phaseTimer = 0; }
  else if (phase === 'rtl' && phaseTimer > 15) { phase = 'land'; phaseTimer = 0; }
  else if (phase === 'land' && phaseTimer > 10) { phase = 'ground'; phaseTimer = 0; battery = 96; }

  battery = Math.max(0, battery - 0.008);

  let altitude = 0, groundspeed = 0, airspeed = 0;
  if (phase === 'takeoff') {
    altitude = lerp(0, 42, Math.min(phaseTimer / 15, 1)) + noise(droneT, 0.2);
    groundspeed = lerp(0, 3, Math.min(phaseTimer / 15, 1));
    airspeed = groundspeed + noise(droneT, 0.3);
    roll = noise(droneT, 1.5);
    pitch = lerp(0, 12, Math.min(phaseTimer / 8, 1)) + noise(droneT, 0.5);
  } else if (phase === 'cruise') {
    altitude = 42 + noise(droneT, 0.8);
    groundspeed = 8 + noise(droneT, 1.2);
    airspeed = groundspeed + noise(droneT, 0.5);
    roll = noise(droneT * 0.5, 3);
    pitch = noise(droneT * 0.4, 2);
    yaw = (yaw + 0.3) % 360;
  } else if (phase === 'rtl') {
    altitude = lerp(42, 30, Math.min(phaseTimer / 15, 1)) + noise(droneT, 0.4);
    groundspeed = 6 + noise(droneT, 0.8);
    airspeed = groundspeed + noise(droneT, 0.3);
    roll = noise(droneT * 0.5, 2);
    pitch = noise(droneT * 0.4, 1.5);
  } else if (phase === 'land') {
    altitude = Math.max(0, lerp(30, 0, Math.min(phaseTimer / 10, 1))) + noise(droneT, 0.1);
    groundspeed = lerp(6, 0, Math.min(phaseTimer / 10, 1));
    airspeed = groundspeed;
    roll = noise(droneT, 0.5);
    pitch = noise(droneT, 0.5);
  }

  const voltage = lerp(16.8, 14.2, (96 - battery) / 96);
  const current = phase === 'cruise' ? 18 + noise(droneT, 2) : phase === 'ground' ? 2 : 12 + noise(droneT, 1.5);
  const gps_sats = phase === 'ground' ? 14 : 12 + Math.round(noise(droneT, 1));
  const signal_strength = 85 + noise(droneT * 0.2, 8);

  const modeMap: Record<string, string> = {
    ground: 'DISARMED', takeoff: 'TAKEOFF', cruise: 'AUTO', rtl: 'RTL', land: 'LAND'
  };

  return {
    timestamp: Date.now(),
    altitude: parseFloat(altitude.toFixed(2)),
    groundspeed: parseFloat(groundspeed.toFixed(2)),
    airspeed: parseFloat(airspeed.toFixed(2)),
    heading: parseFloat((yaw % 360).toFixed(1)),
    roll: parseFloat(roll.toFixed(2)),
    pitch: parseFloat(pitch.toFixed(2)),
    yaw: parseFloat((yaw % 360).toFixed(1)),
    battery_pct: parseFloat(battery.toFixed(1)),
    battery_voltage: parseFloat(voltage.toFixed(2)),
    battery_current: parseFloat(Math.abs(current).toFixed(2)),
    gps_sats,
    gps_fix: gps_sats > 8 ? '3D_RTK' : '3D_FIX',
    mode: modeMap[phase],
    armed: phase !== 'ground',
    signal_strength: parseFloat(Math.abs(signal_strength).toFixed(1)),
    imu_status: 'OK',
    phase,
  };
}

export async function GET(req: NextRequest) {
  const isDemoMode = req.nextUrl.searchParams.get('demo') === '1';

  if (!isDemoMode) {
    // Try real MAVLink proxy first
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
      const res = await fetch(`${backendUrl}/api/mavlink/stream`, { signal: AbortSignal.timeout(1000) });
      if (res.ok && res.body) return res as any;
    } catch {}
  }

  // Fallback: simulated telemetry SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = () => {
        if (closed) return;
        const data = nextTelemetry();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      const interval = setInterval(send, 500);
      send();
      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
