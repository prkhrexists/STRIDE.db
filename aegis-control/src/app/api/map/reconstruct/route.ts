import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { progressEvents } from '@/lib/progressEvents';

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const FLIGHTS_DIR = path.join(DATA_DIR, 'flights');
const MODELS_DIR = path.join(DATA_DIR, 'models');

export async function POST(req: Request) {
  try {
    const { flightId, pylonId } = await req.json();

    const framesDir = path.join(FLIGHTS_DIR, flightId, 'frames');
    if (!fs.existsSync(framesDir)) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
    }

    const files = fs.readdirSync(framesDir);
    const frames = files.filter(f => f.endsWith('.json')).map(f => {
      const meta = JSON.parse(fs.readFileSync(path.join(framesDir, f), 'utf8'));
      meta.imgFile = f.replace('.json', '.jpg');
      return meta;
    }).filter(f => !pylonId || f.pylonId === pylonId);

    const taskId = crypto.randomUUID();

    // Start fallback sparse reconstruction asynchronously
    setTimeout(async () => {
       // Simulate ODM progress
       for (let i = 10; i <= 100; i += 15) {
         progressEvents.emit(`progress-${taskId}`, i);
         await new Promise(r => setTimeout(r, 600));
       }

       const modelDir = path.join(MODELS_DIR, pylonId || 'unknown', flightId);
       fs.mkdirSync(modelDir, { recursive: true });
       
       // Sparse reconstruction fallback
       const sparseData = {
         type: 'sparse',
         frames: frames.map(f => ({
            lat: f.lat, lon: f.lon, alt: f.alt,
            severity: f.aiAnalysis?.overallCondition || 'good',
            defects: f.aiAnalysis?.defects || [],
            imgUrl: `/api/flights/image?flightId=${flightId}&file=${f.imgFile}`
         }))
       };

       fs.writeFileSync(path.join(modelDir, 'sparse.json'), JSON.stringify(sparseData, null, 2));

       progressEvents.emit(`complete-${taskId}`, { url: `/api/map/model?flightId=${flightId}&pylonId=${pylonId}` });

    }, 500);

    return NextResponse.json({ success: true, taskId, fallback: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
