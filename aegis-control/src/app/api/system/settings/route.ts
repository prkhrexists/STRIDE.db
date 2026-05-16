import { NextRequest, NextResponse } from 'next/server';
import { readConfig, writeConfig, isConfigured } from '@/lib/piConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = readConfig();
  const safe = { ...config };
  if (safe.authKey) safe.authKey = '********';
  return NextResponse.json({ config: safe, configured: isConfigured(config) });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const current = readConfig();

    let authKey = data.authKey;
    if (authKey === '********' || authKey === undefined) {
      authKey = current.authKey;
    }

    const saved = writeConfig({
      piIp: data.piIp ?? current.piIp,
      sshPort: data.sshPort ?? current.sshPort,
      streamPort: data.streamPort ?? current.streamPort,
      telemetryPort: data.telemetryPort ?? current.telemetryPort,
      streamEndpoint: data.streamEndpoint ?? current.streamEndpoint,
      authKey,
      captureInterval: data.captureInterval ?? current.captureInterval,
      configured: Boolean(data.piIp),
    });

    const safe = { ...saved };
    if (safe.authKey) safe.authKey = '********';

    return NextResponse.json({ success: true, config: safe, configured: isConfigured(saved) });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to save config' }, { status: 400 });
  }
}
