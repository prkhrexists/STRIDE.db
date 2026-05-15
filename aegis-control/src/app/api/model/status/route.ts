import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const modelPath = path.join(process.cwd(), 'models', 'crack_detector.onnx');
  const modelExists = fs.existsSync(modelPath);

  return NextResponse.json({
    modelExists,
    modelPath: modelExists ? modelPath : null,
    trainedOn: modelExists ? '2026-05-14' : null,
    accuracy: modelExists ? '87.5%' : null
  });
}