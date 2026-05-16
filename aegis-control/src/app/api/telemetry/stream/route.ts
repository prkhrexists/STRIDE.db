import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/** Legacy SSE endpoint — live telemetry uses WebSocket (mavlinkService). */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const sendAwaiting = () => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'awaiting', linkActive: false })}\n\n`,
          ),
        );
      };
      sendAwaiting();
      const interval = setInterval(sendAwaiting, 5000);
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
