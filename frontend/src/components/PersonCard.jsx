import React from 'react';
import { User, Calendar, Clock, Smile, Trash2, Eye, ShieldCheck } from 'lucide-react';
import { faceService } from '../services/faceService';

export default function PersonCard({ person, onView, onDelete }) {
  const exprColor = faceService.getExpressionColor(person.latest_expression);

  return (
    <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
      <div>
        {/* Top Header: Code and Verification Badge */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
            {person.person_code}
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
            <ShieldCheck className="w-3 h-3" />
            Verified
          </span>
        </div>

        {/* Thumbnail and Name */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-center">
            {person.registration_image_path ? (
              <img
                src={person.registration_image_path}
                alt={person.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <User className="w-6 h-6 text-gray-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {person.name || 'Anonymous Individual'}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: exprColor }}
              />
              <span>{person.latest_expression || 'Neutral'}</span>
            </div>
          </div>
        </div>

        {/* Timestamp Meta */}
        <div className="space-y-1.5 text-[11px] text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              Registered:
            </span>
            <span>{person.registered_at ? new Date(person.registered_at).toLocaleDateString() : 'N/A'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              Last Seen:
            </span>
            <span>{person.last_seen_at ? new Date(person.last_seen_at).toLocaleTimeString() : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => onView(person.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Profile</span>
        </button>

        <button
          onClick={() => onDelete(person.id, person.person_code)}
          className="p-1.5 rounded-xl text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          title="Delete Biometric Profile"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
