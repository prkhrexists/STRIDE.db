import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const FLIGHTS_DIRS = [
  path.resolve(process.cwd(), 'data', 'flights'),
  path.resolve(process.cwd(), 'public', 'data', 'flights'),
];

function loadFlightData() {
  const allFlights: any[] = [];

  for (const root of FLIGHTS_DIRS) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs.readdirSync(root).filter(d => {
      try { return fs.statSync(path.join(root, d)).isDirectory(); } catch { return false; }
    });

    for (const dir of dirs) {
      const flightPath = path.join(root, dir);
      const manifestPath = path.join(flightPath, 'manifest.json');
      const metadataPath = path.join(flightPath, 'metadata.json');
      const resultsPath = path.join(flightPath, 'results.json');

      let manifest: any = {};
      let results: any = {};

      if (fs.existsSync(manifestPath)) {
        try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch {}
      } else if (fs.existsSync(metadataPath)) {
        try { manifest = JSON.parse(fs.readFileSync(metadataPath, 'utf8')); } catch {}
      }

      if (fs.existsSync(resultsPath)) {
        try { results = JSON.parse(fs.readFileSync(resultsPath, 'utf8')); } catch {}
      }

      allFlights.push({ dir, manifest, results, path: flightPath });
    }
  }

  return allFlights;
}

export async function POST(req: Request) {
  try {
    const config = await req.json();

    // Load real flight data
    const flights = loadFlightData();

    // Aggregate defects from all flights
    let allDefects: any[] = [];
    let totalFrames = 0;
    const flightSummaries: any[] = [];

    for (const flight of flights) {
      const defects = flight.results?.defects || [];
      const frames = flight.results?.totalFrames || flight.manifest?.frameCount || 0;
      totalFrames += frames;
      allDefects = allDefects.concat(defects);

      flightSummaries.push({
        id: flight.manifest?.name || flight.dir,
        date: flight.manifest?.date || flight.manifest?.timestamp?.split('T')[0] || '---',
        frames,
        alt: '42m',
        duration: `${Math.round(frames * 5 / 60)}m ${(frames * 5) % 60}s`,
        defectCount: defects.length,
        healthScore: flight.results?.healthScore ?? 100,
      });
    }

    const criticalDefects = allDefects.filter(d => d.severity === 'CRITICAL');
    const avgHealth = flights.length > 0
      ? Math.round(flights.reduce((sum, f) => sum + (f.results?.healthScore ?? 100), 0) / flights.length)
      : 100;

    // Ensure reports directory exists
    const reportsDir = path.join(process.cwd(), 'data', 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });

    const filename = `report_${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, filename);

    // Build PDF with real data
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Header
    doc.fillColor('#1a56db')
       .fontSize(28)
       .text('STRIDE', { align: 'center', continued: true })
       .fillColor('#333333')
       .text(' Inspection Report', { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(10)
       .fillColor('#888888')
       .text(`Generated: ${new Date().toISOString()}`, { align: 'center' })
       .text(`Type: ${config.type || 'Full Inspection'}`, { align: 'center' })
       .moveDown(1.5);

    // Executive Summary
    doc.fontSize(16).fillColor('#1a56db').text('Executive Summary').moveDown(0.5);
    doc.fontSize(11).fillColor('#333333')
       .text(`This report covers ${flights.length} inspection flight(s) with a total of ${totalFrames} captured frames.`)
       .text(`AI analysis detected ${allDefects.length} defect(s), of which ${criticalDefects.length} are CRITICAL.`)
       .text(`Overall structural health score: ${avgHealth}%`)
       .moveDown(1);

    // Statistics
    doc.fontSize(16).fillColor('#1a56db').text('Statistics').moveDown(0.5);
    doc.fontSize(11).fillColor('#333333');
    doc.text(`Total Flights: ${flights.length}`);
    doc.text(`Total Frames Analyzed: ${totalFrames}`);
    doc.text(`Total Defects Found: ${allDefects.length}`);
    doc.text(`Critical Defects: ${criticalDefects.length}`);
    doc.text(`Average Health Score: ${avgHealth}%`);
    doc.moveDown(1);

    // Defect Inventory
    if (allDefects.length > 0) {
      doc.fontSize(16).fillColor('#1a56db').text('Defect Inventory').moveDown(0.5);
      doc.fontSize(10).fillColor('#333333');

      const top10 = allDefects.slice(0, 10);
      for (const defect of top10) {
        const sev = defect.severity || 'UNKNOWN';
        const conf = typeof defect.confidence === 'number' ? `${(defect.confidence * 100).toFixed(0)}%` : 'N/A';
        doc.text(`• [${sev}] ${defect.type} at ${defect.location || defect.zone || 'Unknown'} — Confidence: ${conf}`);
        if (defect.recommendedAction) {
          doc.fillColor('#666666').text(`  Action: ${defect.recommendedAction}`).fillColor('#333333');
        }
      }
      if (allDefects.length > 10) {
        doc.text(`  ... and ${allDefects.length - 10} more defects`);
      }
      doc.moveDown(1);
    }

    // Flight Summaries
    doc.fontSize(16).fillColor('#1a56db').text('Flight Summaries').moveDown(0.5);
    doc.fontSize(10).fillColor('#333333');
    for (const flight of flightSummaries) {
      doc.text(`Flight: ${flight.id} | Date: ${flight.date} | Frames: ${flight.frames} | Defects: ${flight.defectCount} | Health: ${flight.healthScore}%`);
    }

    // Footer
    doc.fontSize(9)
       .fillColor('#888888')
       .text('Generated by STRIDE Dashboard | CONFIDENTIAL', 50, doc.page.height - 50, { align: 'center', lineBreak: false });

    doc.end();

    // Wait for the file to finish writing
    await new Promise((resolve) => writeStream.on('finish', resolve));

    // Build response data for frontend preview
    const priorityItems = criticalDefects.slice(0, 5).map((d, i) => ({
      id: `p${i + 1}`,
      zone: d.location || d.zone || 'Unknown',
      type: d.type,
      gps: d.gps ? `${d.gps.lat?.toFixed(4)}, ${d.gps.lon?.toFixed(4)}` : 'N/A',
      flight: d.frameFile || 'N/A',
      action: d.recommendedAction || 'Inspect',
      urgency: 5 - i,
      conf: typeof d.confidence === 'number' ? Math.round(d.confidence * 100) : 0,
    }));

    const inventory = allDefects.slice(0, 20).map((d, i) => ({
      id: `i${i + 1}`,
      zone: d.location || d.zone || 'Unknown',
      flight: d.frameFile || 'N/A',
      type: d.type,
      severity: d.severity,
      conf: typeof d.confidence === 'number' ? Math.round(d.confidence * 100) : 0,
      gps: d.gps ? `${d.gps.lat?.toFixed(4)}, ${d.gps.lon?.toFixed(4)}` : 'N/A',
      action: d.recommendedAction || 'Monitor',
    }));

    const reportData = {
      summary: `STRIDE-Inspector AI Analysis: ${flights.length} flight(s) analyzed with ${totalFrames} frames. ${allDefects.length} defects detected, ${criticalDefects.length} critical. Average health: ${avgHealth}%.`,
      stats: { total: allDefects.length, critical: criticalDefects.length, flights: flights.length, healthScore: avgHealth },
      priorityItems,
      inventory,
      flights: flightSummaries,
    };

    return NextResponse.json({
      success: true,
      reportPath: filePath,
      downloadUrl: `/api/report/download?file=${filename}`,
      pageCount: 3,
      defectCount: allDefects.length,
      reportData,
    });
  } catch (error) {
    console.error('[report/generate]', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
