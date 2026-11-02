import React from 'react';
import { Camera, Sun, Moon, Video, VideoOff, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import StatusIndicator from './StatusIndicator';

export default function Header({
  cameraStatus,
  cameras = [],
  onSelectCamera,
  onStartCamera,
  onStopCamera,
  isDarkMode,
  onToggleDarkMode,
  onNavigate,
  activeFaceCount = 0,
  telemetry = null,
}) {
  const isRunning = Boolean(cameraStatus?.is_running || telemetry?.is_running);
  const isExternal = cameraStatus?.is_external ?? telemetry?.is_external;

  return (
    <header className="h-16 bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between transition-colors duration-200">
      {/* Left: Active Camera Telemetry & Selection */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <StatusIndicator
            status={isRunning ? 'streaming' : 'disconnected'}
            label={isRunning ? 'LIVE CAMERA STREAMING' : 'CAMERA IDLE'}
            pulse={isRunning}
          />

          {isExternal && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20">
              <Camera className="w-3 h-3" />
              External Camera
            </span>
          )}

          {!isExternal && isRunning && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-3 h-3" />
              Built-in (External Recommended)
            </span>
          )}
        </div>

        {isRunning && (
          <div className="hidden md:flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 pl-3 border-l border-gray-200 dark:border-gray-800 font-mono">
            <span>FPS: <strong className="text-emerald-500 dark:text-emerald-400">{cameraStatus?.fps || 0}</strong></span>
            <span>Res: {cameraStatus?.resolution || '640x360'}</span>
            <span>Faces: <strong className="text-indigo-400">{activeFaceCount}</strong></span>
          </div>
        )}
      </div>

      {/* Right: Camera Switcher Dropdown, Theme Toggle, Controls */}
      <div className="flex items-center gap-3">
        {/* Camera Selector Dropdown in Header */}
        {cameras.length > 0 && onSelectCamera && (
          <div className="hidden sm:flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/90 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
            <Camera className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
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
              className="bg-transparent text-gray-700 dark:text-gray-200 font-medium focus:outline-none cursor-pointer max-w-[180px] truncate text-xs"
              title="Switch Active Camera"
            >
              {cameras.map((c) => (
                <option key={c.index} value={c.index} className="dark:bg-gray-800 dark:text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* Toggle Dark/Light Mode */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* Start / Stop Camera Primary Button */}
        {isRunning ? (
          <button
            onClick={onStopCamera}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all shadow-sm"
          >
            <VideoOff className="w-4 h-4" />
            <span>Stop Camera</span>
          </button>
        ) : (
          <button
            onClick={onStartCamera}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30"
          >
            <Video className="w-4 h-4" />
            <span>Start Camera</span>
          </button>
        )}
      </div>
    </header>
  );
}
