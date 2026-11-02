import cv2
import json
import base64
import asyncio
import logging
from typing import Set, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.services.camera_manager import camera_manager
from app.services.face_detector import face_detector
from app.services.face_tracker import face_tracker
from app.services.face_verification import face_verification_engine

logger = logging.getLogger("websocket")

class ConnectionManager:
    """Manages active WebSocket connections for camera streaming and face events."""
    def __init__(self):
        self.active_camera_connections: Set[WebSocket] = set()
        self.active_event_connections: Set[WebSocket] = set()

    async def connect_camera(self, websocket: WebSocket):
        await websocket.accept()
        self.active_camera_connections.add(websocket)

    def disconnect_camera(self, websocket: WebSocket):
        self.active_camera_connections.discard(websocket)

    async def connect_events(self, websocket: WebSocket):
        await websocket.accept()
        self.active_event_connections.add(websocket)

    def disconnect_events(self, websocket: WebSocket):
        self.active_event_connections.discard(websocket)

    async def broadcast_event(self, event_data: Dict[str, Any]):
        for conn in list(self.active_event_connections):
            try:
                await conn.send_json(event_data)
            except Exception:
                self.disconnect_events(conn)

ws_manager = ConnectionManager()

async def camera_websocket_endpoint(websocket: WebSocket):
    """
    Real-Time WebSocket stream endpoint (/ws/camera).
    - Can stream server-side OpenCV capture frames (JPEG Base64) + bounding boxes.
    - Can receive client-side browser webcam frames concurrently, process them, and send back real-time overlays.
    """
    await ws_manager.connect_camera(websocket)
    db: Session = SessionLocal()

    # Dedicated reactive receiver for client browser frames with zero-polling sub-10ms response
    async def receive_client_frames():
        nonlocal verified_faces
        import numpy as np
        while True:
            try:
                data = await websocket.receive_text()
                msg = json.loads(data)
                if msg.get("type") == "browser_frame" and "image" in msg:
                    raw_data = msg["image"]
                    if "," in raw_data:
                        raw_data = raw_data.split(",")[1]
                    img_bytes = base64.b64decode(raw_data)
                    nparr = np.frombuffer(img_bytes, np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    if frame is not None:
                        camera_manager.set_browser_frame(frame)
                        h, w, _ = frame.shape
                        # Immediate reactive AI inference
                        detected = face_detector.detect_faces(frame)
                        tracked = face_tracker.update(detected)
                        verified_faces = face_verification_engine.process_tracked_faces(db, tracked)
                        cam_status = camera_manager.get_status()

                        payload = {
                            "type": "camera_frame",
                            "frame": None,
                            "faces": verified_faces,
                            "telemetry": {
                                "fps": cam_status["fps"],
                                "resolution": f"{w}x{h}",
                                "camera_name": cam_status["camera_name"],
                                "is_external": cam_status["is_external"],
                                "source": cam_status["source"],
                                "source_type": "browser_stream",
                                "is_running": True,
                                "faces_detected": len(verified_faces),
                                "registered_matches": sum(1 for f in verified_faces if f["verification_status"] == "REGISTERED"),
                                "new_faces": sum(1 for f in verified_faces if f["verification_status"] in ["CHECKING", "POTENTIALLY_NEW"]),
                                "pending_verification": sum(1 for f in verified_faces if f["verification_status"] == "VERIFICATION_REQUIRED")
                            }
                        }
                        await websocket.send_text(json.dumps(payload))
            except WebSocketDisconnect:
                break
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error handling reactive browser frame: {e}")
                await asyncio.sleep(0.01)

    receiver_task = asyncio.create_task(receive_client_frames())
    last_processed_time = 0.0
    verified_faces = []

    try:
        while True:
            cam_status = camera_manager.get_status()

            # For server-side OpenCV capture (hardware USB / IP cameras)
            if cam_status.get("source_type") != "browser_stream" and cam_status.get("is_running"):
                frame, frame_time = camera_manager.get_latest_frame_with_timestamp()
                if frame is not None and frame_time != last_processed_time:
                    last_processed_time = frame_time
                    detected = face_detector.detect_faces(frame)
                    tracked = face_tracker.update(detected)
                    verified_faces = face_verification_engine.process_tracked_faces(db, tracked)

                    ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 65])
                    frame_b64 = base64.b64encode(buffer).decode('utf-8') if ret else None

                    payload = {
                        "type": "camera_frame",
                        "frame": f"data:image/jpeg;base64,{frame_b64}" if frame_b64 else None,
                        "faces": verified_faces,
                        "telemetry": {
                            "fps": cam_status["fps"],
                            "resolution": cam_status["resolution"],
                            "camera_name": cam_status["camera_name"],
                            "is_external": cam_status["is_external"],
                            "source": cam_status["source"],
                            "source_type": cam_status["source_type"],
                            "is_running": cam_status["is_running"],
                            "faces_detected": len(verified_faces),
                            "registered_matches": sum(1 for f in verified_faces if f["verification_status"] == "REGISTERED"),
                            "new_faces": sum(1 for f in verified_faces if f["verification_status"] in ["CHECKING", "POTENTIALLY_NEW"]),
                            "pending_verification": sum(1 for f in verified_faces if f["verification_status"] == "VERIFICATION_REQUIRED")
                        }
                    }
                    await websocket.send_text(json.dumps(payload))
                await asyncio.sleep(0.033)
            elif not cam_status.get("is_running") and cam_status.get("source_type") != "browser_stream":
                # Idle heartbeat for stopped status
                payload = {
                    "type": "camera_status",
                    "telemetry": cam_status,
                    "faces": []
                }
                await websocket.send_text(json.dumps(payload))
                await asyncio.sleep(0.5)
            else:
                # Browser stream is actively handled by reactive receiver; sleep peacefully here
                await asyncio.sleep(0.5)

    except WebSocketDisconnect:
        logger.info("Camera WebSocket client disconnected.")
    except Exception as e:
        logger.error(f"Error in camera websocket loop: {e}")
    finally:
        receiver_task.cancel()
        ws_manager.disconnect_camera(websocket)
        db.close()

async def face_events_websocket_endpoint(websocket: WebSocket):
    """Event channel for real-time alerts, registrations, and audits (/ws/face-events)."""
    await ws_manager.connect_events(websocket)
    try:
        while True:
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        pass
    finally:
        ws_manager.disconnect_events(websocket)
