import { NextResponse } from 'next/server';

export async function PATCH(req: Request, { params }: { params: { frameId: string } }) {
  try {
    const { flagged } = await req.json();
    
    // Here we would typically update the DB. For now, simulate success.
    
    return NextResponse.json({ success: true, frameId: params.frameId, flagged });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
