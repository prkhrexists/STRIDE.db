import { NextRequest, NextResponse } from 'next/server';

let configStore: any = {
  piIp: '192.168.1.100',
  mavlinkPort: '14550',
  baudRate: '115200',
  maxAltitude: 50,
  maxSpeed: 8,
  rthAltitude: 30,
  captureInterval: 5,
  storagePath: '/mnt/usb/stride_data',
  refreshRate: '10Hz'
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
