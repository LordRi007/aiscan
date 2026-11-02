import React, { useRef, useEffect, useState } from 'react';
import { Maximize2, Minimize2, Eye, EyeOff, ShieldAlert, FlipHorizontal, RefreshCw } from 'lucide-react';
import FaceBoundingBox from './FaceBoundingBox';

export default function CameraFeed({
  frameSrc,
  faces = [],
  telemetry = {},
  showBoxes = true,
  showExpressions = true,
  onToggleBoxes,
  onToggleExpressions,
  isClientMode = false,
  isRunning = false,
  onSendClientFrame = null,
  selectedDeviceId = null,
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Persist mirrored preference (selfie mirror mode) so left/right matches user preference
  const [isMirrored, setIsMirrored] = useState(() => {
    try {
      const saved = localStorage.getItem('visionface_mirrored');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleMirror = () => {
    setIsMirrored((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('visionface_mirrored', String(next));
      } catch {}
      return next;
    });
  };

  // Parse natural resolution from telemetry (e.g. "640x360" or "1280x720")
  const [naturalWidth, naturalHeight] = (telemetry?.resolution || '640x360')
    .split('x')
    .map(Number);

  // Resize observer to ensure bounding boxes scale seamlessly with container
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width && entry.contentRect.height) {
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Client webcam stream handler if in browser camera mode and camera is active
  useEffect(() => {
    if (!isClientMode || !isRunning || !onSendClientFrame) {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      return;
    }

    let localStream = null;
    let intervalId = null;
    let isCancelled = false;

    const videoConstraints = selectedDeviceId
      ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
      : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' };

    navigator.mediaDevices
      .getUserMedia({
        video: videoConstraints,
        audio: false,
      })
      .then((stream) => {
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        const hiddenCanvas = document.createElement('canvas');
        const ctx = hiddenCanvas.getContext('2d');
        let isSending = false;

        // High-speed real-time 30 FPS client ingestion loop
        // Downscaling to 360px reduces canvas encoding to <0.5ms and keeps tracking ultra-smooth
        intervalId = setInterval(() => {
          if (videoRef.current && videoRef.current.readyState >= 2 && !isSending) {
            const vw = videoRef.current.videoWidth || 640;
            const vh = videoRef.current.videoHeight || 360;
            const targetW = 360;
            const targetH = Math.round(targetW * (vh / vw));

            if (hiddenCanvas.width !== targetW || hiddenCanvas.height !== targetH) {
              hiddenCanvas.width = targetW;
              hiddenCanvas.height = targetH;
            }

            ctx.drawImage(videoRef.current, 0, 0, targetW, targetH);
            const dataUrl = hiddenCanvas.toDataURL('image/jpeg', 0.5);
            isSending = true;
            try {
              onSendClientFrame(dataUrl);
            } finally {
              isSending = false;
            }
          }
        }, 32); // 30+ FPS transmission with reactive zero-delay backend
      })
      .catch((err) => {
        console.warn('Browser webcam stream access failed:', err);
      });

    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isClientMode, isRunning, onSendClientFrame, selectedDeviceId]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex items-center justify-center select-none"
    >
      {/* Video Stream Element */}
      {isClientMode && isRunning ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ transform: isMirrored ? 'scaleX(-1)' : 'none' }}
          className="w-full h-full object-cover transition-transform duration-150"
        />
      ) : frameSrc && isRunning ? (
        <img
          src={frameSrc}
          alt="Live Camera Feed"
          style={{ transform: isMirrored ? 'scaleX(-1)' : 'none' }}
          className="w-full h-full object-cover transition-transform duration-150"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-6 text-gray-500">
          <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 mb-4 animate-pulse">
            <ShieldAlert className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-300">Camera Feed Inactive</h3>
          <p className="text-xs text-gray-500 max-w-sm mt-1">
            Click &quot;Start Live Scan&quot; or select a camera from the dropdown to initialize live tracking.
          </p>
        </div>
      )}

      {/* Face Bounding Box Overlays */}
      {showBoxes && faces.map((face) => (
        <FaceBoundingBox
          key={face.track_id}
          face={face}
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
          naturalWidth={naturalWidth || 640}
          naturalHeight={naturalHeight || 360}
          isMirrored={isMirrored}
        />
      ))}

      {/* Scanning Radar HUD Effect */}
      {isRunning && (
        <div className="absolute inset-0 pointer-events-none border border-indigo-500/20 rounded-2xl" />
      )}

      {/* Controls Overlay Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 bg-gray-950/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-800/80 text-xs text-gray-300 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-semibold">{telemetry?.camera_name || 'Camera'}</span>
          <span className="text-gray-500">|</span>
          <span className="font-mono text-emerald-400 font-bold">{telemetry?.fps || 0} FPS</span>
          <span className="text-gray-500">|</span>
          <span className="font-mono text-cyan-400 font-semibold">{faces.length} Faces</span>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-950/75 backdrop-blur-md p-1 rounded-xl border border-gray-800/80 shadow-lg">
          {/* Mirror / Flip Side Button */}
          <button
            onClick={handleToggleMirror}
            className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm ${
              isMirrored
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
            title="Mirror Camera View (Flip Left/Right orientation)"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">{isMirrored ? 'Mirrored (Flipped)' : 'Original (Standard)'}</span>
          </button>

          {/* Toggle Bounding Boxes */}
          <button
            onClick={onToggleBoxes}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              showBoxes ? 'bg-indigo-600/40 text-indigo-300' : 'text-gray-400 hover:text-white'
            }`}
            title="Toggle Bounding Boxes"
          >
            {showBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Toggle Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
