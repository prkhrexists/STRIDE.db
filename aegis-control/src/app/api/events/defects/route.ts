import { NextResponse } from 'next/server';
import { defectEvents } from '@/lib/defectEvents';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const onDefect = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };
      
      defectEvents.on('critical_defect', onDefect);
      
      req.signal.addEventListener('abort', () => {
        defectEvents.off('critical_defect', onDefect);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
