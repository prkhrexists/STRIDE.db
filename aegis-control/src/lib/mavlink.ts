import { EventEmitter } from 'events';
import dgram from 'dgram';
import net from 'net';
import { 
  MavLinkPacketSplitter, 
  MavLinkPacketParser,
  common,
  minimal,
  MavLinkPacketRegistry,
  MavLinkPacket
} from 'node-mavlink';

const REGISTRY: MavLinkPacketRegistry = {
  ...minimal.REGISTRY,
  ...common.REGISTRY,
};

class MAVLinkManager extends EventEmitter {
  private static instance: MAVLinkManager;
  private connection: any = null;
  private isConnected: boolean = false;
  private reader: any = null;
  private reconnectInterval: any = null;

  private latestState: any = {
    lat: 0,
    lon: 0,
    alt: 0,
    heading: 0
  };

  private constructor() {
    super();
  }

  public static getInstance(): MAVLinkManager {
    if (!MAVLinkManager.instance) {
      MAVLinkManager.instance = new MAVLinkManager();
    }
    return MAVLinkManager.instance;
  }

  public getCurrentState() {
    return this.latestState;
  }

  public connect() {
    if (this.isConnected) return;
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    const connectionType = process.env.MAV_CONNECTION || 'udp';

    const handlePacket = (packet: MavLinkPacket) => {
      const clazz = REGISTRY[packet.header.msgid];
      if (clazz) {
        const data = packet.protocol.data(packet.payload, clazz) as any;
        
        if (clazz.name === 'GLOBAL_POSITION_INT') {
          this.latestState.lat = data.lat / 1e7;
          this.latestState.lon = data.lon / 1e7;
          this.latestState.alt = data.relative_alt / 1000;
        } else if (clazz.name === 'VFR_HUD') {
          this.latestState.heading = data.heading;
        }

        this.emit('message', {
          msgid: packet.header.msgid,
          name: clazz.name,
          data: data
        });
      }
    };

    if (connectionType === 'udp') {
      const port = parseInt(process.env.MAV_UDP_PORT || '14550');
      const host = process.env.MAV_UDP_HOST || '0.0.0.0';
      
      this.connection = dgram.createSocket('udp4');
      
      const splitter = new MavLinkPacketSplitter();
      const parser = new MavLinkPacketParser();
      
      splitter.pipe(parser);
      parser.on('data', handlePacket);

      this.connection.on('message', (msg: Buffer) => {
        splitter.write(msg);
      });

      this.connection.on('close', () => {
        this.handleDisconnect();
      });

      this.connection.bind(port, host, () => {
        console.log(`MAVLink UDP listening on ${host}:${port}`);
        this.isConnected = true;
        this.emit('connected');
      });
    } else if (connectionType === 'tcp') {
      const port = parseInt(process.env.MAV_TCP_PORT || '5760');
      const host = process.env.MAV_TCP_HOST || '192.168.1.10';

      this.connection = new net.Socket();
      
      this.reader = this.connection
        .pipe(new MavLinkPacketSplitter())
        .pipe(new MavLinkPacketParser());

      this.reader.on('data', handlePacket);
      
      this.connection.connect(port, host, () => {
        console.log(`MAVLink TCP connected to ${host}:${port}`);
        this.isConnected = true;
        this.emit('connected');
      });

      this.connection.on('close', () => {
        this.handleDisconnect();
      });

      this.connection.on('error', (err: any) => {
        console.error("MAVLink TCP Error:", err.message);
      });
    }
  }

  private handleDisconnect() {
    this.isConnected = false;
    this.connection = null;
    this.reader = null;
    this.emit('disconnected');
    
    if (!this.reconnectInterval) {
      this.reconnectInterval = setInterval(() => {
        console.log("Attempting to reconnect MAVLink...");
        this.connect();
      }, 3000);
    }
  }

  public disconnect() {
    if (!this.isConnected || !this.connection) return;
    
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (process.env.MAV_CONNECTION === 'tcp') {
      this.connection.destroy();
    } else {
      this.connection.close();
    }
    
    this.isConnected = false;
    this.connection = null;
    this.reader = null;
    this.emit('disconnected');
  }

  public getIsConnected() {
    return this.isConnected;
  }
}

export const mavlinkManager = MAVLinkManager.getInstance();
