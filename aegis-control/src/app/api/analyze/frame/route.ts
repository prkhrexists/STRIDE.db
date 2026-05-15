import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { imagePath, flightId, frameId } = await req.json();

    const resultPath = path.join(process.cwd(), 'data', 'flights', flightId, 'analysis');
    fs.mkdirSync(resultPath, { recursive: true });

    // Mocking the analysis for now (fallback to basic JSON structure if ONNX fails)
    const analysis = {
      overallCondition: "DEFECT",
      defects: [
        {
          type: "crack",
          severity: "high",
          confidence: 0.92,
          bbox: { x: 0.2, y: 0.3, w: 0.1, h: 0.4 },
          description: "Large vertical crack"
        }
      ]
    };

    fs.writeFileSync(path.join(resultPath, `${frameId}.json`), JSON.stringify(analysis, null, 2));

    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}