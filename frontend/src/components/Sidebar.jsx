import React from 'react';
import {
  Scan,
  LayoutDashboard,
  Users,
  BarChart3,
  History,
  Camera,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function Sidebar({ currentPage, onNavigate, cameraActive = false }) {
  const navItems = [
    { id: 'scanner', label: 'Live Scanner', icon: Scan, badge: cameraActive ? 'LIVE' : null, highlight: true },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'people', label: 'Registered People', icon: Users },
    { id: 'analytics', label: 'Facial Analytics', icon: BarChart3 },
    { id: 'verification', label: 'Verification History', icon: History },
    { id: 'settings', label: 'Camera Settings', icon: Camera },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-[#111827] border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen select-none transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
          <Scan className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight text-gray-900 dark:text-white flex items-center gap-1.5">
            VisionFace <span className="text-[10px] bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-semibold px-1.5 py-0.5 rounded border border-indigo-500/20">PRO</span>
          </h1>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
            AI Biometric & Mood Suite
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
          Core Modules
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : item.highlight
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-indigo-500 transition-colors'}`} />
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tracking-wider ${
                    isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white animate-pulse'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Safety & Anti-Duplicate Guarantee Card */}
      <div className="p-3 m-3 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border border-indigo-900/40 text-[11px] text-gray-300">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Biometric Protection</span>
        </div>
        <p className="text-gray-400 text-[11px] leading-relaxed">
          Pre-registration identity verification active. Zero unauthorized or duplicate snapshots.
        </p>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-[11px] text-gray-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Multi-Face AI Engine
        </span>
        <span className="font-mono text-[10px]">v1.2.0</span>
      </div>
    </aside>
  );
}
