import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// Mock Analytics Engine Data
const mockDefects = [
  { id: 'D-001', zone: 'North Tower', type: 'Crack', severity: 'CRITICAL', area: '1.2 sq m' },
  { id: 'D-002', zone: 'Deck Underside', type: 'Spalling', severity: 'MODERATE', area: '0.5 sq m' },
  { id: 'D-003', zone: 'Pier 3', type: 'Corrosion', severity: 'WARNING', area: '2.1 sq m' },
  { id: 'D-004', zone: 'South Tower', type: 'Crack', severity: 'CRITICAL', area: '0.8 sq m' },
];

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const lastUserMsg = messages[messages.length - 1].content.toLowerCase();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendChunk = async (text: string) => {
        const payload = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
        controller.enqueue(encoder.encode(payload));
        await sleep(30);
      };

      await sleep(500);

      if (lastUserMsg.includes('summarize critical')) {
        await sendChunk('Based on the current telemetry and image analysis from the past 3 flights, there are **2 CRITICAL** defects that require immediate attention.\n\n');
        await sendChunk('[TABLE: defects]\n\n');
        await sendChunk('These are concentrated on the **North Tower** and **South Tower**. ');
        await sendChunk('The structural risk level is currently estimated at **HIGH** due to the location of the cracks near primary load-bearing joints. ');
        await sendChunk('I recommend generating a full repair recommendation report immediately.');
      } else if (lastUserMsg.includes('compare flight')) {
        await sendChunk('Comparing **Flight 001** (Baseline) with **Flight 002** (Post-Storm):\n\n');
        await sendChunk('- **Total Defects**: Increased from 12 to 14.\n');
        await sendChunk('- **Deterioration**: The crack on the North Tower (D-001) has widened by 4% based on SSIM analysis.\n');
        await sendChunk('- **New Defects**: Minor spalling detected on Deck Underside.\n\n');
        await sendChunk('[CHART: severity]\n\n');
        await sendChunk('The structure is generally stable, but the progressive crack widening is a concern.');
      } else if (lastUserMsg.includes('repair recommendation')) {
        await sendChunk('Here are the **Priority Repair Recommendations** based on the detected defect types and severity:\n\n');
        await sendChunk('1. **D-001 (Crack, North Tower)**: Inject epoxy resin to seal the crack and prevent moisture ingress. Estimated urgency: **Immediate (Within 7 days)**.\n');
        await sendChunk('2. **D-004 (Crack, South Tower)**: Similar epoxy injection required. Urgency: **Immediate**.\n');
        await sendChunk('3. **D-003 (Corrosion, Pier 3)**: Sandblast the affected area, apply rust inhibitor, and recoat with marine-grade paint. Urgency: **Within 30 days**.\n\n');
        await sendChunk('Would you like me to compile this into a formal PDF report?');
      } else if (lastUserMsg.includes('executive summary')) {
        await sendChunk('**Executive Summary: Bridge Inspection Q2**\n\n');
        await sendChunk('The recent UAV inspection of the Highway Bridge Deck successfully analyzed 145 frames across 3 flight zones. ');
        await sendChunk('The overall structural health score is calculated at **78% (MODERATE RISK)**. ');
        await sendChunk('While the majority of the deck remains structurally sound, targeted interventions are required for **2 critical cracks** on the main pylons. ');
        await sendChunk('Early intervention will prevent costly structural retrofitting in the future.');
      } else if (lastUserMsg.includes('structural risk')) {
        await sendChunk('I have run the defect metadata through our risk assessment model.\n\n');
        await sendChunk('**Current Structural Risk Level: MODERATE-HIGH**\n\n');
        await sendChunk('Risk Factors:\n');
        await sendChunk('- Load-bearing crack propagation (Weight: High)\n');
        await sendChunk('- Environmental exposure corrosion (Weight: Medium)\n\n');
        await sendChunk('[CHART: risk]\n\n');
        await sendChunk('Please review the 3D Analysis Map to visualize the exact stress points.');
      } else {
        const words = "I am processing your request. As an AI Infrastructure Inspection Assistant, I can summarize defects, compare flights, analyze structural risk, or generate repair recommendations based on the loaded telemetry and image data. Please use one of the quick actions or ask a specific question about the current models.".split(' ');
        for (const w of words) {
          await sendChunk(w + ' ');
        }
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });

  return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } });
}
