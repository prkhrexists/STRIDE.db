import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { defectEvents } from '@/lib/defectEvents';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

let lastDetectionTime = 0;

export async function POST(req: Request) {
  try {
    const { imagePath, sidecarPath, gps, frameIndex } = await req.json();

    const now = Date.now();
    // Rate limit: Max 1 per 10 seconds
    if (now - lastDetectionTime < 10000) {
      return NextResponse.json({ success: false, reason: 'Rate limited (1 per 10s)' });
    }
    lastDetectionTime = now;

    if (!fs.existsSync(imagePath)) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const openai = new (await import('openai')).default({
      apiKey: process.env.SARVAM_API_KEY || '',
      baseURL: 'https://api.sarvam.ai/v1'
    });

    const response = await openai.chat.completions.create({
      model: 'sarvam-105b',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: 'Analyze structural image. Return ONLY valid JSON: { defects: [{ type, severity, confidence, description, location, recommendedAction }], overallCondition, needsImmediateAttention }'
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            },
            { type: 'text', text: 'Analyze this structural inspection image. Return ONLY valid JSON.' }
          ]
        }
      ]
    });

    const responseText = (msg.content[0] as any).text;
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    if (fs.existsSync(sidecarPath)) {
      const meta = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
      meta.aiAnalysis = result;
      fs.writeFileSync(sidecarPath, JSON.stringify(meta, null, 2));
    }

    if (result.needsImmediateAttention) {
      defectEvents.emit('critical_defect', {
        type: 'CRITICAL_DEFECT',
        frame: path.basename(imagePath),
        defects: result.defects,
        gps,
        frameIndex
      });
    }

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("AI Detection Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
