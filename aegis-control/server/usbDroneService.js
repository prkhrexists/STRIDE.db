/**
 * STRIDE USB Drone Service
 * Opens a serial port, parses MAVLink v2, broadcasts telemetry over WebSocket,
 * and exposes REST endpoints: /api/drone/connect, /api/drone/disconnect, /api/drone/status, /api/drone/ports
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { SerialPort } = require('serialport');
const {
  MavLinkPacketSplitter,
  MavLinkPacketParser,
  common,
  minimal,
  createMavLinkStream,
} = require('node-mavlink');

// ─── Config persistence ──────────────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, '..', 'stride.config.json');

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return {}; }
}
function writeConfig(patch) {
  const current = readConfig();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...current, ...patch }, null, 2));
}

// ─── Port scoring knowledge base ─────────────────────────────────────────────
// VID (vendor ID) → { label, score }
const VID_MAP = {
  '26ac': { label: 'Pixhawk / PX4',    score: 100 },
  '1fc9': { label: 'Pixhawk (NXP)',     score: 100 },
  '3162': { label: 'Holybro',           score:  90 },
  '0483': { label: 'STMicroelectronics',score:  80 }, // many FC chips
  '10c4': { label: 'Silicon Labs CP210x',score: 75 }, // common UART bridge
  '0403': { label: 'FTDI',              score:  70 }, // generic FTDI
  '1a86': { label: 'CH340/CH341',       score:  65 }, // cheap USB-UART
  '2341': { label: 'Arduino',           score:  50 },
  '16c0': { label: 'Teensy',            score:  45 },
};

// Manufacturer string fragments → score bonus
const MFR_HINTS = [
  { pattern: /pixhawk|px4/i,     bonus: 30, label: 'Pixhawk FC' },
  { pattern: /ardupilot|apm/i,   bonus: 30, label: 'ArduPilot FC' },
  { pattern: /holybro/i,         bonus: 25, label: 'Holybro FC' },
  { pattern: /cube/i,            bonus: 25, label: 'CubePilot FC' },
  { pattern: /matek/i,           bonus: 20, label: 'Matek FC' },
  { pattern: /speedybee/i,       bonus: 20, label: 'SpeedyBee FC' },
  { pattern: /betaflight|inav/i, bonus: 20, label: 'Betaflight/INAV FC' },
  { pattern: /silicon.labs|cp21/i,bonus:15, label: 'USB-UART Bridge' },
  { pattern: /ftdi/i,            bonus: 10, label: 'FTDI Bridge' },
  { pattern: /ch340|ch341/i,     bonus: 10, label: 'CH340 Bridge' },
];

/**
 * Score a serialport entry and return enriched metadata.
 * @param {import('serialport').PortInfo} p
 * @returns {{ path, manufacturer, vendorId, productId, score, confidence, description }}
 */
function scorePort(p) {
  let score = 0;
  let description = 'Unknown device';

  const vid = (p.vendorId ?? '').toLowerCase().replace(/^0x/, '');
  const mfr = (p.manufacturer ?? '');

  if (vid && VID_MAP[vid]) {
    score += VID_MAP[vid].score;
    description = VID_MAP[vid].label;
  }

  for (const hint of MFR_HINTS) {
    if (hint.pattern.test(mfr)) {
      score += hint.bonus;
      description = hint.label;
      break;
    }
  }

  // Prefer ttyACM (CDC) over ttyUSB (FTDI)
  if (p.path.includes('ttyACM')) score += 10;
  if (p.path.includes('ttyUSB')) score +=  5;
  // Windows COM port heuristic
  if (/COM\d+/i.test(p.path) && score > 0) score += 5;

  const confidence = score >= 90 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW';
  return { path: p.path, manufacturer: mfr || null, vendorId: vid || null, productId: (p.productId ?? null), score, confidence, description };
}

/**
 * Try to open a port at 115200 and listen for ANY MAVLink bytes for up to 2 s.
 * Resolves true if at least 1 valid MAVLink start-byte (0xFD/0xFE) is detected.
 */
function probePort(portPath, timeoutMs = 2000) {
  return new Promise(resolve => {
    let confirmed = false;
    let sp;
    const done = (result) => {
      if (sp?.isOpen) { try { sp.close(); } catch {} }
      resolve(result);
    };

    try {
      sp = new SerialPort({ path: portPath, baudRate: 115200, autoOpen: false });
      sp.open(err => {
        if (err) return done(false);
        const timer = setTimeout(() => done(confirmed), timeoutMs);
        sp.on('data', buf => {
          // Look for MAVLink v1 (0xFE) or v2 (0xFD) magic bytes
          for (const b of buf) {
            if (b === 0xFD || b === 0xFE) {
              confirmed = true;
              clearTimeout(timer);
              return done(true);
            }
          }
        });
        sp.on('error', () => { clearTimeout(timer); done(false); });
      });
    } catch { done(false); }
  });
}

const REGISTRY = { ...minimal.REGISTRY, ...common.REGISTRY };
const REST_PORT = Number(process.env.USB_REST_PORT || 3003);
const WS_PORT   = Number(process.env.USB_WS_PORT  || 3004);
const HEARTBEAT_INTERVAL_MS = 1000;
const HEARTBEAT_TIMEOUT_MS  = 4000;

// ─── State ───────────────────────────────────────────────────────────────────

/** @type {import('serialport').SerialPort|null} */
let serial = null;
let connectedPort   = null;
let lastHeartbeatAt = 0;
let heartbeatTimer  = null;
/** @type {Set<import('ws').WebSocket>} */
const wsClients = new Set();

const telemetry = {
  timestamp: 0,
  armed:           false,
  mode:            'UNKNOWN',
  lat:             0,
  lng:             0,
  alt:             0,
  relative_alt:    0,
  groundspeed:     0,
  airspeed:        0,
  heading:         0,
  roll:            0,
  pitch:           0,
  yaw:             0,
  battery_pct:     0,
  battery_voltage: 0,
  battery_current: 0,
  gps_sats:        0,
  gps_fix:         'NO_FIX',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const rad2deg = r => (r * 180) / Math.PI;
const FIX_LABELS = ['NO_FIX', 'NO_FIX', '2D_FIX', '3D_FIX', '3D_DGPS', 'RTK'];

function decodeMode(customMode, autopilot) {
  if (autopilot === 3) {
    const m = ['STABILIZE','ACRO','ALT_HOLD','AUTO','GUIDED','LOITER','RTL','LAND','POSHOLD','BRAKE'];
    return m[customMode] || `MODE_${customMode}`;
  }
  return `MODE_${customMode}`;
}

function isArmed(baseMode) { return Boolean(baseMode & 128); }
function linkActive()      { return connectedPort && Date.now() - lastHeartbeatAt < HEARTBEAT_TIMEOUT_MS; }

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const ws of wsClients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

// ─── Packet Handler ──────────────────────────────────────────────────────────

function handlePacket(packet) {
  const clazz = REGISTRY[packet.header.msgid];
  if (!clazz) return;
  const data = packet.protocol.data(packet.payload, clazz);

  switch (clazz.name) {
    case 'Heartbeat':
      lastHeartbeatAt = Date.now();
      telemetry.armed = isArmed(data.baseMode ?? data.base_mode ?? 0);
      telemetry.mode  = decodeMode(data.customMode ?? data.custom_mode ?? 0, data.autopilot);
      broadcast({ type: 'telemetry', linkActive: true, data: { ...telemetry, timestamp: Date.now() } });
      break;

    case 'GlobalPositionInt':
      telemetry.lat         = (data.lat  ?? 0) / 1e7;
      telemetry.lng         = (data.lon  ?? 0) / 1e7;
      telemetry.alt         = (data.alt  ?? 0) / 1000;
      telemetry.relative_alt= (data.relativeAlt ?? data.relative_alt ?? 0) / 1000;
      break;

    case 'VfrHud':
      telemetry.groundspeed = data.groundspeed ?? telemetry.groundspeed;
      telemetry.airspeed    = data.airspeed    ?? telemetry.airspeed;
      telemetry.heading     = data.heading     ?? telemetry.heading;
      if (data.alt != null) telemetry.alt = data.alt;
      break;

    case 'Attitude':
      telemetry.roll  = rad2deg(data.roll  ?? 0);
      telemetry.pitch = rad2deg(data.pitch ?? 0);
      telemetry.yaw   = rad2deg(data.yaw   ?? 0);
      break;

    case 'GpsRawInt': {
      const fix = data.fixType ?? data.fix_type ?? 0;
      telemetry.gps_sats = data.satellitesVisible ?? data.satellites_visible ?? 0;
      telemetry.gps_fix  = FIX_LABELS[fix] ?? '3D_FIX';
      break;
    }

    case 'SysStatus': {
      const pct = data.batteryRemaining ?? data.battery_remaining ?? -1;
      if (pct >= 0) telemetry.battery_pct = pct;
      telemetry.battery_voltage = (data.voltageBattery ?? data.voltage_battery ?? 0) / 1000;
      telemetry.battery_current = (data.currentBattery ?? data.current_battery ?? 0) / 100;
      break;
    }
  }
}

// ─── HEARTBEAT sender ────────────────────────────────────────────────────────

function sendHeartbeat() {
  if (!serial?.isOpen) return;
  try {
    const hb = new minimal.Heartbeat();
    hb.type          = 6;   // GCS
    hb.autopilot     = 8;   // INVALID (GCS)
    hb.baseMode      = 0;
    hb.customMode    = 0;
    hb.systemStatus  = 4;   // ACTIVE
    hb.mavlinkVersion = 3;
    // Build raw MAVLink v2 frame manually (20-byte header + payload)
    // sendData helper from node-mavlink handles framing:
    const writer = createMavLinkStream({ systemId: 255, componentId: 190 });
    const frame = writer.pack(hb);
    serial.write(frame);
  } catch (e) {
    // non-fatal – serial may have closed
  }
}

// ─── Connect / Disconnect ────────────────────────────────────────────────────

function connectSerial(port, baudRate) {
  return new Promise((resolve, reject) => {
    if (serial?.isOpen) {
      serial.close();
    }

    const sp = new SerialPort({ path: port, baudRate: Number(baudRate), autoOpen: false });
    const splitter = new MavLinkPacketSplitter();
    const parser   = new MavLinkPacketParser();
    splitter.pipe(parser);
    parser.on('data', handlePacket);

    sp.open(err => {
      if (err) return reject(err);

      sp.pipe(splitter);
      serial        = sp;
      connectedPort = port;
      lastHeartbeatAt = 0;

      heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

      sp.on('error', e => {
        console.error('[usbDrone] Serial error:', e.message);
        broadcast({ type: 'link_lost', linkActive: false, reason: e.message });
      });
      sp.on('close', () => {
        console.log('[usbDrone] Serial port closed');
        broadcast({ type: 'link_lost', linkActive: false, reason: 'port_closed' });
        clearInterval(heartbeatTimer);
        serial = null; connectedPort = null;
      });

      console.log(`[usbDrone] Connected on ${port} @ ${baudRate}`);
      broadcast({ type: 'connected', port, baudRate });
      resolve({ success: true, port });
    });
  });
}

function disconnectSerial() {
  return new Promise(resolve => {
    clearInterval(heartbeatTimer);
    if (!serial?.isOpen) { serial = null; connectedPort = null; return resolve({ success: true }); }
    serial.close(() => { serial = null; connectedPort = null; resolve({ success: true }); });
  });
}

// ─── REST Server ─────────────────────────────────────────────────────────────

function parseBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const restServer = http.createServer(async (req, res) => {
  const url    = req.url?.split('?')[0] ?? '/';
  const method = req.method?.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  if (url === '/api/drone/connect' && method === 'POST') {
    const { port = '/dev/ttyACM0', baudRate = 115200 } = await parseBody(req);
    try {
      const result = await connectSerial(port, baudRate);
      return json(res, result);
    } catch (e) {
      return json(res, { success: false, error: e.message }, 500);
    }
  }

  if (url === '/api/drone/disconnect' && method === 'POST') {
    const result = await disconnectSerial();
    return json(res, result);
  }

  if (url === '/api/drone/status' && method === 'GET') {
    return json(res, {
      connected:     !!serial?.isOpen,
      linkActive:    linkActive(),
      port:          connectedPort,
      lastHeartbeat: lastHeartbeatAt,
      telemetry:     { ...telemetry, timestamp: Date.now() },
    });
  }

  if (url === '/api/drone/ports' && method === 'GET') {
    const doProbe = new URL(`http://x${req.url}`).searchParams.get('probe') !== 'false';
    try {
      const raw  = await SerialPort.list();
      const scored = raw.map(scorePort).sort((a, b) => b.score - a.score);

      // Skip probe if nothing looks like a drone (saves ~2s × N ports)
      const candidates = scored.filter(p => p.score >= 30);

      if (doProbe && candidates.length > 0) {
        // Probe in parallel (cap at 3 to avoid hogging ports)
        const top = candidates.slice(0, 3);
        const results = await Promise.all(
          top.map(async p => {
            const confirmed = await probePort(p.path);
            return { ...p, confidence: confirmed ? 'CONFIRMED' : p.confidence };
          })
        );
        // Merge probe results back
        const probeMap = Object.fromEntries(results.map(r => [r.path, r]));
        const merged = scored.map(p => probeMap[p.path] ?? p);
        return json(res, { ports: merged });
      }

      return json(res, { ports: scored });
    } catch (e) {
      return json(res, { ports: [], error: e.message });
    }
  }

  if (url === '/api/drone/config' && method === 'GET') {
    return json(res, readConfig());
  }

  if (url === '/api/drone/config' && method === 'POST') {
    const body = await parseBody(req);
    writeConfig(body);
    return json(res, { success: true });
  }

  json(res, { error: 'Not found' }, 404);
});

// ─── WebSocket (telemetry push) ───────────────────────────────────────────────

const wsServer = new WebSocketServer({ port: WS_PORT });
wsServer.on('connection', ws => {
  wsClients.add(ws);
  ws.send(JSON.stringify({ type: linkActive() ? 'telemetry' : 'awaiting', linkActive: linkActive(), data: telemetry }));
  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
});

restServer.listen(REST_PORT, () => {
  console.log(`[usbDrone] REST  → http://localhost:${REST_PORT}/api/drone/*`);
  console.log(`[usbDrone] WS   → ws://localhost:${WS_PORT}`);
});
