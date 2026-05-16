/**
 * WebSocket MJPEG proxy: Pi HTTP stream -> ws://localhost:3001/stream
 * Reads connection settings from stride.config.json (updated via Settings save).
 */
const http = require('http');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const {
  readConfig,
  isConfigured,
  getStreamUrl,
  getAuthHeaders,
  CONFIG_PATH,
} = require('../lib/piConfig');

const WS_PORT = Number(process.env.PI_WS_PORT || 3001);
const WS_PATH = '/stream';

/** @type {Set<import('ws').WebSocket>} */
const clients = new Set();

let upstreamAbort = null;
let upstreamActive = false;
let reconnectTimer = null;

function log(...args) {
  console.log('[piProxy]', ...args);
}

function parseBoundary(contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType || '');
  const raw = match ? (match[1] || match[2]) : 'frame';
  return raw.replace(/^--/, '');
}

class MjpegFrameParser {
  constructor(boundary) {
    this.delimiter = Buffer.from(`--${boundary.replace(/^--/, '')}`);
    this.buffer = Buffer.alloc(0);
  }

  /** @returns {Buffer[]} */
  push(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const frames = [];
    let searchFrom = 0;

    while (true) {
      const start = this.buffer.indexOf(this.delimiter, searchFrom);
      if (start === -1) break;

      const next = this.buffer.indexOf(this.delimiter, start + this.delimiter.length);
      if (next === -1) {
        this.buffer = this.buffer.subarray(start);
        return frames;
      }

      const part = this.buffer.subarray(start + this.delimiter.length, next);
      const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
      if (headerEnd !== -1) {
        let body = part.subarray(headerEnd + 4);
        while (body.length >= 2 && (body[body.length - 1] === 0x0a || body[body.length - 1] === 0x0d)) {
          body = body.subarray(0, body.length - 1);
        }
        if (body.length > 2 && body[0] === 0xff && body[1] === 0xd8) {
          frames.push(body);
        }
      }

      searchFrom = next;
    }

    if (searchFrom > 0) {
      this.buffer = this.buffer.subarray(searchFrom);
    }
    return frames;
  }
}

function broadcastFrame(frame) {
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(frame, { binary: true });
    }
  }
}

async function stopUpstream() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (upstreamAbort) {
    upstreamAbort.abort();
    upstreamAbort = null;
  }
  upstreamActive = false;
}

async function startUpstream() {
  await stopUpstream();

  const config = readConfig();
  if (!isConfigured(config)) {
    log('No Pi config saved — upstream idle');
    return;
  }

  const streamUrl = getStreamUrl(config);
  if (!streamUrl) return;

  upstreamAbort = new AbortController();
  const signal = upstreamAbort.signal;

  try {
    log('Connecting upstream:', streamUrl);
    const res = await fetch(streamUrl, {
      headers: getAuthHeaders(config),
      signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Upstream HTTP ${res.status}`);
    }

    const boundary = parseBoundary(res.headers.get('content-type') || '');
    const parser = new MjpegFrameParser(boundary);
    const reader = res.body.getReader();
    upstreamActive = true;
    log('Upstream connected, boundary =', boundary);

    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const frames = parser.push(Buffer.from(value));
      for (const frame of frames) {
        broadcastFrame(frame);
      }
    }
  } catch (err) {
    if (signal.aborted) return;
    log('Upstream error:', err.message);
  } finally {
    upstreamActive = false;
    if (!signal.aborted && clients.size > 0) {
      reconnectTimer = setTimeout(() => {
        if (clients.size > 0) startUpstream();
      }, 3000);
    }
  }
}

function ensureUpstream() {
  if (!upstreamActive && clients.size > 0) {
    startUpstream();
  }
}

function onConfigChange() {
  log('Config changed — restarting upstream');
  if (clients.size > 0) {
    startUpstream();
  } else {
    stopUpstream();
  }
}

// Watch stride.config.json for saves from Settings
try {
  fs.watch(CONFIG_PATH, { persistent: false }, (event) => {
    if (event === 'change' || event === 'rename') {
      setTimeout(onConfigChange, 200);
    }
  });
} catch {
  log('Config file watch unavailable until first save');
}

const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    const config = readConfig();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        clients: clients.size,
        upstreamActive,
        configured: isConfigured(config),
      })
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  const url = req.url?.split('?')[0];
  if (url !== WS_PATH) {
    ws.close(1008, 'Invalid path');
    return;
  }

  const config = readConfig();
  if (!isConfigured(config)) {
    ws.close(1013, 'Pi not configured');
    return;
  }

  clients.add(ws);
  log('Client connected, total =', clients.size);
  ensureUpstream();

  ws.on('close', () => {
    clients.delete(ws);
    log('Client disconnected, total =', clients.size);
    if (clients.size === 0) stopUpstream();
  });

  ws.on('error', () => {
    clients.delete(ws);
  });
});

httpServer.listen(WS_PORT, () => {
  log(`Listening on ws://localhost:${WS_PORT}${WS_PATH}`);
  log(`Health: http://localhost:${WS_PORT}/health`);
});

process.on('SIGINT', async () => {
  await stopUpstream();
  wss.close();
  httpServer.close();
  process.exit(0);
});
