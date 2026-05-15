import { NextResponse } from 'next/server';

export async function GET() {
  // Simulate checking drone telemetry
  await new Promise(resolve => setTimeout(resolve, 800));

  const checks = [
    { id: 'gps', label: 'GPS fix', value: '3D Fix / 14 sats', status: 'pass' },
    { id: 'battery', label: 'Battery voltage', value: '22.4V (>20V required)', status: 'pass' },
    { id: 'compass', label: 'Compass calibrated', value: 'YES', status: 'pass' },
    { id: 'rc', label: 'RC signal', value: 'Not detected', status: 'warn' },
    { id: 'accel', label: 'Accelerometer', value: 'Calibrated', status: 'pass' },
    { id: 'arming', label: 'Arming checks', value: 'PASSED', status: 'pass' },
    { id: 'mavlink', label: 'MAVLink connection', value: 'CONNECTED', status: 'pass' },
  ];

  const fails = checks.filter(c => c.status === 'fail').length;
  const ready = fails === 0;

  return NextResponse.json({ checks, ready, fails });
}
