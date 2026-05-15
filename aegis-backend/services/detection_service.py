import os
import base64
import hashlib
import json
from fastapi import APIRouter, UploadFile, File, HTTPException
import openai
import redis

router = APIRouter(prefix="/api/detect", tags=["Detection"])

# Allow gracefully failing if redis is offline for local dev
try:
    redis_client = redis.Redis(host=os.getenv('REDIS_HOST', 'localhost'), port=6379, db=0, decode_responses=True)
    redis_client.ping()
    CACHE_ENABLED = True
except redis.ConnectionError:
    print("Redis offline. Caching disabled.")
    CACHE_ENABLED = False

@router.post("/")
async def detect_defects(file: UploadFile = File(...)):
    contents = await file.read()
    file_hash = hashlib.sha256(contents).hexdigest()
    
    if CACHE_ENABLED:
        cached = redis_client.get(file_hash)
        if cached:
            return json.loads(cached)

    base64_image = base64.b64encode(contents).decode("utf-8")
    media_type = file.content_type or "image/jpeg"
    api_key = os.getenv("SARVAM_API_KEY")

    if not api_key:
        raise HTTPException(status_code=500, detail="Missing SARVAM_API_KEY")

    try:
        client = openai.OpenAI(
            base_url="https://api.sarvam.ai/v1",
            api_key=api_key
        )
        response = client.chat.completions.create(
            model="sarvam-105b",
            max_tokens=1024,
            messages=[
                {
                    "role": "system",
                    "content": "Analyze structural image. Return ONLY valid JSON: { defects: [{ type, severity, confidence, description, location, recommendedAction }], overallCondition, needsImmediateAttention }"
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{base64_image}"
                            }
                        },
                        {"type": "text", "text": "Analyze this structural inspection image. Return ONLY valid JSON."}
                    ],
                }
            ],
        )
        
        result_text = response.choices[0].message.content
        
        if result_text.startswith("```json"):
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        
        parsed = json.loads(result_text)
        
        if CACHE_ENABLED:
            redis_client.setex(file_hash, 86400, json.dumps(parsed))
            
        return parsed
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
