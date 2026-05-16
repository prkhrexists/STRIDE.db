/**
 * MAVLink UDP listener (port 14550) → aggregated telemetry → WebSocket clients.
 * LINK ACTIVE only when HEARTBEAT received within the last 3 seconds.
 */
const dgram = require('dgram');
const http = require('http');
const { WebSocketServer } = require('ws');
const {
  MavLinkPacketSplitter,
  MavLinkPacketParser,
  common,
  minimal,
} = require('node-mavlink');

const REGISTRY = { ...minimal.REGISTRY, ...common.REGISTRY };

const UDP_PORT = Number(process.env.MAV_UDP_PORT || 14550);
const UDP_HOST = process.env.MAV_UDP_HOST || '0.0.0.0';
const WS_PORT = Number(process.env.MAV_WS_PORT || 3002);
const WS_PATH = '/telemetry';
const HEARTBEAT_TIMEOUT_MS = 3000;
const BROADCAST_MS = 100;

/** @type {Set<import('ws').WebSocket>} */
const clients = new Set();

let lastHeartbeatAt = 0;
let linkWasActive = false;

const state = {
  timestamp: 0,
  altitude: 0,
  groundspeed: 0,
  airspeed: 0,
  heading: 0,
  roll: 0,
  pitch: 0,
  yaw: 0,
  battery_pct: 0,
  battery_voltage: 0,
  battery_current: 0,
  gps_sats: 0,
  gps_fix: 'NO_FIX',
  mode: 'UNKNOWN',
  armed: false,
  signal_strength: 0,
  imu_status: 'OK',
  phase: 'ground',
};

const FIX_LABELS = ['NO_FIX', 'NO_FIX', '2D_FIX', '3D_FIX', '3D_FIX', 'RTK'];

function radToDeg(r) {
  return (r * 180) / Math.PI;
}

function decodeFlightMode(customMode, autopilot) {
  if (autopilot === 3) {
    const modes = ['STABILIZE', 'ACRO', 'ALT_HOLD', 'AUTO', 'GUIDED', 'LOITER', 'RTL', 'LAND', 'POSHOLD'];
    return modes[customMode] || `MODE_${customMode}`;
  }
  return `MODE_${customMode}`;
}

function isArmed(baseMode) {
  return Boolean(baseMode & 128);
}

function linkActive() {
  return lastHeartbeatAt > 0 && Date.now() - lastHeartbeatAt < HEARTBEAT_TIMEOUT_MS;
}

function snapshot() {
  return {
    ...state,
    timestamp: Date.now(),
    signal_strength: linkActive() ? Math.min(100, 70 + state.gps_sats * 2) : 0,
  };
}

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

function handlePacket(packet) {
  const clazz = REGISTRY[packet.header.msgid];
  if (!clazz) return;

  const data = packet.protocol.data(packet.payload, clazz);

  switch (clazz.name) {
    case 'Heartbeat':
      lastHeartbeatAt = Date.now();
      state.armed = isArmed(data.baseMode ?? data.base_mode ?? 0);
      state.mode = decodeFlightMode(data.customMode ?? data.custom_mode ?? 0, data.autopilot);
      if (!state.armed) state.phase = state.altitude < 1 ? 'ground' : state.phase;
      break;

    case 'GlobalPositionInt': {
      const relAlt = (data.relativeAlt ?? data.relative_alt ?? 0) / 1000;
      state.altitude = relAlt;
      const vx = (data.vx ?? 0) / 100;
      const vy = (data.vy ?? 0) / 100;
      state.groundspeed = Math.sqrt(vx * vx + vy * vy);
      if (state.altitude > 2 && state.phase === 'ground') state.phase = 'cruise';
      if (state.altitude < 1 && !state.armed) state.phase = 'ground';
      break;
    }

    case 'VfrHud':
      state.groundspeed = data.groundspeed ?? state.groundspeed;
      state.airspeed = data.airspeed ?? state.airspeed;
      state.heading = data.heading ?? state.heading;
      if (data.alt != null) state.altitude = data.alt;
      break;

    case 'Attitude':
      state.roll = radToDeg(data.roll ?? 0);
      state.pitch = radToDeg(data.pitch ?? 0);
      state.yaw = radToDeg(data.yaw ?? 0);
      break;

    case 'GpsRawInt': {
      const fix = data.fixType ?? data.fix_type ?? 0;
      state.gps_sats = data.satellitesVisible ?? data.satellites_visible ?? 0;
      state.gps_fix = FIX_LABELS[fix] || '3D_FIX';
      break;
    }

    case 'SysStatus': {
      const pct = data.batteryRemaining ?? data.battery_remaining ?? -1;
      state.battery_pct = pct >= 0 ? pct : state.battery_pct;
      state.battery_voltage = (data.voltageBattery ?? data.voltage_battery ?? 0) / 1000;
      state.battery_current = (data.currentBattery ?? data.current_battery ?? 0) / 100;
      break;
    }

    default:
      break;
  }
}

function startUdp() {
  const socket = dgram.createSocket('udp4');
  const splitter = new MavLinkPacketSplitter();
  const parser = new MavLinkPacketParser();

  splitter.pipe(parser);
  parser.on('data', handlePacket);

  socket.on('message', (msg) => splitter.write(msg));
  socket.on('error', (err) => console.error('[mavlinkService] UDP error:', err.message));

  socket.bind(UDP_PORT, UDP_HOST, () => {
    console.log(`[mavlinkService] UDP listening on ${UDP_HOST}:${UDP_PORT}`);
  });

  return socket;
}

function startBroadcastLoop() {
  setInterval(() => {
    const active = linkActive();

    if (active) {
      broadcast({ type: 'telemetry', linkActive: true, data: snapshot() });
      linkWasActive = true;
      return;
    }

    if (linkWasActive) {
      broadcast({ type: 'link_lost', linkActive: false });
      linkWasActive = false;
    } else {
      broadcast({ type: 'awaiting', linkActive: false });
    }
  }, BROADCAST_MS);
}

function startWebSocket() {
  const server = http.createServer();
  const wss = new WebSocketServer({ server });

  server.on('request', (req, res) => {
    const path = req.url?.split('?')[0];
    if (path === '/emit' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          broadcast(payload);
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('OK');
        } catch (e) {
          res.writeHead(400);
          res.end('Error');
        }
      });
    }
  });

  wss.on('connection', (ws, req) => {
    const path = req.url?.split('?')[0];
    if (path !== WS_PATH) {
      ws.close(1008, 'Invalid path');
      return;
    }

    clients.add(ws);
    ws.send(JSON.stringify(
      linkActive()
        ? { type: 'telemetry', linkActive: true, data: snapshot() }
        : { type: 'awaiting', linkActive: false },
    ));

    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });

  server.listen(WS_PORT, () => {
    console.log(`[mavlinkService] WebSocket ws://localhost:${WS_PORT}${WS_PATH}`);
  });

  return server;
}

startUdp();
startWebSocket();
startBroadcastLoop();
