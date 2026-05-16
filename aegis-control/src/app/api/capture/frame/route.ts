import { NextRequest, NextResponse } from 'next/server';
import { readConfig } from '@/lib/piConfig';
import { getOrCreateSessionId, getSessionDir } from '@/lib/captureSession';
import { defectEvents } from '@/lib/defectEvents';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

function degToDmsRational(deg: number) {
  const d = Math.floor(deg);
  const minFloat = (deg - d) * 60;
  const m = Math.floor(minFloat);
  const secFloat = (minFloat - m) * 60;
  const s = Math.round(secFloat * 10000);
  return [[d, 1], [m, 1], [s, 10000]];
}

export async function POST(req: NextRequest) {
  try {
    const { pylonId, interval, timestamp, cameraConfig, frameIndex } = await req.json();

    // Read Pi config
    const config = readConfig();
    const ip = cameraConfig?.ip || config.piIp || '10.39.139.34';
    const port = cameraConfig?.port || config.streamPort || '5001';

    // ── Step 1: Fetch snapshot from Pi ──────────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const snapRes = await fetch(`http://${ip}:${port}/snapshot`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!snapRes.ok) throw new Error(`Snapshot HTTP ${snapRes.status} from Pi`);
    const arrayBuffer = await snapRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // GPS data (MAVLink or mock)
    const lat = 28.6139 + (Math.random() - 0.5) * 0.001;
    const lon = 77.2090 + (Math.random() - 0.5) * 0.001;
    const alt = 42.0 + Math.random() * 5;

    // Try to embed EXIF GPS
    let finalBuffer = buffer;
    try {
      const piexif = require('piexifjs');
      let jpegDataBinaryString = buffer.toString('binary');
      const gpsIfd: any = {};
      gpsIfd[piexif.GPSIFD.GPSLatitudeRef] = lat < 0 ? 'S' : 'N';
      gpsIfd[piexif.GPSIFD.GPSLatitude] = degToDmsRational(Math.abs(lat));
      gpsIfd[piexif.GPSIFD.GPSLongitudeRef] = lon < 0 ? 'W' : 'E';
      gpsIfd[piexif.GPSIFD.GPSLongitude] = degToDmsRational(Math.abs(lon));
      gpsIfd[piexif.GPSIFD.GPSAltitudeRef] = alt < 0 ? 1 : 0;
      gpsIfd[piexif.GPSIFD.GPSAltitude] = [Math.round(Math.abs(alt) * 1000), 1000];
      const exifObj = { '0th': {}, Exif: {}, GPS: gpsIfd };
      const exifbytes = piexif.dump(exifObj);
      const newData = piexif.insert(exifbytes, jpegDataBinaryString);
      finalBuffer = Buffer.from(newData, 'binary');
    } catch (exifErr) {
      console.warn('[capture/frame] EXIF embed skipped:', (exifErr as Error).message);
    }

    // ── Step 2: Save raw frame to flight session dir ─────────────────────
    const sessionId = getOrCreateSessionId();
    const sessionDir = getSessionDir();
    const framesDir = path.join(sessionDir, 'frames');
    if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

    const ts = timestamp || Date.now();
    const filename = `${ts}_${lat.toFixed(6)}_${lon.toFixed(6)}.jpg`;
    const filepath = path.join(framesDir, filename);
    fs.writeFileSync(filepath, finalBuffer);

    // Write sidecar metadata JSON (will be enriched by YOLO below)
    const metaFilename = filename.replace('.jpg', '.json');
    const metaPath = path.join(framesDir, metaFilename);
    const metadata = {
      timestamp: ts,
      lat,
      lon,
      alt,
      heading: Math.random() * 360,
      pylonId: pylonId || 'default',
      frameIndex: frameIndex || 0,
      sessionId,
    };
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

    // ── Step 3: Run YOLO via analyzer.py ────────────────────────────────
    const analyzerPath = path.join(process.cwd(), 'server', 'analyzer.py');
    const publicDir = path.join(process.cwd(), 'public');
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const flightId = `flight_${sessionId}`;

    let yoloResult: any = null;
    let snapshotUrl: string | null = null;

    try {
      const cmd = `${pythonCmd} "${analyzerPath}" --source file --filepath "${filepath}" --flightId "${flightId}" --frameIndex ${frameIndex ?? 0} --base_dir "${publicDir}"`;
      const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });

      if (stderr) console.warn('[capture/frame] YOLO stderr:', stderr.slice(0, 500));

      const jsonStart = stdout.indexOf('{');
      if (jsonStart !== -1) {
        yoloResult = JSON.parse(stdout.substring(jsonStart));
        snapshotUrl = yoloResult.snapshotUrl || null;
      }
    } catch (yoloErr: any) {
      console.error('[capture/frame] YOLO failed:', yoloErr.message);
      // Non-fatal — frame is still stored, we just won't have YOLO annotations
    }

    // ── Step 4: Enrich sidecar with YOLO results ─────────────────────────
    if (yoloResult) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        meta.yoloAnalysis = {
          status: yoloResult.status,
          detections: yoloResult.detections || [],
          maxConf: yoloResult.maxConf || 0,
          snapshotUrl: yoloResult.snapshotUrl,
          note: yoloResult.note,
        };
        // Also write compatible aiAnalysis block so endSession() can aggregate
        const defects = (yoloResult.detections || []).map((d: any) => ({
          type: d.class,
          severity: d.severity,
          confidence: d.conf,
          description: `${d.class} detected — conf ${d.conf.toFixed(2)}, area ${d.area_pct?.toFixed(1)}%`,
          location: pylonId || 'Unknown',
          recommendedAction:
            d.severity === 'CRITICAL'
              ? 'Immediate epoxy injection required'
              : d.severity === 'MODERATE'
              ? 'Schedule patching within 30 days'
              : 'Monitor — re-inspect in 90 days',
          bbox: { x: d.x, y: d.y, w: d.w, h: d.h },
        }));
        meta.aiAnalysis = {
          defects,
          overallCondition:
            yoloResult.status === 'CRITICAL'
              ? 'REQUIRES_ATTENTION'
              : yoloResult.status === 'DEFECT'
              ? 'FAIR'
              : 'GOOD',
          needsImmediateAttention: yoloResult.status === 'CRITICAL',
        };
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      } catch (writeErr) {
        console.error('[capture/frame] Failed to write YOLO to sidecar:', writeErr);
      }

      // ── Step 5: Emit SSE event for critical defects ───────────────────
      if (yoloResult.status === 'CRITICAL') {
        defectEvents.emit('critical_defect', {
          type: 'CRITICAL_DEFECT',
          frame: filename,
          detections: yoloResult.detections,
          snapshotUrl,
          gps: { lat, lon, alt },
          frameIndex,
        });
      }
    }

    return NextResponse.json({
      success: true,
      frameIndex: frameIndex || 0,
      savedPath: filepath,
      gps: { lat, lon, alt },
      sessionId,
      flightId,
      yolo: yoloResult
        ? {
            status: yoloResult.status,
            detectionCount: (yoloResult.detections || []).length,
            maxConf: yoloResult.maxConf,
            snapshotUrl,
          }
        : null,
    });
  } catch (error: any) {
    console.error('[capture/frame] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
