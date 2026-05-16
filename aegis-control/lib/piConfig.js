/**
 * Node-only Pi config (used by server/piProxy.js).
 * Next.js API routes use src/lib/piConfig.ts instead.
 */
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(process.cwd(), 'stride.config.json');

const DEFAULT_CONFIG = {
  configured: false,
  piIp: '',
  sshPort: '22',
  streamPort: '5001',
  telemetryPort: '14550',
  streamEndpoint: '/stream/video.mjpeg',
  authKey: '',
  captureInterval: 5,
};

function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return { ...DEFAULT_CONFIG };
    }
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function writeConfig(partial) {
  const current = readConfig();
  const next = {
    ...current,
    ...partial,
    configured: partial.configured !== undefined ? partial.configured : true,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function getPiBaseUrl(config = readConfig()) {
  if (!config.piIp) return null;
  const port = config.streamPort || '5001';
  return `http://${config.piIp}:${port}`;
}

function getStreamUrl(config = readConfig()) {
  const base = getPiBaseUrl(config);
  if (!base) return null;
  const endpoint = config.streamEndpoint || '/stream/video.mjpeg';
  return `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

function getAuthHeaders(config = readConfig()) {
  const headers = {};
  if (config.authKey && config.authKey !== '********') {
    headers.Authorization = `Bearer ${config.authKey}`;
  }
  return headers;
}

function isConfigured(config = readConfig()) {
  return Boolean(config.configured && config.piIp);
}

module.exports = {
  CONFIG_PATH,
  DEFAULT_CONFIG,
  readConfig,
  writeConfig,
  getPiBaseUrl,
  getStreamUrl,
  getAuthHeaders,
  isConfigured,
};
