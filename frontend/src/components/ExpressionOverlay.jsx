import React from 'react';
import { Smile, Info } from 'lucide-react';
import { faceService } from '../services/faceService';

export default function ExpressionOverlay({ expression = 'Neutral', confidence = 0, isUncertain = false, emoji = null }) {
  const color = faceService.getExpressionColor(expression);
  const displayEmoji = emoji || faceService.getExpressionEmoji(expression);

  return (
    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 shadow-sm">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-sm"
        style={{ backgroundColor: `${color}25`, border: `1px solid ${color}60` }}
      >
        <span className="select-none leading-none">{displayEmoji}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate flex items-center gap-1">
            <span>{expression}</span>
            <span className="text-sm">{displayEmoji}</span>
          </span>
          <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
            {confidence}%
          </span>
        </div>

        {/* Progress Confidence Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-1 rounded-full mt-1 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${confidence}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* Scientific Limitation Tooltip Icon */}
      <div className="group relative cursor-help">
        <Info className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-400 transition-colors" />
        <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-48 p-2 rounded-lg bg-gray-900 text-white text-[10px] leading-tight shadow-xl z-50 pointer-events-none">
          Estimated visual facial expression morphology only. Does not measure internal emotional feelings.
        </div>
      </div>
    </div>
  );
}
