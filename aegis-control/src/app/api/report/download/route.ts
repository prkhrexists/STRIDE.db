import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get('file');

  if (!file) {
    return new NextResponse('File parameter missing', { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'data', 'reports', file);

  if (!fs.existsSync(filePath)) {
    return new NextResponse('File not found', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${file}"`,
    },
  });
}
