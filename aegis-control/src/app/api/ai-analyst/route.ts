import { NextRequest, NextResponse } from 'next/server';
import { buildMissionContext } from '@/lib/contextBuilder';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;
    const { systemPrompt } = await buildMissionContext();

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Limit history to last 10 messages for continuity without token bloat
    const history = messages.slice(-10);

    if (!apiKey) {
      // Graceful fallback to Mock Streaming Response if no key is provided
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let fallbackText = "*(Simulated Response - No ANTHROPIC_API_KEY detected)*\n\nBased on the inspection data across the 3 flights, the **Hydro Dam Spillway** requires immediate intervention. We detected two CRITICAL defects (d5, d6) in the left spillway face. I recommend urgent epoxy injection and structural review. \n\nHere is a breakdown of the overall risk:\n[CHART: risk]\n\nAnd the defect severity distribution:\n[CHART: severity]";
          
          const lastMsg = history[history.length - 1].content.toLowerCase();
          if (lastMsg.includes('summarize critical')) {
            fallbackText = JSON.stringify({
              type: "defect_summary",
              data: [
                { id: "FL003-d5", type: "Crack", zone: "Spillway Face Left", confidence: "95%", severity: "CRITICAL" },
                { id: "FL003-d6", type: "Spalling", zone: "Spillway Face Left", confidence: "91%", severity: "CRITICAL" },
                { id: "FL001-d1", type: "Crack", zone: "Pier 3", confidence: "92%", severity: "CRITICAL" }
              ]
            });
          } else if (lastMsg.includes('compare flight')) {
            fallbackText = JSON.stringify({
              type: "flight_comparison",
              data: { flight1: "Flight 001", flight2: "Flight 002", total_defects_f1: 3, total_defects_f2: 1, health_delta: "+14%", new_defects: 0, resolved_defects: 2, worst_location: "Pier 3" }
            });
          } else if (lastMsg.includes('repair recommendations')) {
            fallbackText = JSON.stringify({
              type: "repair_plan",
              data: [
                { priority: "P1", defect_id: "FL003-d5", method: "High-Pressure Epoxy Injection", urgency: "Immediate" },
                { priority: "P1", defect_id: "FL001-d1", method: "Carbon Fiber Wrap", urgency: "Immediate" },
                { priority: "P2", defect_id: "FL003-d7", method: "Concrete Patching", urgency: "30 Days" }
              ]
            });
          } else if (lastMsg.includes('estimate structural risk')) {
            fallbackText = JSON.stringify({
              type: "risk_matrix",
              data: { score: 9, likelihood: "High", impact: "Catastrophic", factors: ["Critical cracking on primary spillway load path", "Corrosion advancing near cable anchors"] }
            });
          }

          const words = fallbackText.split(' ');
          
          for (let i = 0; i < words.length; i++) {
            const chunk = JSON.stringify({ choices: [{ delta: { content: words[i] + ' ' } }] });
            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
            await new Promise(r => setTimeout(r, 30));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1024,
        system: systemPrompt,
        messages: history.map((m: any) => ({
          role: m.role,
          content: m.content
        })),
        stream: true
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    // Transform Anthropic SSE to OpenAI format so the frontend parser works
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
             try {
               const data = JSON.parse(line.slice(6));
               if (data.type === 'content_block_delta' && data.delta?.text) {
                 const mapped = JSON.stringify({ choices: [{ delta: { content: data.delta.text } }] });
                 controller.enqueue(new TextEncoder().encode(`data: ${mapped}\n\n`));
               }
             } catch {}
          }
        }
      }
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: { 'Content-Type': 'text/event-stream' }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const { stats } = await buildMissionContext();
  return NextResponse.json(stats);
}
