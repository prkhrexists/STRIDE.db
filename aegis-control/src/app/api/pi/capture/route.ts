import { NextRequest, NextResponse } from 'next/server';
import { readConfig, isConfigured } from '@/lib/piConfig';
import { endSession } from '@/lib/captureSession';

export const dynamic = 'force-dynamic';

// ─── Module-level capture state ──────────────────────────────────────────────
let captureActive = false;
let captureTimer: ReturnType<typeof setInterval> | null = null;
let capturedCount = 0;
let captureStartTime = 0;
let captureInterval = 5; // seconds

export function getCaptureState() {
  return {
    capture_active: captureActive,
    total_captured: capturedCount,
    capture_elapsed_s: captureActive ? Math.floor((Date.now() - captureStartTime) / 1000) : 0,
  };
}

async function captureOneFrame(baseUrl: string) {
  try {
    capturedCount++;
    const res = await fetch(`${baseUrl}/api/capture/frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pylonId: 'default',
        interval: captureInterval,
        timestamp: Date.now(),
        frameIndex: capturedCount,
      }),
    });
    const data = await res.json();
    if (data.success) {
      console.log(`[pi/capture] Frame ${capturedCount} saved: ${data.savedPath}`);
    } else {
      console.error(`[pi/capture] Frame ${capturedCount} failed:`, data.error);
    }
    return data;
  } catch (err: any) {
    console.error(`[pi/capture] Frame ${capturedCount} error:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function POST(req: NextRequest) {
  const config = readConfig();

  if (!isConfigured(config)) {
    return NextResponse.json(
      { success: false, message: 'Configure Pi in Settings before capture' },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const baseUrl = new URL(req.url).origin;

  switch (action) {
    case 'start': {
      if (captureActive) {
        return NextResponse.json({ success: true, message: 'Capture already running', active: true, captured: capturedCount });
      }

      captureActive = true;
      capturedCount = 0;
      captureStartTime = Date.now();
      captureInterval = body.interval || 5;

      // Capture first frame immediately
      const firstFrame = await captureOneFrame(baseUrl);

      // Start interval for subsequent frames
      captureTimer = setInterval(() => {
        captureOneFrame(baseUrl);
      }, captureInterval * 1000);

      return NextResponse.json({
        success: true,
        message: `Capture started — ${captureInterval}s interval`,
        active: true,
        captured: capturedCount,
        firstFrame: firstFrame.success,
      });
    }

    case 'stop': {
      if (captureTimer) {
        clearInterval(captureTimer);
        captureTimer = null;
      }

      const finalCount = capturedCount;
      const elapsed = Math.floor((Date.now() - captureStartTime) / 1000);
      captureActive = false;

      // End the capture session — writes manifest.json + results.json
      try {
        endSession(finalCount);
      } catch (err) {
        console.error('[pi/capture] endSession error:', err);
      }

      return NextResponse.json({
        success: true,
        message: `Capture stopped — ${finalCount} frames in ${elapsed}s`,
        active: false,
        captured: finalCount,
        elapsed,
      });
    }

    case 'snapshot': {
      const result = await captureOneFrame(baseUrl);
      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Snapshot captured' : `Snapshot failed: ${result.error}`,
        active: captureActive,
        captured: capturedCount,
      });
    }

    default:
      return NextResponse.json(
        { success: false, message: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
}
