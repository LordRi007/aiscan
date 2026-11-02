import React, { useState, useEffect } from 'react';
import {
  Users,
  Scan,
  Video,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Smile,
  ArrowUpRight,
  TrendingUp,
  Activity,
} from 'lucide-react';
import AnalyticsChart from '../components/AnalyticsChart';
import StatusIndicator from '../components/StatusIndicator';
import { api } from '../services/api';

export default function Dashboard({ onNavigate, cameraStatus }) {
  const [overview, setOverview] = useState({
    total_registered_people: 0,
    faces_currently_detected: 0,
    active_camera_sessions: 0,
    new_registrations_today: 0,
    existing_identity_matches: 0,
    verification_pending: 0,
    uncertain_expression_results: 0,
    camera_fps: 0,
  });
  const [registrationTrends, setRegistrationTrends] = useState([]);
  const [expressionData, setExpressionData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ov, reg, expr] = await Promise.all([
          api.getOverview(),
          api.getRegistrations(7),
          api.getExpressionDistribution(),
        ]);
        setOverview(ov);
        setRegistrationTrends(reg || []);
        setExpressionData(expr?.categories || []);
      } catch (err) {
        console.warn('Dashboard telemetry load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      title: 'Total Registered',
      value: overview.total_registered_people,
      subtitle: 'Enrolled identities in database',
      icon: Users,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      action: () => onNavigate('people'),
    },
    {
      title: 'Faces Detected Now',
      value: overview.faces_currently_detected,
      subtitle: `${cameraStatus?.fps || 0} FPS live capture`,
      icon: Scan,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      action: () => onNavigate('scanner'),
    },
    {
      title: 'New Today',
      value: overview.new_registrations_today,
      subtitle: 'Verified new captures',
      icon: UserPlus,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      action: () => onNavigate('people'),
    },
    {
      title: 'Pending Verification',
      value: overview.verification_pending,
      subtitle: 'Flagged for review / low quality',
      icon: AlertCircle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      action: () => onNavigate('verification'),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            System Overview & Health
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time biometric analytics, tracking integrity, and presentation attack mitigation.
          </p>
        </div>

        <button
          onClick={() => onNavigate('scanner')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all"
        >
          <Scan className="w-4 h-4" />
          <span>Launch Live Scanner</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              onClick={c.action}
              className={`p-5 rounded-2xl bg-white dark:bg-[#111827] border ${c.border} shadow-sm hover:shadow-md transition-all cursor-pointer group`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {c.title}
                </span>
                <div className={`p-2 rounded-xl ${c.bg} ${c.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {c.value}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-between">
                <span>{c.subtitle}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Registration Trends */}
        <div className="lg:col-span-8 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                Verified New Registrations (Last 7 Days)
              </h3>
              <p className="text-xs text-gray-400">
                Guaranteed zero duplicate entries created
              </p>
            </div>
            <span className="text-xs font-mono text-indigo-400">Activity Trend</span>
          </div>

          <AnalyticsChart
            type="area"
            data={registrationTrends}
            xKey="date"
            yKey="registrations"
            name="New Registrations"
            color="#6366F1"
            height={240}
          />
        </div>

        {/* Right: Expression Distribution */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <Smile className="w-4 h-4 text-emerald-500" />
                Estimated Expressions
              </h3>
              <p className="text-xs text-gray-400">
                Surface AU muscular morphology
              </p>
            </div>
          </div>

          <AnalyticsChart
            type="pie"
            data={expressionData}
            xKey="category"
            yKey="count"
            height={240}
          />

          <div className="mt-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 text-[11px] text-gray-500 dark:text-gray-400 text-center">
            Estimated visual expression morphology only; not verified internal feelings.
          </div>
        </div>
      </div>
    </div>
  );
}
