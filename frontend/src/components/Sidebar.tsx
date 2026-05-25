// frontend/src/components/Sidebar.tsx
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  UploadCloud, 
  FileSpreadsheet, 
  AlertTriangle, 
  GitCompare, 
  CheckSquare, 
  ShieldAlert, 
  Sparkles, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, theme } = useUIStore();

  const navigationItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['analyst', 'manager', 'admin'] },
    { name: 'File Ingestion', path: '/upload', icon: UploadCloud, roles: ['analyst', 'manager', 'admin'] },
    { name: 'Review Workspace', path: '/review', icon: FileSpreadsheet, roles: ['analyst', 'manager', 'admin'] },
    { name: 'Validation Issues', path: '/validation', icon: AlertTriangle, roles: ['analyst', 'manager', 'admin'] },
    { name: 'Audit Compare', path: '/raw-vs-normalized', icon: GitCompare, roles: ['analyst', 'manager', 'admin'] },
    { name: 'Manager Approvals', path: '/approvals', icon: CheckSquare, roles: ['manager', 'admin'] },
    { name: 'Audit Trail Logs', path: '/audit', icon: ShieldAlert, roles: ['analyst', 'manager', 'admin'] },
    { name: 'AI CSV Cleaning', path: '/ai-cleaning', icon: Sparkles, roles: ['analyst', 'manager', 'admin'] },
  ];

  const filteredItems = navigationItems.filter(item => 
    !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <motion.div 
      animate={{ width: sidebarOpen ? 260 : 72 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative flex flex-col h-screen border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex-shrink-0 select-none overflow-hidden"
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500 text-white font-bold text-lg shadow-sm">
            E
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-bold text-base tracking-wide bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent"
              >
                ESG Ingestion
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {item.name}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Collapse Trigger Button */}
      <button 
        onClick={toggleSidebar}
        className="absolute top-20 -right-3 flex items-center justify-center w-6 h-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 rounded-full hover:text-slate-800 dark:hover:text-slate-200 shadow-sm z-10"
      >
        {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <button 
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 transition-all"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Sign Out</span>}
        </button>
      </div>
    </motion.div>
  );
};
