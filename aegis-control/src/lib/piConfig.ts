import fs from 'fs';
import path from 'path';

export type PiConfig = {
  configured: boolean;
  piIp: string;
  sshPort: string;
  streamPort: string;
  telemetryPort: string;
  streamEndpoint: string;
  authKey: string;
  captureInterval: number;
  updatedAt?: string;
};

const CONFIG_PATH = path.join(process.cwd(), 'stride.config.json');

const DEFAULT_CONFIG: PiConfig = {
  configured: false,
  piIp: '',
  sshPort: '22',
  streamPort: '5001',
  telemetryPort: '14550',
  streamEndpoint: '/stream/video.mjpeg',
  authKey: '',
  captureInterval: 5,
};

export function readConfig(): PiConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return { ...DEFAULT_CONFIG };
    }
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PiConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(partial: Partial<PiConfig>): PiConfig {
  const current = readConfig();
  const next: PiConfig = {
    ...current,
    ...partial,
    configured: partial.configured !== undefined ? partial.configured : true,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

export function getPiBaseUrl(config: PiConfig = readConfig()): string | null {
  if (!config.piIp) return null;
  const port = config.streamPort || '5001';
  return `http://${config.piIp}:${port}`;
}

export function getStreamUrl(config: PiConfig = readConfig()): string | null {
  const base = getPiBaseUrl(config);
  if (!base) return null;
  const endpoint = config.streamEndpoint || '/stream/video.mjpeg';
  return `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

export function getAuthHeaders(config: PiConfig = readConfig()): Record<string, string> {
  const headers: Record<string, string> = {};
  if (config.authKey && config.authKey !== '********') {
    headers.Authorization = `Bearer ${config.authKey}`;
  }
  return headers;
}

export function isConfigured(config: PiConfig = readConfig()): boolean {
  return Boolean(config.configured && config.piIp);
}
