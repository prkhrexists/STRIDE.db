import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const reportsDir = path.join(process.cwd(), 'data', 'reports');

  if (!fs.existsSync(reportsDir)) {
    return NextResponse.json({ reports: [] });
  }

  try {
    const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.pdf'));

    const reports = files.map(filename => {
      const filepath = path.join(reportsDir, filename);
      const stats = fs.statSync(filepath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

      return {
        id: filename.replace('.pdf', ''),
        filename,
        date: stats.mtime.toISOString().split('T')[0],
        size: `${sizeMB} MB`,
        downloadUrl: `/api/report/download?file=${filename}`,
      };
    });

    // Sort newest first
    reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ reports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
