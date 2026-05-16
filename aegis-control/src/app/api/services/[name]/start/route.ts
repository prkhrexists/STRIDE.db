import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: { params: { name: string } }) {
  try {
    const { name } = params;
    // In a real application, you would use child_process.exec to start the specific service
    // e.g., exec(`systemctl start ${name}`) or `pm2 start ${name}`
    
    // Simulate slight delay for starting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return NextResponse.json({ success: true, message: `Service ${name} started` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
