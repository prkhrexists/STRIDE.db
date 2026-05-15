import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const ip = req.nextUrl.searchParams.get('ip') || '192.168.1.100';
  const port = req.nextUrl.searchParams.get('port') || '5001';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`http://${ip}:${port}/snapshot`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Failed to get snapshot');
    
    return new Response(response.body, {
      headers: { 'Content-Type': 'image/jpeg' }
    });
  } catch (error) {
    // Return a dummy transparent 1x1 pixel or error message
    // For simplicity, just return an error
    return NextResponse.json({ error: 'Snapshot failed' }, { status: 500 });
  }
}
