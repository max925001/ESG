// frontend/src/components/ui/SeverityBadge.tsx
import React from 'react';

interface SeverityBadgeProps {
  severity: 'info' | 'warning' | 'error' | 'critical' | string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const cleanSeverity = severity?.toLowerCase();

  const styles = {
    info: 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/50',
    warning: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50',
    error: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border-rose-200 dark:border-rose-900/50',
    critical: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-900/50 font-bold uppercase animate-pulse',
    DEFAULT: 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800',
  };

  const currentStyle = styles[cleanSeverity as keyof typeof styles] || styles.DEFAULT;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${currentStyle}`}>
      {cleanSeverity}
    </span>
  );
};
