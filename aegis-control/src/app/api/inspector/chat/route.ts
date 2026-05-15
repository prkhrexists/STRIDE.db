import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages, conversationId } = await req.json();
    const apiKey = process.env.SARVAM_API_KEY;

    // Mock Context Aggregation
    const flightSummary = {
      flights: [
        { id: '001', frames: 24, defects: 2, status: 'Analyzed', date: '2026-05-14' },
        { id: '002', frames: 18, defects: 0, status: 'Analyzed', date: '2026-05-13' },
      ],
      defects: [
        { id: 'd1', flight: '001', type: 'crack', severity: 'CRITICAL', zone: 'NW facade', lat: 34.0522, lon: -118.2437 },
        { id: 'd2', flight: '001', type: 'spalling', severity: 'MEDIUM', zone: 'SE pylon', lat: 34.0524, lon: -118.2435 }
      ],
      flaggedItems: ['d1']
    };

    const systemMsg = {
      role: 'system',
      content: `You are AEGIS-Inspector, an expert structural integrity AI for a drone inspection platform.
Today: ${new Date().toISOString().split('T')[0]}. Available data: 2 flights, 42 frames analyzed, 2 defects detected.
FLIGHT DATA SUMMARY: ${JSON.stringify(flightSummary)}
STRUCTURAL STANDARDS: IS:456-2000 (RC), IS:800 (steel), IRC:6 (bridges), ACI 318.
Answer in the language the user writes in. Be precise — cite specific flight IDs, frame numbers, GPS zones, defect types. Prioritize CRITICAL findings first. Format tables using markdown if listing defects.`
    };

    const payload = {
      model: "sarvam-m",
      messages: [systemMsg, ...messages],
      stream: true,
      temperature: 0.3
    };

    if (!apiKey) {
      return simulateFallbackStream(messages);
    }

    const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn("Sarvam API error, falling back to simulation. Error:", err);
      return simulateFallbackStream(messages);
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

// Fallback logic for when SARVAM_API_KEY is not set or API fails
function simulateFallbackStream(messages: any[]) {
  const lastMsg = messages[messages.length - 1].content.toLowerCase();
  
  let responseText = "I received your query. Please note I am running in offline simulation mode because `SARVAM_API_KEY` is not set.\n\n";
  if (lastMsg.includes('critical') || lastMsg.includes('summarize')) {
    responseText += "Here is the summary of the latest critical defects:\n\n| Flight | Zone | Type | Severity | Action |\n|---|---|---|---|---|\n| Flight 001 | NW facade | crack | CRITICAL | Immediate Repair |";
  } else if (lastMsg.includes('flight 001')) {
    responseText += "Flight 001 was conducted on 2026-05-14. It contains 2 defects, including 1 CRITICAL crack in the NW facade. You can view the details here: Flight 001.";
  } else if (lastMsg.includes('repair')) {
    responseText += "Based on current data, the **NW facade** from Flight 001 needs immediate repair due to a CRITICAL crack detected at GPS `34.0522, -118.2437`.";
  } else {
    responseText += "No critical anomalies matched this specific query. Ensure structural compliance with IS:456-2000.";
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const words = responseText.split(' ');
      for (const word of words) {
        const chunk = JSON.stringify({ choices: [{ delta: { content: word + ' ' } }] });
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
        await new Promise(r => setTimeout(r, 50));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
