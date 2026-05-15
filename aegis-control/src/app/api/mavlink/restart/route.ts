import { NextResponse } from 'next/server';

export async function POST() {
  // Simulate service restart
  await new Promise(resolve => setTimeout(resolve, 500));

  return NextResponse.json({ 
    success: true, 
    message: 'MAVLink service restarted successfully.' 
  });
}
