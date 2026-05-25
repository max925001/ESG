// frontend/src/pages/ValidationIssues.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { mockIssues } from '../utils/mockData';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { 
  AlertTriangle, 
  CheckCircle, 
  Filter, 
  Search, 
  MessageSquare,
  X,
  FileText
} from 'lucide-react';
import apiClient from '../lib/axios';

export const ValidationIssues: React.FC = () => {
  const addToast = useUIStore((state) => state.addToast);
  const { user } = useAuthStore();

  const [issues, setIssues] = useState<any[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Resolution Dialog state
  const [resolveOpen, setResolveOpen] = useState(false);
  const [activeIssue, setActiveIssue] = useState<any | null>(null);
  const [resolveComment, setResolveComment] = useState('');

  const fetchIssues = async () => {
    setLoading(true);
    try {
      // In a real database we fetch from /records/ or a custom endpoint
      const res = await apiClient.get('/api/v1/uploads/records/'); // simplified mock fetch
      // Collect issues
      setIssues(mockIssues);
    } catch (err) {
      console.warn('API connection failed, falling back to mock validation issues...');
      setIssues(mockIssues);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIssue) return;

    try {
      // API call to resolve issues
      await apiClient.post(`/api/v1/uploads/records/${activeIssue.normalized_record}/resolve-issues/`, {
        comments: resolveComment
      });
      addToast('Issue resolved successfully!', 'success');
    } catch (err) {
      // Mock simulation fallback
      activeIssue.resolved = true;
      activeIssue.resolved_by_email = user?.email || 'analyst@test.esg';
      addToast('Mock Issue resolved successfully!', 'success');
    }

    setIssues([...issues]);
    setResolveOpen(false);
    setActiveIssue(null);
    setResolveComment('');
  };

  // Filters & Search
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchesSeverity = filterSeverity === 'all' || issue.severity === filterSeverity;
      const matchesSearch = searchQuery === '' || 
        issue.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
        issue.rule_code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSeverity && matchesSearch;
    });
  }, [issues, filterSeverity, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-base text-slate-850 dark:text-slate-100">Quality Issues Desk</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Severity filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Severities</option>
              <option value="warning">Warnings</option>
              <option value="error">Errors</option>
            </select>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by code or msg..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48"
            />
          </div>
        </div>
      </div>

      {/* Issues Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredIssues.map((issue) => (
          <div 
            key={issue.id} 
            className={`p-6 bg-white dark:bg-slate-950 border rounded-2xl shadow-sm flex flex-col justify-between transition-all ${
              issue.resolved 
                ? 'border-emerald-100 dark:border-emerald-950/20 opacity-70' 
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Rule: {issue.rule_code}
                </span>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={issue.severity} />
                  {issue.resolved && (
                    <span className="flex items-center gap-1 text-xs text-emerald-500 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" /> Resolved
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 block uppercase">
                  Field: <code className="text-emerald-500 dark:text-emerald-400 bg-slate-50 dark:bg-slate-900 px-1 py-0.5 rounded">{issue.field_name}</code>
                </span>
                <p className="text-sm font-medium text-slate-850 dark:text-slate-250 leading-relaxed">
                  {issue.message}
                </p>
              </div>

              {issue.metadata && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl font-mono text-[10px] text-slate-500 dark:text-slate-400 overflow-x-auto space-y-1">
                  <strong>Metadata:</strong>
                  {Object.entries(issue.metadata).map(([k, v]) => (
                    <div key={k}>{k}: {String(v)}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                ID: {issue.id.substring(0, 8)}
              </span>

              {!issue.resolved ? (
                <button
                  onClick={() => {
                    setActiveIssue(issue);
                    setResolveOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs cursor-pointer transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Resolve Issue
                </button>
              ) : (
                <span className="text-xs text-slate-400">
                  Resolved by: {issue.resolved_by_email}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Resolve Dialog Modal */}
      {resolveOpen && activeIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-xs px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-850">
              <h4 className="font-bold text-base text-slate-850 dark:text-slate-100">Resolve Data Warning</h4>
              <button 
                onClick={() => setResolveOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div className="space-y-2 text-xs text-slate-500">
                <p><strong>Rule Failure:</strong> {activeIssue.message}</p>
                <p><strong>Affected field:</strong> {activeIssue.field_name}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Resolution Comments
                </label>
                <textarea
                  required
                  placeholder="Explain why this record warning is acceptable or how it was corrected (e.g. verified meter logs)..."
                  value={resolveComment}
                  onChange={(e) => setResolveComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setResolveOpen(false)}
                  className="px-4 py-2 border border-slate-250 dark:border-slate-850 text-slate-700 dark:text-slate-350 text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-xl font-semibold cursor-pointer"
                >
                  Confirm Resolution
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
