import React from 'react';

export default function StatusIndicator({ status = 'online', label = null, pulse = true }) {
  const getStyles = () => {
    switch (status?.toLowerCase()) {
      case 'online':
      case 'streaming':
      case 'registered':
      case 'success':
        return {
          dot: 'bg-emerald-500',
          ring: 'bg-emerald-400',
          text: 'text-emerald-500 dark:text-emerald-400',
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-500/10',
        };
      case 'warning':
      case 'checking':
      case 'pending':
        return {
          dot: 'bg-amber-500',
          ring: 'bg-amber-400',
          text: 'text-amber-500 dark:text-amber-400',
          border: 'border-amber-500/30',
          bg: 'bg-amber-500/10',
        };
      case 'error':
      case 'disconnected':
      case 'failed':
        return {
          dot: 'bg-red-500',
          ring: 'bg-red-400',
          text: 'text-red-500 dark:text-red-400',
          border: 'border-red-500/30',
          bg: 'bg-red-500/10',
        };
      case 'blue':
      case 'new_registered':
        return {
          dot: 'bg-blue-500',
          ring: 'bg-blue-400',
          text: 'text-blue-500 dark:text-blue-400',
          border: 'border-blue-500/30',
          bg: 'bg-blue-500/10',
        };
      default:
        return {
          dot: 'bg-gray-400',
          ring: 'bg-gray-300',
          text: 'text-gray-500 dark:text-gray-400',
          border: 'border-gray-500/30',
          bg: 'bg-gray-500/10',
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border ${styles.bg} ${styles.border} ${styles.text}`}>
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.ring}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${styles.dot}`} />
      </span>
      {label && <span>{label}</span>}
    </div>
  );
}
