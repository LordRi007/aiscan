import os
import logging
from pathlib import Path
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.database import engine, Base
from app.routers import cameras_router, faces_router, expressions_router, analytics_router
from app.websocket import camera_websocket_endpoint, face_events_websocket_endpoint
from app.services.camera_manager import camera_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve protected registration images
settings.protected_storage_dir.mkdir(parents=True, exist_ok=True)
app.mount("/protected/faces", StaticFiles(directory=str(settings.protected_storage_dir)), name="protected_faces")

# Include API Routers
app.include_router(cameras_router, prefix=settings.api_prefix)
app.include_router(faces_router, prefix=settings.api_prefix)
app.include_router(expressions_router, prefix=settings.api_prefix)
app.include_router(analytics_router, prefix=settings.api_prefix)

# WebSocket Endpoints
@app.websocket("/ws/camera")
async def ws_camera_route(websocket: WebSocket):
    await camera_websocket_endpoint(websocket)

@app.websocket("/ws/face-events")
async def ws_face_events_route(websocket: WebSocket):
    await face_events_websocket_endpoint(websocket)

@app.on_event("startup")
async def startup_event():
    logger.info("Facial Recognition & Mood Analytics System initializing...")
    # Discover available cameras
    cameras = camera_manager.discover_cameras()
    logger.info(f"Discovered cameras: {cameras}")
    
    # Check if external camera index is available, or fallback
    ext_cams = [c for c in cameras if c.get("is_external") and c.get("index", -1) >= 0]
    if ext_cams:
        selected_index = ext_cams[0]["index"]
        logger.info(f"Auto-selecting external USB camera at index {selected_index}")
        camera_manager.select_camera(selected_index, "usb_webcam")
    else:
        logger.info("No physical external camera detected on backend. Setting default to browser stream.")
        camera_manager.select_camera(-1, "browser_stream")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Stopping camera and releasing resources...")
    camera_manager.stop()

# In production, serve built Vite React frontend if present
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if not frontend_dist.exists():
    frontend_dist = Path(__file__).resolve().parent.parent / "dist"

if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend_assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        target = frontend_dist / full_path
        if full_path and target.exists() and target.is_file():
            return FileResponse(str(target))
        return FileResponse(str(frontend_dist / "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "system": settings.app_name,
            "status": "online",
            "api_docs": "/docs"
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
