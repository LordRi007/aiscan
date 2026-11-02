import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  ShieldCheck,
  Smile,
  Activity,
  Trash2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { faceService } from '../services/faceService';

export default function PersonDetails({ personId, onBack, onDelete }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [consentStatus, setConsentStatus] = useState('consented');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getPersonDetails(personId);
        setData(res);
        setConsentStatus(res.person.consent_status);
      } catch (err) {
        console.warn('Failed to load person details:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [personId]);

  const handleUpdateConsent = async (newStatus) => {
    try {
      await api.updateConsent(personId, newStatus);
      setConsentStatus(newStatus);
    } catch (err) {
      alert(`Consent update failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-gray-400">
        Loading biometric dossier...
      </div>
    );
  }

  if (!data || !data.person) {
    return (
      <div className="p-8 text-center text-xs text-red-400">
        Person not found or record has been deleted.
      </div>
    );
  }

  const { person, sessions = [], expressions = [] } = data;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to People Directory</span>
      </button>

      {/* Main Profile Card */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Photo */}
          <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gray-900 border-2 border-indigo-500/40 shadow-xl flex-shrink-0">
            <img
              src={person.registration_image_path}
              alt={person.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* Details */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-sm font-bold text-indigo-400 bg-indigo-950/60 px-3 py-1 rounded-lg border border-indigo-800">
                {person.person_code}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Identity
              </span>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {person.name || 'Anonymous Individual'}
            </h2>

            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Enrolled: {new Date(person.registered_at).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Last Seen: {new Date(person.last_seen_at).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Consent Selector */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60 text-xs space-y-2 w-full sm:w-48">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Biometric Consent</span>
            <select
              value={consentStatus}
              onChange={(e) => handleUpdateConsent(e.target.value)}
              className="w-full text-xs rounded-lg p-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white focus:outline-none"
            >
              <option value="consented">Consented (Active)</option>
              <option value="exempt">Exempt (Audit Only)</option>
              <option value="revoked">Revoked (Hold)</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recognition Sessions */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            Recent Recognition Sessions ({sessions.length})
          </h3>

          {sessions.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No additional sessions logged yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/40 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                      {s.recognition_status.replace('_', ' ')}
                    </span>
                    <p className="text-[10px] text-gray-400">{new Date(s.matched_at).toLocaleString()}</p>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">
                    {Math.round((s.confidence || 1.0) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expression Observations */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
            <Smile className="w-4 h-4 text-emerald-500" />
            Tentative Mood Observations ({expressions.length})
          </h3>

          {expressions.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No expression observations recorded.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {expressions.map((e) => {
                const color = faceService.getExpressionColor(e.category);
                return (
                  <div
                    key={e.id}
                    className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/40 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{e.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-gray-400">{e.confidence}%</span>
                      <p className="text-[10px] text-gray-500">{new Date(e.observed_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
