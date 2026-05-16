import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.resolve(process.cwd(), 'stride.config.json');

const DEFAULT_CONFIG = {
  piIp: '192.168.1.100',
  sshPort: '22',
  streamPort: '5001',
  telemetryPort: '14550',
  streamEndpoint: '/stream/video.mjpeg',
  authKey: '********'
};

export async function GET() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return NextResponse.json(config);
    }
    return NextResponse.json(DEFAULT_CONFIG);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { piIp, sshPort, streamPort, telemetryPort, streamEndpoint, authKey } = body;

    // Validation
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipv4Regex.test(piIp)) return NextResponse.json({ error: 'Invalid IPv4 address for Pi IP' }, { status: 400 });

    const validatePort = (port: string) => {
      const p = parseInt(port, 10);
      return !isNaN(p) && p > 0 && p <= 65535;
    };
    if (!validatePort(sshPort) || !validatePort(streamPort) || !validatePort(telemetryPort)) {
      return NextResponse.json({ error: 'Ports must be integers between 1 and 65535' }, { status: 400 });
    }

    if (!authKey || typeof authKey !== 'string') {
      return NextResponse.json({ error: 'Auth key must be a non-empty string' }, { status: 400 });
    }

    const newConfig = { ...DEFAULT_CONFIG };
    if (fs.existsSync(CONFIG_PATH)) {
      Object.assign(newConfig, JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')));
    }
    Object.assign(newConfig, { piIp, sshPort, streamPort, telemetryPort, streamEndpoint, authKey });

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));

    return NextResponse.json({ success: true, config: newConfig });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
