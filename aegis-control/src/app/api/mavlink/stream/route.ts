import { NextRequest } from 'next/server';
import { mavlinkManager } from '@/lib/mavlink';

export async function GET(req: NextRequest) {
  // SSE connection for MAVLink telemetry
  const stream = new ReadableStream({
    start(controller) {
      if (!mavlinkManager.getIsConnected()) {
        mavlinkManager.connect();
      }

      const onMessage = (packet: any) => {
        let telemetryData: any = null;
        
        // Extract required fields
        switch (packet.name) {
          case 'HeartbeatCommand':
          case 'Heartbeat':
            telemetryData = {
              type: 'HEARTBEAT',
              base_mode: packet.data.baseMode,
              system_status: packet.data.systemStatus,
              autopilot: packet.data.autopilot
            };
            break;
          case 'GlobalPositionIntCommand':
          case 'GlobalPositionInt':
            telemetryData = {
              type: 'GLOBAL_POSITION_INT',
              lat: packet.data.lat / 1e7,
              lon: packet.data.lon / 1e7,
              alt: packet.data.alt / 1000,
              relative_alt: packet.data.relativeAlt / 1000,
              vx: packet.data.vx / 100,
              vy: packet.data.vy / 100,
              vz: packet.data.vz / 100
            };
            break;
          case 'AttitudeCommand':
          case 'Attitude':
            telemetryData = {
              type: 'ATTITUDE',
              roll: packet.data.roll,
              pitch: packet.data.pitch,
              yaw: packet.data.yaw,
              rollspeed: packet.data.rollspeed,
              pitchspeed: packet.data.pitchspeed
            };
            break;
          case 'GpsRawIntCommand':
          case 'GpsRawInt':
            telemetryData = {
              type: 'GPS_RAW_INT',
              fix_type: packet.data.fixType,
              satellites_visible: packet.data.satellitesVisible,
              eph: packet.data.eph
            };
            break;
          case 'SysStatusCommand':
          case 'SysStatus':
            telemetryData = {
              type: 'SYS_STATUS',
              battery_remaining: packet.data.batteryRemaining,
              voltage_battery: packet.data.voltageBattery,
              current_battery: packet.data.currentBattery
            };
            break;
          case 'VfrHudCommand':
          case 'VfrHud':
            telemetryData = {
              type: 'VFR_HUD',
              airspeed: packet.data.airspeed,
              groundspeed: packet.data.groundspeed,
              heading: packet.data.heading,
              throttle: packet.data.throttle,
              alt: packet.data.alt,
              climb: packet.data.climb
            };
            break;
        }

        if (telemetryData) {
          controller.enqueue(`data: ${JSON.stringify(telemetryData)}\n\n`);
        }
      };

      mavlinkManager.on('message', onMessage);

      req.signal.addEventListener('abort', () => {
        mavlinkManager.off('message', onMessage);
        // We don't necessarily close the global connection when one client disconnects
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
