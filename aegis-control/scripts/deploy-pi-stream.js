const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const PI_IP = '10.39.139.34';
const PI_USER = 'pi';
const PI_PASS = 'kali';

// This stream server uses a SHARED camera instance across all handlers.
// The /snapshot endpoint captures from the same camera the MJPEG stream uses.
const STREAM_SCRIPT = `#!/usr/bin/env python3
import cv2, time, threading, json, platform
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn

# ---- Shared camera with thread safety ----
cam_lock = threading.Lock()
camera = None
latest_frame = None
frame_ready = threading.Event()

def camera_loop():
    global camera, latest_frame
    camera = cv2.VideoCapture(0, cv2.CAP_V4L2)
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    print("[cam] Camera opened:", camera.isOpened())
    while True:
        ret, frame = camera.read()
        if ret:
            with cam_lock:
                latest_frame = frame.copy()
            frame_ready.set()
        else:
            time.sleep(0.1)
            camera.release()
            time.sleep(1)
            camera = cv2.VideoCapture(0, cv2.CAP_V4L2)
            camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        time.sleep(0.03)

class CamHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == '/snapshot':
            frame_ready.wait(timeout=5)
            with cam_lock:
                frame = latest_frame
            if frame is not None:
                ret, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 92])
                if ret:
                    data = jpeg.tobytes()
                    self.send_response(200)
                    self.send_header('Content-Type', 'image/jpeg')
                    self.send_header('Content-Length', str(len(data)))
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(data)
                    return
            self.send_error(500, 'No frame available')

        elif self.path == '/api/ping':
            body = json.dumps({
                "ok": True,
                "version": "4B",
                "hostname": platform.node(),
                "camera": camera is not None and camera.isOpened() if camera else False
            }).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)

        elif '/stream' in self.path or self.path.endswith('.mjpeg'):
            self.send_response(200)
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=--jpgboundary')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            try:
                while True:
                    frame_ready.wait(timeout=5)
                    with cam_lock:
                        frame = latest_frame
                    if frame is None:
                        time.sleep(0.1)
                        continue
                    ret, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    if not ret:
                        continue
                    data = jpeg.tobytes()
                    self.wfile.write(b'--jpgboundary\\r\\n')
                    self.wfile.write(b'Content-Type: image/jpeg\\r\\n')
                    self.wfile.write(('Content-Length: ' + str(len(data)) + '\\r\\n\\r\\n').encode())
                    self.wfile.write(data)
                    self.wfile.write(b'\\r\\n')
                    time.sleep(0.033)
            except (BrokenPipeError, ConnectionResetError):
                pass
        else:
            self.send_error(404, 'Not Found')

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

if __name__ == '__main__':
    # Start camera capture thread
    t = threading.Thread(target=camera_loop, daemon=True)
    t.start()
    print("Waiting for camera...")
    frame_ready.wait(timeout=10)
    print("Camera ready!" if latest_frame is not None else "Camera not ready (timeout)")
    
    server = ThreadedHTTPServer(('0.0.0.0', 5001), CamHandler)
    print('STRIDE Camera Server on port 5001')
    print('  Stream:   /stream/video.mjpeg')
    print('  Snapshot: /snapshot')
    print('  Ping:     /api/ping')
    server.serve_forever()
`;

async function deploy() {
  try {
    console.log(`[deploy] Connecting to Pi at ${PI_IP}...`);
    await ssh.connect({
      host: PI_IP,
      username: PI_USER,
      password: PI_PASS,
      readyTimeout: 10000,
    });
    console.log('[deploy] Connected!');

    // Kill ALL old camera processes (they may hold /dev/video0)
    console.log('[deploy] Killing old camera processes...');
    await ssh.execCommand('pkill -f "python3.*stream" || true');
    await ssh.execCommand('pkill -f "libcamera" || true');
    await ssh.execCommand('sleep 2');

    // Write the new stream script
    console.log('[deploy] Uploading stream.py...');
    const escapedScript = STREAM_SCRIPT.replace(/'/g, "'\\''");
    await ssh.execCommand(`echo '${escapedScript}' > /home/pi/stream.py`);

    // Start new server in background
    console.log('[deploy] Starting stream server...');
    await ssh.execCommand('nohup python3 /home/pi/stream.py > /tmp/stride-stream.log 2>&1 &');

    // Wait for it to initialize
    console.log('[deploy] Waiting for server startup...');
    await ssh.execCommand('sleep 5');

    // Verify ping
    const check = await ssh.execCommand('curl -s http://localhost:5001/api/ping');
    console.log('[deploy] Ping response:', check.stdout || '(empty)');

    // Check logs
    const logs = await ssh.execCommand('tail -5 /tmp/stride-stream.log');
    console.log('[deploy] Last logs:', logs.stdout || logs.stderr || '(empty)');

    if (check.stdout.includes('"ok"')) {
      console.log('[deploy] ✅ Stream server deployed and verified!');
    } else {
      console.log('[deploy] ⚠️ Server may need more time — check logs');
    }

    ssh.dispose();
  } catch (err) {
    console.error('[deploy] Error:', err.message);
    ssh.dispose();
    process.exit(1);
  }
}

deploy();
