from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.services.camera_manager import camera_manager
from app.database import get_db
from sqlalchemy.orm import Session
from app.models.camera_device import CameraDevice

router = APIRouter(prefix="/cameras", tags=["Cameras"])

class SelectCameraRequest(BaseModel):
    source: Any
    device_type: str = "usb_webcam" # usb_webcam, ip_camera, browser_stream
    device_name: Optional[str] = None

@router.get("")
def list_cameras():
    """List available cameras with automatic external USB webcam discovery."""
    cameras = camera_manager.discover_cameras()
    status = camera_manager.get_status()
    return {
        "cameras": cameras,
        "active_camera": status
    }

@router.post("/select")
def select_camera(req: SelectCameraRequest, db: Session = Depends(get_db)):
    """Select external camera, USB webcam index, IP camera, or browser stream."""
    success = camera_manager.select_camera(req.source, req.device_type)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to initialize selected camera.")
    
    # Save or update in database
    existing = db.query(CameraDevice).filter(CameraDevice.source_configuration == str(req.source)).first()
    if not existing:
        dev = CameraDevice(
            device_name=req.device_name or f"Camera {req.source}",
            device_type=req.device_type,
            source_configuration=str(req.source),
            is_default=True,
            is_active=True
        )
        db.add(dev)
        db.commit()

    return {"status": "success", "camera": camera_manager.get_status()}

@router.post("/start")
def start_camera():
    """Start live video scanning."""
    success = camera_manager.start()
    return {"status": "success" if success else "failed", "camera": camera_manager.get_status()}

@router.post("/stop")
def stop_camera():
    """Stop live video scanning."""
    camera_manager.stop()
    return {"status": "stopped", "camera": camera_manager.get_status()}

@router.get("/status")
def get_camera_status():
    """Get live camera status, FPS, resolution, and error telemetry."""
    return camera_manager.get_status()
