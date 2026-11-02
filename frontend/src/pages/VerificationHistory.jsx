import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../services/api';

export default function VerificationHistory() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getVerificationEvents(30);
      setEvents(data || []);
    } catch (err) {
      console.warn('Failed to load verification history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const getResultBadge = (result) => {
    switch (result?.toLowerCase()) {
      case 'approved_registration':
      case 'approved':
        return {
          icon: CheckCircle2,
          text: 'Approved Registration',
          classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        };
      case 'match':
        return {
          icon: ShieldCheck,
          text: 'Existing Match',
          classes: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        };
      case 'ambiguous':
      case 'manual_review':
        return {
          icon: AlertCircle,
          text: 'Ambiguous Match',
          classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        };
      case 'rejected':
      default:
        return {
          icon: XCircle,
          text: 'Verification Flagged',
          classes: 'bg-red-500/10 text-red-400 border-red-500/20',
        };
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-500" />
            Verification History & Audit Trail
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Immutable log of identity verifications, cosine similarity checks, and automated registration decisions.
          </p>
        </div>

        <button
          onClick={loadEvents}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Audit Table */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400">Loading audit log...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            No verification events logged yet. Events are recorded when faces undergo multi-frame verification.
          </div>
        ) : (
          <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-400 uppercase text-[10px] font-semibold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-5 py-3">Event ID</th>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Decision / Result</th>
                <th className="px-5 py-3">Similarity Score</th>
                <th className="px-5 py-3">Evaluator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {events.map((ev) => {
                const badge = getResultBadge(ev.verification_result);
                const Icon = badge.icon;
                return (
                  <tr key={ev.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-gray-400">
                      EVT-{ev.id.toString().padStart(6, '0')}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                      {ev.created_at ? new Date(ev.created_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium ${badge.classes}`}>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{badge.text}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-gray-800 dark:text-gray-200">
                      {ev.similarity_score ? (ev.similarity_score * 100).toFixed(1) + '%' : 'N/A'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 font-mono text-[11px]">
                      {ev.reviewed_by || 'VerificationEngine'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
