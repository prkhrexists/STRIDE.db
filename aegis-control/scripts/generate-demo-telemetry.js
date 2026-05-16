const fs = require('fs');
const path = require('path');

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function noise(t, s = 1) {
  return ((Math.sin(t * 1.3) + Math.sin(t * 2.7) + Math.sin(t * 0.7)) / 3) * s;
}

const frames = [];
const dt = 0.1;
const total = 60;
let yaw = 145;
let battery = 96;
let phase = 'ground';
let phaseT = 0;

for (let i = 0; i < total / dt; i++) {
  const t = i * dt;
  phaseT += dt;
  if (phase === 'ground' && phaseT > 8) {
    phase = 'takeoff';
    phaseT = 0;
  } else if (phase === 'takeoff' && phaseT > 12) {
    phase = 'cruise';
    phaseT = 0;
  } else if (phase === 'cruise' && phaseT > 28) {
    phase = 'rtl';
    phaseT = 0;
  } else if (phase === 'rtl' && phaseT > 8) {
    phase = 'land';
    phaseT = 0;
  } else if (phase === 'land' && phaseT > 4) {
    phase = 'ground';
    phaseT = 0;
    battery = 96;
  }

  battery = Math.max(72, battery - 0.04);
  let alt = 0;
  let spd = 0;
  let air = 0;
  let roll = 0;
  let pitch = 0;
  let armed = phase !== 'ground';
  let mode = 'DISARMED';

  if (phase === 'takeoff') {
    alt = lerp(0, 42, Math.min(phaseT / 12, 1)) + noise(t, 0.15);
    spd = lerp(0, 3.5, Math.min(phaseT / 12, 1));
    air = spd + 0.3;
    roll = noise(t, 1.2);
    pitch = lerp(0, 10, Math.min(phaseT / 6, 1));
    mode = 'TAKEOFF';
    armed = true;
  } else if (phase === 'cruise') {
    alt = 42 + noise(t, 0.5);
    spd = 7.5 + noise(t, 0.8);
    air = spd + 0.4;
    roll = noise(t * 0.4, 2.5);
    pitch = noise(t * 0.35, 1.5);
    yaw = (yaw + 0.25) % 360;
    mode = 'AUTO';
    armed = true;
  } else if (phase === 'rtl') {
    alt = lerp(42, 25, Math.min(phaseT / 8, 1)) + noise(t, 0.2);
    spd = 5.5 + noise(t, 0.5);
    air = spd;
    roll = noise(t, 1);
    pitch = -2;
    mode = 'RTL';
    armed = true;
  } else if (phase === 'land') {
    alt = Math.max(0, lerp(25, 0, Math.min(phaseT / 4, 1)));
    spd = lerp(4, 0, Math.min(phaseT / 4, 1));
    air = spd;
    roll = noise(t, 0.4);
    pitch = -1;
    mode = 'LAND';
    armed = phaseT < 3.5;
  } else {
    armed = false;
    mode = 'DISARMED';
  }

  const sats = phase === 'ground' ? 14 : 11 + Math.round(Math.abs(noise(t, 1)));
  frames.push({
    t: Math.round(t * 1000),
    altitude: +alt.toFixed(2),
    groundspeed: +spd.toFixed(2),
    airspeed: +air.toFixed(2),
    heading: +((yaw % 360)).toFixed(1),
    roll: +roll.toFixed(2),
    pitch: +pitch.toFixed(2),
    yaw: +((yaw % 360)).toFixed(1),
    battery_pct: +battery.toFixed(1),
    battery_voltage: +(lerp(16.8, 14.4, (96 - battery) / 24)).toFixed(2),
    battery_current: +(phase === 'cruise' ? 16 + noise(t, 1.5) : phase === 'ground' ? 1.2 : 10).toFixed(2),
    gps_sats: sats,
    gps_fix: sats > 10 ? '3D_RTK' : '3D_FIX',
    mode,
    armed,
    signal_strength: +(88 + noise(t * 0.15, 6)).toFixed(0),
    imu_status: 'OK',
    phase,
  });
}

const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const out = path.join(dataDir, 'demo-telemetry.json');
fs.writeFileSync(out, JSON.stringify({ durationMs: 60000, intervalMs: 100, frames }));
const pubDir = path.join(root, 'public', 'data');
fs.mkdirSync(pubDir, { recursive: true });
fs.writeFileSync(path.join(pubDir, 'demo-telemetry.json'), fs.readFileSync(out));
console.log(`Wrote ${frames.length} frames to ${out}`);
