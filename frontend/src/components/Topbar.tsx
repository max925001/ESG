// frontend/src/components/Topbar.tsx
import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Sun, Moon, Bell, User as UserIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const Topbar: React.FC = () => {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const location = useLocation();

  // Create page title from path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard Overview';
    if (path === '/upload') return 'File Ingestion';
    if (path === '/review') return 'Review & Normalize Records';
    if (path === '/validation') return 'Data Quality Issues';
    if (path === '/raw-vs-normalized') return 'Raw vs Normalized Audit';
    if (path === '/approvals') return 'Approval Workbench';
    if (path === '/audit') return 'System Audit Trail';
    if (path === '/ai-cleaning') return 'AI-Assisted Schema Mapper';
    return 'ESG Platform';
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-opacity-80 dark:bg-opacity-80">
      {/* Title */}
      <div>
        <h1 className="font-semibold text-lg tracking-tight">{getPageTitle()}</h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Dark Mode toggle */}
        <button 
          onClick={toggleTheme}
          className="p-2 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-all"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button className="p-2 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg relative transition-all">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
        </button>

        {/* User Card */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="font-medium text-sm text-slate-850 dark:text-slate-100">
              {user ? `${user.first_name} ${user.last_name}` : 'ESG Auditor'}
            </span>
            <span className="text-xs text-slate-400 capitalize">
              {user ? user.role : 'Guest'}
            </span>
          </div>
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
            {user ? user.first_name.charAt(0) : <UserIcon className="w-4 h-4" />}
          </div>
        </div>
      </div>
    </header>
  );
};
