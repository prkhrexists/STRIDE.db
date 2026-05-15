import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const config = await req.json();
    
    const configDir = path.join(process.cwd(), 'data', 'config');
    fs.mkdirSync(configDir, { recursive: true });

    const filePath = path.join(configDir, 'drone.json');
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save drone settings' }, { status: 500 });
  }
}
