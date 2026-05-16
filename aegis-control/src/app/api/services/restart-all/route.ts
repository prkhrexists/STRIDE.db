import { NextResponse } from 'next/server';

export async function POST() {
  const services = ['stream', 'telemetry', 'capture', 'ai'];
  const results = [];

  for (const service of services) {
    // Simulate stopping and starting
    await new Promise(r => setTimeout(r, 600));
    results.push({
      service,
      status: 'RESTARTED',
      pid: Math.floor(Math.random() * 10000) + 1000
    });
  }

  return NextResponse.json({ success: true, results });
}
