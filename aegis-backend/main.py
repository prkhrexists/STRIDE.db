from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.mavlink_service import router as mavlink_router
from services.detection_service import router as detection_router
from services.photogrammetry_service import router as map_router
from services.ssim_service import router as ssim_router
from services.report_service import router as report_router

app = FastAPI(title="AEGIS Control Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mavlink_router)
app.include_router(detection_router)
app.include_router(map_router)
app.include_router(ssim_router)
app.include_router(report_router)

@app.get("/")
def root():
    return {"status": "AEGIS Control Python Backend Online"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
