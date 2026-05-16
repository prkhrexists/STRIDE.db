import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';
import fs from 'fs';
import { defectEvents } from '@/lib/defectEvents';

const execAsync = util.promisify(exec);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { source, filePath, flightId, frameIndex, sidecarPath, gps } = body;

    if (!flightId) {
      return NextResponse.json({ error: 'Missing flightId' }, { status: 400 });
    }

    if (source === 'file' && !filePath) {
      return NextResponse.json({ error: 'Missing filePath for file source' }, { status: 400 });
    }

    const actualFilePath = filePath?.startsWith('/')
      ? path.join(process.cwd(), 'public', filePath)
      : filePath;

    // Path to the python YOLO script
    const analyzerPath = path.join(process.cwd(), 'server', 'analyzer.py');
    // Annotated images are saved to public/snapshots/<flightId>/<frameIndex>.jpg
    const baseDir = path.join(process.cwd(), 'public');

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const cmd = `${pythonCmd} "${analyzerPath}" --source "${source}" --filepath "${actualFilePath || ''}" --flightId "${flightId}" --frameIndex ${frameIndex ?? 0} --base_dir "${baseDir}"`;

    const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
    if (stderr) console.warn('[analyze] YOLO stderr:', stderr.slice(0, 500));

    try {
      const jsonStr = stdout.substring(stdout.indexOf('{'));
      const result = JSON.parse(jsonStr);

      // If a sidecar path was provided, enrich it with YOLO analysis
      if (sidecarPath && fs.existsSync(sidecarPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
          meta.yoloAnalysis = {
            status: result.status,
            detections: result.detections || [],
            maxConf: result.maxConf || 0,
            snapshotUrl: result.snapshotUrl,
          };
          const defects = (result.detections || []).map((d: any) => ({
            type: d.class,
            severity: d.severity,
            confidence: d.conf,
            description: `${d.class} detected — conf ${d.conf.toFixed(2)}, area ${d.area_pct?.toFixed(1)}%`,
            location: meta.pylonId || 'Unknown',
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
              result.status === 'CRITICAL'
                ? 'REQUIRES_ATTENTION'
                : result.status === 'DEFECT'
                ? 'FAIR'
                : 'GOOD',
            needsImmediateAttention: result.status === 'CRITICAL',
          };
          fs.writeFileSync(sidecarPath, JSON.stringify(meta, null, 2));
        } catch (writeErr) {
          console.error('[analyze] Failed to write sidecar:', writeErr);
        }
      }

      // Emit SSE for critical defects
      if (result.status === 'CRITICAL') {
        defectEvents.emit('critical_defect', {
          type: 'CRITICAL_DEFECT',
          frame: path.basename(actualFilePath || ''),
          detections: result.detections,
          snapshotUrl: result.snapshotUrl,
          gps,
          frameIndex,
        });
      }

      return NextResponse.json(result);
    } catch (parseErr) {
      console.error('[analyze] Python Output:', stdout);
      console.error('[analyze] Python Error:', stderr);
      return NextResponse.json(
        { error: 'Failed to parse YOLO output', details: stderr || stdout },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
