export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Mock SSE Rsync
      const totalFiles = Math.floor(Math.random() * 200) + 50;
      sendEvent({ status: 'started', total: totalFiles, message: `Starting rsync from /mnt/usb/stride_data/...` });

      let synced = 0;
      while (synced < totalFiles) {
        await new Promise(r => setTimeout(r, 200));
        const chunk = Math.floor(Math.random() * 5) + 1;
        synced = Math.min(synced + chunk, totalFiles);
        sendEvent({ 
          status: 'syncing', 
          synced, 
          total: totalFiles, 
          percent: Math.round((synced / totalFiles) * 100),
          message: `Transferring frame_${synced.toString().padStart(4, '0')}.jpg...`
        });
      }

      sendEvent({ status: 'completed', total: totalFiles, message: 'Sync complete.' });
      controller.close();
    }
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
