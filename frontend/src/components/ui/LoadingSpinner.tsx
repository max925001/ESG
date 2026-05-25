// frontend/src/components/ui/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', fullScreen = false }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  const spinner = (
    <div className={`rounded-full border-t-emerald-500 border-slate-200 dark:border-slate-800 animate-spin ${sizeClasses[size]}`} />
  );

  if (fullScreen) {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
        {spinner}
        <span className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
          Loading ESG platform...
        </span>
      </div>
    );
  }

  return spinner;
};
