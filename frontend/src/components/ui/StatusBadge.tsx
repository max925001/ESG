// frontend/src/components/ui/StatusBadge.tsx
import React from 'react';

interface StatusBadgeProps {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const cleanStatus = status?.toUpperCase();

  const styles = {
    APPROVED: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-250 dark:border-emerald-900/50',
    PENDING: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border-amber-250 dark:border-amber-900/50',
    REJECTED: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border-rose-250 dark:border-rose-900/50',
    DEFAULT: 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800',
  };

  const currentStyle = styles[cleanStatus as keyof typeof styles] || styles.DEFAULT;
  const label = cleanStatus === 'PENDING' ? 'Pending Review' : cleanStatus;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStyle}`}>
      {label}
    </span>
  );
};
