'use client';

import { useEffect, useRef, useCallback } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_PI_WS_URL || 'ws://localhost:3001/stream';

type StreamState = 'idle' | 'connecting' | 'live' | 'error';

interface PiVideoStreamProps {
  enabled: boolean;
  onStateChange?: (state: StreamState) => void;
}

export default function PiVideoStream({ enabled, onStateChange }: PiVideoStreamProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const setState = useCallback(
    (state: StreamState) => {
      onStateChange?.(state);
    },
    [onStateChange]
  );

  useEffect(() => {
    if (!enabled) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (retryRef.current) clearTimeout(retryRef.current);
      setState('idle');
      return;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      setState('connecting');

      const ws = new WebSocket(WS_URL);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        if (!cancelled) setState('connecting');
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        const data = event.data;
        if (!(data instanceof ArrayBuffer)) return;

        const blob = new Blob([data], { type: 'image/jpeg' });
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          if (canvas.width !== img.width || canvas.height !== img.height) {
            canvas.width = img.width;
            canvas.height = img.height;
          }
          ctx.drawImage(img, 0, 0);
          setState('live');
          URL.revokeObjectURL(url);
          if (objectUrlRef.current === url) objectUrlRef.current = null;
        };
        img.onerror = () => URL.revokeObjectURL(url);
        img.src = url;
      };

      ws.onerror = () => {
        if (!cancelled) setState('error');
      };

      ws.onclose = () => {
        if (cancelled) return;
        setState('error');
        retryRef.current = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [enabled, setState]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#000' }}
    />
  );
}

export type { StreamState };
