import sys
import json
import os
import cv2
import numpy as np
import argparse

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import tensorflow as tf
from tensorflow.keras.models import load_model

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)  # aegis-control/
MODEL_PATH = os.path.join(SCRIPT_DIR, 'models', 'crack_mobilenet.keras')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=str, required=True, help='webcam or file')
    parser.add_argument('--filepath', type=str, default='')
    parser.add_argument('--flightId', type=str, default='default_flight')
    parser.add_argument('--frameIndex', type=int, default=0)
    parser.add_argument('--base_dir', type=str, default='../public')
    
    args = parser.parse_args()
    
    try:
        model = load_model(MODEL_PATH)
    except Exception as e:
        print(json.dumps({"error": f"Could not load Keras model from {MODEL_PATH}. Error: {str(e)}"}))
        sys.exit(1)
        
    img_path = args.filepath
    if not os.path.exists(img_path):
        print(json.dumps({"error": f"File not found: {img_path}"}))
        sys.exit(1)

    img = cv2.imread(img_path)
    if img is None:
        print(json.dumps({"error": f"Could not read image: {img_path}"}))
        sys.exit(1)

    h_img, w_img = img.shape[:2]
    img_area = h_img * w_img
    
    # Sliding window settings
    win_size = 227
    step_size = 227 # No overlap to save computation, change to 113 for 50% overlap
    
    detections = []
    
    # Prepare batch of images to speed up prediction
    patches = []
    coords = []
    
    for y in range(0, max(1, h_img - win_size + 1), step_size):
        for x in range(0, max(1, w_img - win_size + 1), step_size):
            patch = img[y:y+win_size, x:x+win_size]
            # Ensure patch is correct size (might be smaller at edges, so resize)
            if patch.shape[0] != win_size or patch.shape[1] != win_size:
                patch = cv2.resize(patch, (win_size, win_size))
                
            # preprocess for model
            patch_rgb = cv2.cvtColor(patch, cv2.COLOR_BGR2RGB)
            patch_normalized = patch_rgb / 255.0
            patches.append(patch_normalized)
            coords.append((x, y, x+patch.shape[1], y+patch.shape[0]))
            
    if patches:
        patches_array = np.array(patches)
        preds = model.predict(patches_array, verbose=0)
        
        for i, pred in enumerate(preds):
            conf = float(pred[0])
            if conf > 0.5: # crack detected
                x1, y1, x2, y2 = coords[i]
                w = x2 - x1
                h = y2 - y1
                area = w * h
                area_pct = (area / img_area) * 100
                
                # Severity mapping
                if conf > 0.85:
                    severity = 'CRITICAL'
                elif conf >= 0.7:
                    severity = 'MODERATE'
                else:
                    severity = 'WARNING'
                    
                detections.append({
                    "x": (x1 / w_img) * 100,
                    "y": (y1 / h_img) * 100,
                    "w": (w / w_img) * 100,
                    "h": (h / h_img) * 100,
                    "class": "Crack",
                    "conf": conf,
                    "severity": severity,
                    "area_pct": area_pct,
                    "coords": (x1, y1, x2, y2)
                })

    # Draw bounding boxes
    for d in detections:
        x1, y1, x2, y2 = d['coords']
        severity = d['severity']
        conf = d['conf']
        color = (0, 0, 255) if severity == 'CRITICAL' else (0, 165, 255) if severity == 'MODERATE' else (0, 255, 0)
        cv2.rectangle(img, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
        cv2.putText(img, f"Crack {conf:.2f}", (int(x1), int(y1)-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        # Remove coords from output
        del d['coords']
        
    out_dir = os.path.join(args.base_dir, 'snapshots', args.flightId)
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, f"{args.frameIndex}.jpg")
    cv2.imwrite(out_file, img)
    
    # Overall frame severity
    frame_status = 'CLEAN'
    if any(d['severity'] == 'CRITICAL' for d in detections):
        frame_status = 'CRITICAL'
    elif any(d['severity'] == 'MODERATE' for d in detections):
        frame_status = 'DEFECT'
    elif detections:
        frame_status = 'WARNING'

    max_conf = max([d['conf'] for d in detections]) if detections else 0.0
    
    output = {
        "success": True,
        "flightId": args.flightId,
        "frameIndex": args.frameIndex,
        "status": frame_status,
        "detections": detections,
        "snapshotUrl": f"/snapshots/{args.flightId}/{args.frameIndex}.jpg",
        "maxConf": max_conf,
        "note": "Using Crack-detection MobileNet model with sliding window."
    }
    
    print(json.dumps(output))

if __name__ == "__main__":
    main()
