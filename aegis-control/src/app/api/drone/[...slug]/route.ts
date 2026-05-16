import { NextRequest, NextResponse } from 'next/server';

const USB_SERVICE = `http://localhost:${process.env.USB_REST_PORT ?? 3003}`;

export async function POST(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const slug = params.slug?.join('/') ?? '';
  const body = await req.text();
  try {
    const upstream = await fetch(`${USB_SERVICE}/api/drone/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: 'USB service offline' }, { status: 503 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string[] } }) {
  const slug = params.slug?.join('/') ?? '';
  try {
    const upstream = await fetch(`${USB_SERVICE}/api/drone/${slug}`);
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ connected: false, linkActive: false, port: null, lastHeartbeat: 0, error: 'USB service offline' });
  }
}
