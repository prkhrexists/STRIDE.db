import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Simulate telemetry handshake delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  return NextResponse.json({ 
    connected: true, 
    autopilot: 'ArduCopter V4.3.0', 
    firmware: 'stable' 
  });
}
