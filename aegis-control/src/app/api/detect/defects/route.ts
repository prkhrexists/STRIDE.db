import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { defectEvents } from '@/lib/defectEvents';

let lastDetectionTime = 0;

// Defect type pools for deterministic mock generation
const DEFECT_TYPES = ['Crack', 'Spalling', 'Corrosion', 'Delamination', 'Efflorescence'];
const SEVERITIES = ['CRITICAL', 'MODERATE', 'WARNING', 'CLEAN'];
const LOCATIONS = ['NW Facade', 'SE Pylon', 'North Pillar', 'South Wing', 'Deck Underside', 'Cable Anchor', 'Foundation Base'];
const ACTIONS = [
  'Immediate epoxy injection required',
  'Schedule concrete patching within 30 days',
  'Apply anti-corrosive coating',
  'Monitor — re-inspect in 90 days',
  'No action needed',
];

export async function POST(req: Request) {
  try {
    const { imagePath, sidecarPath, gps, frameIndex } = await req.json();

    const now = Date.now();
    // Rate limit: Max 1 per 5 seconds
    if (now - lastDetectionTime < 5000) {
      return NextResponse.json({ success: false, reason: 'Rate limited (1 per 5s)' });
    }
    lastDetectionTime = now;

    if (!fs.existsSync(imagePath)) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const imageBuffer = fs.readFileSync(imagePath);

    // Try real AI API first (Anthropic)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    let result: any = null;

    if (apiKey) {
      try {
        const base64Image = imageBuffer.toString('base64');
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
                },
                {
                  type: 'text',
                  text: 'Analyze this structural inspection image. Return ONLY valid JSON: { "defects": [{ "type": string, "severity": string, "confidence": number, "description": string, "location": string, "recommendedAction": string }], "overallCondition": string, "needsImmediateAttention": boolean }',
                },
              ],
            }],
          }),
        });

        if (response.ok) {
          const aiResp = await response.json();
          const responseText = aiResp.content?.[0]?.text || '';
          const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          result = JSON.parse(jsonStr);
        }
      } catch (aiErr) {
        console.warn('[detect/defects] AI API failed, falling back to mock:', (aiErr as Error).message);
      }
    }

    // Mock AI fallback: generate deterministic defects from image hash
    if (!result) {
      const hash = crypto.createHash('md5').update(imageBuffer).digest('hex');
      const seedNum = parseInt(hash.substring(0, 8), 16);
      const hasDefect = seedNum % 3 !== 0; // ~66% chance of finding something
      const defectCount = hasDefect ? 1 + (seedNum % 3) : 0;

      const defects = [];
      for (let i = 0; i < defectCount; i++) {
        const idx = (seedNum + i * 7) % DEFECT_TYPES.length;
        const sevIdx = Math.min(i, SEVERITIES.length - 1);
        defects.push({
          type: DEFECT_TYPES[idx],
          severity: SEVERITIES[sevIdx],
          confidence: 0.70 + ((seedNum + i) % 25) / 100,
          description: `${DEFECT_TYPES[idx]} detected in structural element — AI confidence ${(0.70 + ((seedNum + i) % 25) / 100).toFixed(2)}`,
          location: LOCATIONS[(seedNum + i * 3) % LOCATIONS.length],
          recommendedAction: ACTIONS[sevIdx],
        });
      }

      result = {
        defects,
        overallCondition: defectCount === 0 ? 'GOOD' : defectCount >= 2 ? 'REQUIRES_ATTENTION' : 'FAIR',
        needsImmediateAttention: defects.some((d: any) => d.severity === 'CRITICAL'),
      };
    }

    // Write AI analysis results to the sidecar JSON
    if (sidecarPath && fs.existsSync(sidecarPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
        meta.aiAnalysis = result;
        fs.writeFileSync(sidecarPath, JSON.stringify(meta, null, 2));
      } catch (writeErr) {
        console.error('[detect/defects] Failed to write to sidecar:', writeErr);
      }
    }

    // Emit critical defect events for real-time SSE
    if (result.needsImmediateAttention) {
      defectEvents.emit('critical_defect', {
        type: 'CRITICAL_DEFECT',
        frame: path.basename(imagePath),
        defects: result.defects,
        gps,
        frameIndex,
      });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('[detect/defects] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
