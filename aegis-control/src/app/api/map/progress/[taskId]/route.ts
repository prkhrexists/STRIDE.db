import { progressEvents } from '@/lib/progressEvents';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { taskId: string } }) {
  const stream = new ReadableStream({
    start(controller) {
      const onProgress = (pct: number) => {
        controller.enqueue(`data: ${JSON.stringify({ progress: pct })}\n\n`);
      };
      const onComplete = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify({ complete: true, ...data })}\n\n`);
        controller.close();
      };
      
      progressEvents.on(`progress-${params.taskId}`, onProgress);
      progressEvents.on(`complete-${params.taskId}`, onComplete);
      
      req.signal.addEventListener('abort', () => {
        progressEvents.off(`progress-${params.taskId}`, onProgress);
        progressEvents.off(`complete-${params.taskId}`, onComplete);
      });
    }
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
}
