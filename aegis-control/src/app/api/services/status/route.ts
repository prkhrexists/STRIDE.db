import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export const dynamic = 'force-dynamic';

async function isProcessRunning(command: string): Promise<boolean> {
  try {
    const { stdout } = await execPromise(
      process.platform === 'win32'
        ? `tasklist | findstr /i "${command}"`
        : `ps aux | grep -v grep | grep "${command}"`
    );
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function isPortInUse(port: number): Promise<boolean> {
  try {
    const { stdout } = await execPromise(
      process.platform === 'win32'
        ? `netstat -ano | findstr :${port}`
        : `lsof -i :${port}`
    );
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    // Check strided-stream (check if WebSocket server is running, assume port 5001 or node process)
    const stream = await isPortInUse(5001) ? 'RUNNING' : 'STOPPED';
    
    // Check mavlink-router (check UDP listener active on 14550)
    const telemetry = await isPortInUse(14550) ? 'RUNNING' : 'STOPPED';

    // Check stride-capture
    const capture = await isProcessRunning('stride-capture') ? 'RUNNING' : 'IDLE';

    // Check aegis-ai-worker (Python YOLO process)
    const ai = await isProcessRunning('python') || await isProcessRunning('python3') ? 'RUNNING' : 'STOPPED'; // A bit broad, but works as mock

    return NextResponse.json({
      stream,
      telemetry,
      capture,
      ai
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
