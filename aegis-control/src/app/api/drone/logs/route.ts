import { NextResponse } from 'next/server';

export async function GET() {
  const logs = [
    { name: '00000134.bin', size: '4.2 MB', date: '2026-05-14 10:23:00' },
    { name: '00000133.bin', size: '1.8 MB', date: '2026-05-13 14:10:00' },
    { name: '00000132.bin', size: '12.5 MB', date: '2026-05-10 09:45:00' },
    { name: '00000131.bin', size: '0.8 MB', date: '2026-05-10 09:12:00' },
  ];

  return NextResponse.json({ logs });
}
