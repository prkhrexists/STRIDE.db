import { NextRequest, NextResponse } from 'next/server';
import { mavlinkManager } from '@/lib/mavlink';
import { getOrCreateSessionId, getSessionDir } from '@/lib/captureSession';
import fs from 'fs';
import path from 'path';
import piexif from 'piexifjs';

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

    const state = mavlinkManager.getCurrentState();
    
    const ip = cameraConfig?.ip || '192.168.1.100';
    const port = cameraConfig?.port || '5001';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const snapRes = await fetch(`http://${ip}:${port}/snapshot`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!snapRes.ok) throw new Error('Failed to fetch snapshot from Pi Camera');
    const arrayBuffer = await snapRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let jpegDataBinaryString = buffer.toString('binary');
    
    const lat = state.lat || 0;
    const lon = state.lon || 0;
    const alt = state.alt || 0;

    const zerothIfd: any = {};
    const exifIfd: any = {};
    const gpsIfd: any = {};

    gpsIfd[piexif.GPSIFD.GPSLatitudeRef] = lat < 0 ? 'S' : 'N';
    gpsIfd[piexif.GPSIFD.GPSLatitude] = degToDmsRational(Math.abs(lat));
    gpsIfd[piexif.GPSIFD.GPSLongitudeRef] = lon < 0 ? 'W' : 'E';
    gpsIfd[piexif.GPSIFD.GPSLongitude] = degToDmsRational(Math.abs(lon));
    gpsIfd[piexif.GPSIFD.GPSAltitudeRef] = alt < 0 ? 1 : 0;
    gpsIfd[piexif.GPSIFD.GPSAltitude] = [Math.round(Math.abs(alt) * 1000), 1000];

    const exifObj = { "0th": zerothIfd, "Exif": exifIfd, "GPS": gpsIfd };
    const exifbytes = piexif.dump(exifObj);
    const newData = piexif.insert(exifbytes, jpegDataBinaryString);
    const finalBuffer = Buffer.from(newData, 'binary');

    const sessionId = getOrCreateSessionId();
    const sessionDir = getSessionDir();
    const framesDir = path.join(sessionDir, 'frames');
    
    if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

    const filename = `${timestamp}_${lat.toFixed(6)}_${lon.toFixed(6)}.jpg`;
    const filepath = path.join(framesDir, filename);
    fs.writeFileSync(filepath, finalBuffer);

    const metaFilename = filename.replace('.jpg', '.json');
    const metaPath = path.join(framesDir, metaFilename);
    const metadata = { timestamp, lat, lon, alt, heading: state.heading, pylonId, frameIndex };
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

    const baseUrl = new URL(req.url).origin;
    fetch(`${baseUrl}/api/detect/defects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imagePath: filepath,
        sidecarPath: metaPath,
        gps: { lat, lon, alt },
        frameIndex
      })
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      frameIndex,
      savedPath: filepath,
      gps: { lat, lon, alt }
    });

  } catch (error: any) {
    console.error("Frame capture error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
