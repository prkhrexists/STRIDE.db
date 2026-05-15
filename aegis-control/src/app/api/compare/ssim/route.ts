import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { ssim } from 'ssim.js';

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const FLIGHTS_DIR = path.join(DATA_DIR, 'flights');

function haversineDist(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function POST(req: Request) {
  try {
    const { baselineFlightId, currentFlightId, pylonId } = await req.json();

    if (!baselineFlightId || !currentFlightId) {
      return NextResponse.json({ error: 'Missing flight IDs' }, { status: 400 });
    }

    const getFrames = (flightId: string) => {
      const framesDir = path.join(FLIGHTS_DIR, flightId, 'frames');
      if (!fs.existsSync(framesDir)) return [];
      
      const files = fs.readdirSync(framesDir);
      const frames = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const meta = JSON.parse(fs.readFileSync(path.join(framesDir, file), 'utf8'));
          if (!pylonId || meta.pylonId === pylonId) {
            const imgFile = file.replace('.json', '.jpg');
            if (fs.existsSync(path.join(framesDir, imgFile))) {
               frames.push({
                 meta,
                 imgName: imgFile,
                 imgPath: path.join(framesDir, imgFile),
                 url: `/api/flights/image?flightId=${flightId}&file=${imgFile}`
               });
            }
          }
        }
      }
      return frames;
    };

    const baseFrames = getFrames(baselineFlightId);
    const currFrames = getFrames(currentFlightId);

    const matches = [];

    for (const curr of currFrames) {
      let closestBase = null;
      let minDst = 5; // 5 meters max

      for (const base of baseFrames) {
        const dst = haversineDist(curr.meta.lat, curr.meta.lon, base.meta.lat, base.meta.lon);
        if (dst < minDst) {
          minDst = dst;
          closestBase = base;
        }
      }

      if (closestBase) {
        const img1 = await getPixelData(closestBase.imgPath);
        const img2 = await getPixelData(curr.imgPath);

        const ssimResult = ssim(img1 as any, img2 as any);
        const mssim = ssimResult.mssim;

        let severity = 0;
        let changeType = 'NONE';
        
        if (mssim < 0.70) {
          changeType = 'CRITICAL';
          severity = (1 - mssim) * 100;
        } else if (mssim < 0.85) {
          changeType = 'CHANGE DETECTED';
          severity = (1 - mssim) * 100;
        }

        matches.push({
          baseFrame: closestBase.url,
          currentFrame: curr.url,
          ssim: mssim,
          severity,
          lat: curr.meta.lat,
          lon: curr.meta.lon,
          changeType,
          pylonId: curr.meta.pylonId
        });
      }
    }

    return NextResponse.json({ pairs: matches });
  } catch (err: any) {
    console.error("SSIM Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function getPixelData(imagePath: string) {
  const { data, info } = await sharp(imagePath)
    .resize(400) // Fast computation
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
    
  return {
    data: new Uint8Array(data),
    width: info.width,
    height: info.height
  };
}
