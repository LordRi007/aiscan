import React, { useState, useEffect } from 'react';
import {
  Camera,
  Play,
  Square,
  RefreshCw,
  Eye,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Sparkles,
  BarChart2,
  Clock,
  Layers,
  Activity,
} from 'lucide-react';
import CameraFeed from '../components/CameraFeed';
import ExpressionOverlay from '../components/ExpressionOverlay';
import StatusIndicator from '../components/StatusIndicator';
import { faceService } from '../services/faceService';

export default function LiveScanner({
  cameraStatus,
  cameras = [],
  selectedDeviceId = null,
  onSelectCamera,
  onStartCamera,
  onStopCamera,
  onNavigate,
  lastWsMessage,
  onSendClientFrame,
}) {
  const [showBoxes, setShowBoxes] = useState(true);
  const [showExpressions, setShowExpressions] = useState(true);

  // Extract real-time telemetry and faces from WebSocket message
  const faces = lastWsMessage?.faces || [];
  const telemetry = lastWsMessage?.telemetry || cameraStatus || {};
  const frameSrc = lastWsMessage?.frame || null;

  // Track running state reliably without getting stuck or desynchronizing
  const isRunning = Boolean(cameraStatus?.is_running || telemetry?.is_running);
  const isClientMode =
    telemetry?.source_type === 'browser_stream' ||
    cameraStatus?.source_type === 'browser_stream' ||
    String(cameraStatus?.source).startsWith('browser_') ||
    String(telemetry?.source).startsWith('browser_') ||
    String(cameraStatus?.source) === '-1' ||
    String(telemetry?.source) === '-1';

  // Counts
  const totalFaces = faces.length;
  const registeredCount = faces.filter((f) => f.verification_status === 'REGISTERED').length;
  const newRegisteredCount = faces.filter((f) => f.verification_status === 'NEW_REGISTERED').length;
  const checkingCount = faces.filter((f) => f.verification_status === 'CHECKING' || f.verification_status === 'POTENTIALLY_NEW').length;
  const pendingCount = faces.filter((f) => f.verification_status === 'VERIFICATION_REQUIRED').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Live AI Multi-Face Scanner
            </h2>
            <StatusIndicator
              status={isRunning ? 'streaming' : 'disconnected'}
              label={isRunning ? 'ACTIVE SCANNING' : 'OFFLINE'}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time multi-person tracking, biometric identity verification, and tentative facial expression classification.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {isRunning ? (
            <button
              onClick={onStopCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Scanner</span>
            </button>
          ) : (
            <button
              onClick={onStartCamera}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Live Scan</span>
            </button>
          )}

          {/* Camera Device Dropdown Selector */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs shadow-sm">
            <Camera className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            <select
              value={cameraStatus?.source ?? -1}
              onChange={(e) => {
                const val = e.target.value;
                const cam = cameras.find((c) => String(c.index) === String(val));
                if (cam) {
                  onSelectCamera(cam.index, cam.device_type, cam.name, cam.deviceId);
                } else {
                  onSelectCamera(val, 'usb_webcam', `Camera ${val}`, null);
                }
              }}
              className="bg-transparent text-gray-800 dark:text-gray-200 font-medium focus:outline-none cursor-pointer max-w-[210px] truncate"
            >
              {cameras.map((c) => (
                <option key={c.index} value={c.index} className="dark:bg-gray-800 dark:text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onNavigate('analytics')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Video Feed (70%) + Right Telemetry Panel (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Video Feed */}
        <div className="lg:col-span-8 space-y-4">
          <CameraFeed
            frameSrc={frameSrc}
            faces={faces}
            telemetry={telemetry}
            showBoxes={showBoxes}
            showExpressions={showExpressions}
            onToggleBoxes={() => setShowBoxes(!showBoxes)}
            onToggleExpressions={() => setShowExpressions(!showExpressions)}
            isClientMode={isClientMode}
            isRunning={isRunning}
            onSendClientFrame={onSendClientFrame}
            selectedDeviceId={selectedDeviceId}
          />

          {/* Color Legend Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div className="min-w-0">
                <p className="font-semibold truncate">Registered Face</p>
                <p className="text-[10px] text-gray-400">Recognized & Tracked</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="min-w-0">
                <p className="font-semibold truncate">Checking Registration</p>
                <p className="text-[10px] text-gray-400">Verifying Multi-Frame</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <div className="min-w-0">
                <p className="font-semibold truncate">New Registered</p>
                <p className="text-[10px] text-gray-400">Snapshot Captured</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-500/10 border border-gray-500/20 text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <div className="min-w-0">
                <p className="font-semibold truncate">Verification Required</p>
                <p className="text-[10px] text-gray-400">Low Quality / Ambiguous</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Face Live Telemetry Panel */}
        <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                Live Camera Telemetry
              </h3>
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {telemetry?.fps || 0} FPS
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Total In Frame</p>
                <p className="text-xl font-bold text-indigo-500 mt-0.5">{totalFaces}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Recognized Matches</p>
                <p className="text-xl font-bold text-emerald-500 mt-0.5">{registeredCount}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Verifying Frames</p>
                <p className="text-xl font-bold text-amber-500 mt-0.5">{checkingCount}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Uncertain / Review</p>
                <p className="text-xl font-bold text-red-400 mt-0.5">{pendingCount}</p>
              </div>
            </div>

            {/* Active Detected Faces List */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Visible People ({totalFaces})
                </h4>
                <span className="text-[10px] text-gray-400">Multi-Target Tracked</span>
              </div>

              {faces.length === 0 ? (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30 text-center text-xs text-gray-400">
                  No faces currently in view
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {faces.map((face) => {
                    const badge = faceService.getVerificationStatusBadge(face.verification_status);
                    return (
                      <div
                        key={face.track_id}
                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 text-xs flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                              {face.person_id || `Track #${face.track_id}`}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${badge.bg}`}>
                              {badge.text}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                            <span>
                              Mood: <strong className="text-indigo-400 font-semibold">{face.expression_emoji || faceService.getExpressionEmoji(face.expression)} {face.expression}</strong> ({face.expression_confidence}%)
                            </span>
                            <span>•</span>
                            <span>Liveness: {Math.round(face.liveness_score * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* System Safety Guarantee Alert */}
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/40 text-xs text-indigo-300 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-200">Strict Duplicate Prevention</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                New registration snapshots require stability, sharpness qualification, presentation attack checks, and database cross-comparison.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel: Activity & Verification Event Log */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            Real-Time Audit & Recognition Events
          </h3>
          <span className="text-xs text-gray-400">Live Stream Logs</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50">
            <p className="font-semibold text-gray-700 dark:text-gray-300">Camera Device</p>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{telemetry?.camera_name || 'Standard Webcam'}</p>
            <p className="text-[11px] text-emerald-400 font-mono mt-0.5">Resolution: {telemetry?.resolution || '1280x720'}</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50">
            <p className="font-semibold text-gray-700 dark:text-gray-300">Verification Protocol</p>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Multi-Frame Cosine Similarity (Threshold: 0.72)</p>
            <p className="text-[11px] text-cyan-400 font-mono mt-0.5">Presentation-Attack: Active</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50">
            <p className="font-semibold text-gray-700 dark:text-gray-300">Expression Classifier</p>
            <p className="text-gray-500 dark:text-gray-400 mt-1">8 Action-Unit Morphology Categories</p>
            <p className="text-[11px] text-amber-400 font-mono mt-0.5">Scientific Disclaimer: Labeled</p>
          </div>
        </div>
      </div>
    </div>
  );
}
