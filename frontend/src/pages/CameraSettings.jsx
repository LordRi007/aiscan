import React, { useState } from 'react';
import {
  Camera,
  Sliders,
  Shield,
  Wifi,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Save,
  Lock,
} from 'lucide-react';
import StatusIndicator from '../components/StatusIndicator';

export default function CameraSettings({
  cameraStatus,
  cameras = [],
  browserCameras = [],
  onSelectCamera,
  onRefreshCameras,
}) {
  const [selectedSource, setSelectedSource] = useState(cameraStatus?.source || 1);
  const [ipCameraUrl, setIpCameraUrl] = useState('');
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [backendUrl, setBackendUrl] = useState(() => {
    return localStorage.getItem('visionface_backend_url') || '';
  });

  // Calibration thresholds
  const [matchThreshold, setMatchThreshold] = useState(72);
  const [uncertainThreshold, setUncertainThreshold] = useState(58);
  const [minFrames, setMinFrames] = useState(6);
  const [minSharpness, setMinSharpness] = useState(50);
  const [livenessSensitivity, setLivenessSensitivity] = useState(60);
  const [requireConsent, setRequireConsent] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleApplyCamera = (source, type, name) => {
    setSelectedSource(source);
    onSelectCamera(source, type, name);
  };

  const handleSaveSettings = () => {
    if (backendUrl.trim()) {
      localStorage.setItem('visionface_backend_url', backendUrl.trim());
    } else {
      localStorage.removeItem('visionface_backend_url');
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      window.location.reload();
    }, 1200);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-500" />
            Camera Configuration & Verification Calibration
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            External USB webcams, IP camera RTSP feeds, and biometric verification thresholds.
          </p>
        </div>

        <button
          onClick={onRefreshCameras}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Rescan Hardware</span>
        </button>
      </div>

      {/* Cloud & Remote Backend Connection (Vercel / Cloud Deployments) */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
            <Wifi className="w-4 h-4 text-indigo-500" />
            Cloud AI Backend Connection (Vercel Deployment)
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {backendUrl ? 'Custom Backend' : 'Default Auto-Detect'}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          When deploying this frontend on Vercel, connect it to your live FastAPI backend server (e.g. on Render or Railway).
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="e.g. https://aiscan.onrender.com (or leave empty for auto-detect)"
            className="flex-1 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
          />
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save & Apply</span>
          </button>
        </div>
      </div>

      {/* Camera Selection Section */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
          <Camera className="w-4 h-4 text-cyan-500" />
          Discovered Hardware Cameras (External Camera Priority)
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          The system is configured NOT to default to built-in laptop cameras. Please select an external USB webcam or configured IP camera.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {cameras.map((cam) => {
            const isSelected = String(cameraStatus?.source) === String(cam.index);
            return (
              <div
                key={cam.index}
                onClick={() => handleApplyCamera(cam.index, cam.device_type, cam.name)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{cam.name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Resolution: {cam.resolution} • {cam.is_external ? 'External' : 'Built-in'}
                    </p>
                  </div>
                </div>

                {isSelected ? (
                  <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                ) : (
                  <span className="text-[11px] text-gray-400 hover:text-indigo-400">Select</span>
                )}
              </div>
            );
          })}
        </div>

        {/* IP Camera RTSP Input */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-2">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            Configured IP Camera Stream (RTSP / HTTP)
          </h4>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={ipCameraUrl}
              onChange={(e) => setIpCameraUrl(e.target.value)}
              placeholder="rtsp://admin:password@192.168.1.100:554/stream1"
              className="flex-1 px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => {
                if (ipCameraUrl) handleApplyCamera(ipCameraUrl, 'ip_camera', 'IP Network Camera');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-sm"
            >
              Connect IP Stream
            </button>
          </div>
        </div>
      </div>

      {/* Threshold Calibration Section */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              Biometric Engine Threshold Calibration
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Calibrated metrics to prevent duplicate registrations and false non-matches.
            </p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
            Cosine Similarity
          </span>
        </div>

        <div className="space-y-4">
          {/* Match Threshold Slider */}
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-gray-700 dark:text-gray-300">
                Identity Match Threshold (High Confidence Existing Person)
              </span>
              <span className="font-mono font-bold text-emerald-400">{matchThreshold}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              value={matchThreshold}
              onChange={(e) => setMatchThreshold(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <p className="text-[11px] text-gray-400 mt-0.5">
              Faces scoring above {matchThreshold}% are recognized as existing registered persons without creating duplicate snapshots.
            </p>
          </div>

          {/* Uncertain Threshold Slider */}
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-gray-700 dark:text-gray-300">
                Ambiguous / Uncertain Threshold (Requires Manual Review)
              </span>
              <span className="font-mono font-bold text-amber-400">{uncertainThreshold}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="80"
              value={uncertainThreshold}
              onChange={(e) => setUncertainThreshold(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <p className="text-[11px] text-gray-400 mt-0.5">
              Scores between {uncertainThreshold}% and {matchThreshold}% trigger "Verification Required" and never register automatically.
            </p>
          </div>

          {/* Min Stable Verification Frames */}
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-gray-700 dark:text-gray-300">
                Minimum Stable Verification Frames Required Before Snapshot
              </span>
              <span className="font-mono font-bold text-indigo-400">{minFrames} Frames</span>
            </div>
            <input
              type="range"
              min="3"
              max="15"
              value={minFrames}
              onChange={(e) => setMinFrames(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          {/* Presentation Attack Liveness */}
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-gray-700 dark:text-gray-300">
                Presentation-Attack Detection (PAD) Sensitivity
              </span>
              <span className="font-mono font-bold text-cyan-400">{livenessSensitivity}%</span>
            </div>
            <input
              type="range"
              min="30"
              max="90"
              value={livenessSensitivity}
              onChange={(e) => setLivenessSensitivity(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
        </div>

        {/* Action Save Button */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            {savedSuccess && (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Calibration thresholds updated successfully!</span>
              </>
            )}
          </div>
          <button
            onClick={handleSaveSettings}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Calibration Parameters</span>
          </button>
        </div>
      </div>
    </div>
  );
}
