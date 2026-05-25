// frontend/src/components/AppShell.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useUIStore } from '../store/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export const AppShell: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  const toastIcons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-sky-500" />,
  };

  const toastStyles = {
    success: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50',
    error: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50',
    warning: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50',
    info: 'bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/50',
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Sidebar Layout */}
      <Sidebar />

      {/* Main Panel */}
      <div className="flex flex-col flex-1 h-full min-w-0">
        <Topbar />
        
        {/* Main Route Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-900">
          <Outlet />
        </main>
      </div>

      {/* Global Animated Toasts Center */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-80">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${toastStyles[toast.type]} backdrop-blur-sm`}
            >
              {toastIcons[toast.type]}
              <div className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                {toast.message}
              </div>
              <button 
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
