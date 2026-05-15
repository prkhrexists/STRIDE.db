import { NextRequest, NextResponse } from 'next/server';

let configStore: any = {
  piIp: '192.168.1.100',
  sshPort: '22',
  telemetryPort: '14550',
  streamEndpoint: '/stream/video.mjpeg',
};

export async function GET() {
  return NextResponse.json({ config: configStore });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    configStore = { ...configStore, ...data };
    return NextResponse.json({ success: true, config: configStore });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to parse config' }, { status: 400 });
  }
}
