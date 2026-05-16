import { NextResponse } from 'next/server';
import ping from 'ping';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.resolve(process.cwd(), 'stride.config.json');

export async function GET() {
  try {
    let piIp = '192.168.1.100';
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        if (config.piIp) piIp = config.piIp;
      } catch (e) {}
    }

    const res = await ping.promise.probe(piIp, {
      timeout: 2,
    });

    const packetLoss = res.packetLoss === 'unknown' ? (res.alive ? 0 : 100) : parseFloat(res.packetLoss);

    return NextResponse.json({
      alive: res.alive,
      latency: res.time === 'unknown' ? 0 : parseFloat(res.time as string),
      packetLoss: isNaN(packetLoss) ? (res.alive ? 0 : 100) : packetLoss,
      lastSync: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
