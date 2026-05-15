import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const ip = req.nextUrl.searchParams.get('ip') || '192.168.1.100';
  const port = req.nextUrl.searchParams.get('port') || '5001';
  
  try {
    const response = await fetch(`http://${ip}:${port}/stream`, {
      signal: req.signal
    });
    
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'multipart/x-mixed-replace; boundary=frame',
      }
    });
  } catch (error) {
    console.error("PiCam stream error:", error);
    return new Response('Stream unavailable', { status: 502 });
  }
}
