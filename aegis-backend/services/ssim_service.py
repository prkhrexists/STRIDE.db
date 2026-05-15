import cv2
import numpy as np
import base64
from skimage.metrics import structural_similarity as ssim
from fastapi import APIRouter, UploadFile, File

router = APIRouter(prefix="/api/compare", tags=["SSIM"])

@router.post("/ssim")
async def calculate_ssim(baseline: UploadFile = File(...), current: UploadFile = File(...)):
    b_bytes = np.frombuffer(await baseline.read(), np.uint8)
    c_bytes = np.frombuffer(await current.read(), np.uint8)
    
    img1 = cv2.imdecode(b_bytes, cv2.IMREAD_COLOR)
    img2 = cv2.imdecode(c_bytes, cv2.IMREAD_COLOR)
    
    # Ensure identical dimensions for SSIM algorithm
    img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]))
    
    grayA = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    grayB = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
    
    # Compute SSIM
    score, diff = ssim(grayA, grayB, full=True)
    diff = (diff * 255).astype("uint8")
    
    # Generate bounded change regions via OpenCV Contours
    thresh = cv2.threshold(diff, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
    cnts, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    regions = []
    for c in cnts:
        (x, y, w, h) = cv2.boundingRect(c)
        if w > 20 and h > 20: # noise filter
            regions.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h)})
            cv2.rectangle(img2, (x, y), (x + w, y + h), (0, 0, 255), 2)
            
    _, buffer = cv2.imencode('.jpg', img2)
    diff_b64 = base64.b64encode(buffer).decode('utf-8')
    
    return {
        "score": float(score),
        "diff_image_base64": diff_b64,
        "changed_regions": regions
    }
