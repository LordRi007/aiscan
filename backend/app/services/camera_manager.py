import cv2
import time
import threading
import logging
from typing import Optional, Dict, Any, List, Tuple
from app.config import settings

logger = logging.getLogger("camera_manager")

class CameraManager:
    """
    Intelligent External Camera Connection Module.
    - Prioritizes external USB webcams (index >= 1) and IP cameras over laptop built-in webcam (index 0).
    - Auto-reconnection logic.
    - FPS tracking, resolution, status telemetry.
    - Thread-safe frame grabbing.
    """
    def __init__(self):
        self._cap: Optional[cv2.VideoCapture] = None
        self._current_source: Any = settings.default_external_camera_index
        self._source_type: str = "usb_webcam" # usb_webcam, ip_camera, client_stream
        self._is_running: bool = False
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self._latest_frame = None
        self._latest_frame_time: float = 0.0
        self._fps: float = 0.0
        self._frame_count: int = 0
        self._fps_start_time: float = time.time()
        self._last_error: Optional[str] = None
        self._camera_name: str = "Disconnected"
        self._resolution: Tuple[int, int] = (0, 0)
        self._discovered_cameras: List[Dict[str, Any]] = []
        self._auto_reconnect: bool = True
        self._browser_stream_active: bool = False
        
    def discover_cameras(self) -> List[Dict[str, Any]]:
        """
        Scan and discover available USB camera indices.
        Differentiates between built-in webcam (index 0) and external webcams (index >= 1).
        """
        cameras = []
        # Check indices 0 through 4
        for idx in range(5):
            cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW if cv2.CAP_DSHOW else cv2.CAP_ANY)
            if cap.isOpened():
                ret, _ = cap.read()
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                cap.release()
                if ret:
                    is_builtin = (idx == settings.builtin_camera_index)
                    cameras.append({
                        "index": idx,
                        "name": f"USB Camera {idx}" + (" (Built-in Laptop Camera)" if is_builtin else " (External Webcam)"),
                        "device_type": "usb_webcam",
                        "is_external": not is_builtin,
                        "resolution": f"{w}x{h}",
                        "is_default": (idx == settings.default_external_camera_index)
                    })
        
        # If no external USB webcam was found, also list browser WebRTC stream as an external option
        cameras.append({
            "index": -1,
            "name": "Browser External USB Webcam (Browser MediaDevices)",
            "device_type": "browser_stream",
            "is_external": True,
            "resolution": "1280x720",
            "is_default": False
        })
        
        self._discovered_cameras = cameras
        return cameras

    def select_camera(self, source: Any, source_type: str = "usb_webcam") -> bool:
        """
        Select and configure camera.
        """
        with self._lock:
            self._current_source = source
            self._source_type = source_type
            if source_type == "browser_stream":
                self._browser_stream_active = True
                self._camera_name = "Browser External Webcam"
                self._resolution = (settings.frame_width, settings.frame_height)
                self._is_running = True
                return True
            else:
                self._browser_stream_active = False

        if self._is_running:
            self.stop()
            return self.start()
        return True

    def start(self) -> bool:
        """
        Start camera stream. If external camera is selected, connect via OpenCV.
        """
        with self._lock:
            if self._is_running and self._cap and self._cap.isOpened():
                return True
            
            if self._source_type == "browser_stream":
                self._is_running = True
                self._browser_stream_active = True
                self._camera_name = "Browser External Webcam"
                return True

            source = self._current_source
            try:
                # If numeric source, convert to int
                if isinstance(source, str) and source.isdigit():
                    source = int(source)
                
                # Use DirectShow backend on Windows for fast USB enumeration
                backend = cv2.CAP_DSHOW if isinstance(source, int) else cv2.CAP_ANY
                self._cap = cv2.VideoCapture(source, backend)
                
                if not self._cap.isOpened():
                    # Fallback to default index 0 if external index 1 is not plugged in
                    if isinstance(source, int) and source != 0:
                        logger.warning(f"External camera index {source} unavailable. Attempting auto fallback...")
                        self._cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
                        if self._cap.isOpened():
                            source = 0
                            self._current_source = 0

                if not self._cap or not self._cap.isOpened():
                    self._last_error = f"Cannot open camera source: {source}"
                    self._camera_name = "Failed to connect"
                    return False

                # Configure resolution
                self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, settings.frame_width)
                self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, settings.frame_height)
                self._cap.set(cv2.CAP_PROP_FPS, settings.target_fps)
                
                actual_w = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                actual_h = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                self._resolution = (actual_w, actual_h)
                
                is_ext = (source != settings.builtin_camera_index)
                self._camera_name = f"Camera {source} (" + ("External USB" if is_ext else "Built-in") + ")"
                self._is_running = True
                self._last_error = None
                
            except Exception as e:
                self._last_error = str(e)
                logger.error(f"Failed to start camera: {e}")
                return False

        # Launch background capture worker
        self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._thread.start()
        return True

    def _capture_loop(self):
        """Continuous frame grabber with FPS calculation and safe in-thread auto-reconnection."""
        consecutive_failures = 0
        while self._is_running:
            if self._source_type == "browser_stream":
                time.sleep(0.05)
                continue

            if not self._cap or not self._cap.isOpened():
                if self._auto_reconnect and self._is_running:
                    time.sleep(1.0)
                    with self._lock:
                        try:
                            source = self._current_source
                            if isinstance(source, str) and source.isdigit():
                                source = int(source)
                            backend = cv2.CAP_DSHOW if isinstance(source, int) else cv2.CAP_ANY
                            self._cap = cv2.VideoCapture(source, backend)
                        except Exception as e:
                            logger.error(f"In-loop camera reopen failed: {e}")
                else:
                    break
                continue

            try:
                ret, frame = self._cap.read()
            except Exception as e:
                ret = False
                frame = None

            if not ret or frame is None:
                consecutive_failures += 1
                if consecutive_failures > 15:
                    logger.warning("Frame read failed multiple times, attempting reconnect on current thread...")
                    time.sleep(0.5)
                    with self._lock:
                        if self._cap:
                            try:
                                self._cap.release()
                            except Exception:
                                pass
                            self._cap = None
                    consecutive_failures = 0
                time.sleep(0.05)
                continue

            consecutive_failures = 0
            with self._lock:
                self._latest_frame = frame
                self._latest_frame_time = time.time()
                self._frame_count += 1
                elapsed = self._latest_frame_time - self._fps_start_time
                if elapsed >= 1.0:
                    self._fps = round(self._frame_count / elapsed, 1)
                    self._frame_count = 0
                    self._fps_start_time = self._latest_frame_time

            time.sleep(0.01)

    def set_browser_frame(self, frame_bgr):
        """Ingest frame received from frontend browser webcam via WebSocket."""
        with self._lock:
            self._latest_frame = frame_bgr
            self._latest_frame_time = time.time()
            self._frame_count += 1
            if frame_bgr is not None:
                self._resolution = (frame_bgr.shape[1], frame_bgr.shape[0])
            elapsed = self._latest_frame_time - self._fps_start_time
            if elapsed >= 1.0:
                self._fps = round(self._frame_count / elapsed, 1)
                self._frame_count = 0
                self._fps_start_time = self._latest_frame_time
            self._is_running = True
            self._camera_name = "Browser External Webcam"

    def get_latest_frame(self):
        """Retrieve most recent frame safely."""
        with self._lock:
            if self._latest_frame is None:
                return None
            return self._latest_frame.copy()

    def get_latest_frame_with_timestamp(self):
        """Retrieve most recent frame and its arrival timestamp safely."""
        with self._lock:
            if self._latest_frame is None:
                return None, 0.0
            return self._latest_frame.copy(), self._latest_frame_time

    def get_status(self) -> Dict[str, Any]:
        """Telemetry and connection status."""
        with self._lock:
            # Check if frame is fresh (within last 3 seconds)
            is_active = self._is_running and (time.time() - self._latest_frame_time < 3.0)
            return {
                "is_running": self._is_running,
                "is_active": is_active,
                "camera_name": self._camera_name,
                "source": str(self._current_source),
                "source_type": self._source_type,
                "resolution": f"{self._resolution[0]}x{self._resolution[1]}",
                "fps": self._fps if is_active else 0.0,
                "last_error": self._last_error,
                "is_external": (self._current_source != settings.builtin_camera_index)
            }

    def stop(self):
        """Stop camera and release hardware resources cleanly."""
        self._is_running = False
        if self._thread and self._thread.is_alive() and threading.current_thread() != self._thread:
            try:
                self._thread.join(timeout=1.0)
            except Exception:
                pass
        with self._lock:
            if self._cap:
                try:
                    self._cap.release()
                except Exception:
                    pass
                self._cap = None
            self._latest_frame = None
            self._fps = 0.0

camera_manager = CameraManager()
