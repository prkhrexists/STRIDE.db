import os
import base64
from fastapi import APIRouter
from pydantic import BaseModel
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import staticmap

router = APIRouter(prefix="/api/report", tags=["Report"])

class GPSPoint(BaseModel):
    lat: float
    lon: float

class ReportRequest(BaseModel):
    narrative: str
    gps_points: list[GPSPoint]

@router.post("/generate")
async def generate_report(req: ReportRequest):
    # 1. Map generation
    m = staticmap.StaticMap(800, 400)
    for pt in req.gps_points:
        m.add_marker(staticmap.CircleMarker((pt.lon, pt.lat), 'red', 12))
    
    map_image = m.render()
    map_path = "/tmp/static_map.png"
    map_image.save(map_path)
    
    # 2. PDF Assembly
    pdf_path = "/tmp/generated_report.pdf"
    c = canvas.Canvas(pdf_path, pagesize=letter)
    
    # Cover
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, 750, "AEGIS Python Inspection Report")
    
    # Narrative
    c.setFont("Helvetica", 12)
    textobject = c.beginText(50, 700)
    for line in req.narrative.split('\n'):
        textobject.textLine(line)
    c.drawText(textobject)
    
    # Insert Map
    if os.path.exists(map_path):
        c.drawImage(map_path, 50, 300, width=500, height=250)
        
    c.save()
    
    # Encode for transport
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()
        
    return {"pdf_base64": base64.b64encode(pdf_bytes).decode('utf-8')}
