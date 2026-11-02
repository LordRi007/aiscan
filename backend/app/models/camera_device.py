from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base

class CameraDevice(Base):
    __tablename__ = "camera_devices"

    id = Column(Integer, primary_key=True, index=True)
    device_name = Column(String(128), nullable=False)
    device_type = Column(String(64), default="usb_webcam")  # usb_webcam, ip_camera, browser_stream
    source_configuration = Column(String(512), nullable=False) # e.g. "1" or "rtsp://..."
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
