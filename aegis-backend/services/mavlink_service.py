import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pymavlink import mavutil

router = APIRouter(prefix="/ws", tags=["Telemetry"])

connected_clients = set()

async def telemetry_loop():
    try:
        print("Connecting to MAVLink stream...")
        master = mavutil.mavlink_connection('udp:0.0.0.0:14550')
        master.wait_heartbeat(timeout=5)
        print("MAVLink connected. Broadcasting telemetry...")
        
        while True:
            msg = master.recv_match(type=['HEARTBEAT', 'GLOBAL_POSITION_INT', 'ATTITUDE', 'GPS_RAW_INT', 'SYS_STATUS', 'VFR_HUD'], blocking=False)
            if msg:
                data = msg.to_dict()
                data['msg_type'] = msg.get_type()
                
                dead_clients = set()
                for client in connected_clients:
                    try:
                        await client.send_json(data)
                    except Exception:
                        dead_clients.add(client)
                for c in dead_clients:
                    connected_clients.remove(c)
            
            await asyncio.sleep(0.1)  # 10Hz stream
    except Exception as e:
        print(f"MAVLink loop error: {e}")

@router.on_event("startup")
async def startup_event():
    asyncio.create_task(telemetry_loop())

@router.websocket("/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
