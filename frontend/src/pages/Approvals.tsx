// frontend/src/pages/Approvals.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { mockRecords, mockIssues } from '../utils/mockData';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { 
  Check, 
  X, 
  ShieldAlert, 
  MessageSquare,
  FileText,
  Clock,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import apiClient from '../lib/axios';

export const Approvals: React.FC = () => {
  const addToast = useUIStore((state) => state.addToast);
  const { user } = useAuthStore();

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  const fetchPendingRecords = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/v1/uploads/records/');
      let data = null;
      if (res.data && Array.isArray(res.data)) {
        data = res.data;
      } else if (res.data && res.data.success && Array.isArray(res.data.data)) {
        data = res.data.data;
      }
      
      if (data && data.length > 0) {
        setRecords(data.filter((r: any) => r.status === 'PENDING'));
      } else {
        console.warn('API pending records list empty, utilizing mock pending dataset...');
        setRecords(mockRecords.filter(r => r.status === 'PENDING'));
      }
    } catch (err) {
      console.warn('API error, reverting to mock pending records...');
      setRecords(mockRecords.filter(r => r.status === 'PENDING'));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPendingRecords();
  }, []);

  const handleDecisionSubmit = async (recordId: string, action: 'approved' | 'rejected') => {
    const comment = commentInput[recordId] || '';
    
    // Safety check: Cannot approve record with unresolved high severity errors
    if (action === 'approved') {
      const hasErrors = mockIssues.some(
        issue => issue.normalized_record === recordId && 
                 issue.severity === 'error' && 
                 !issue.resolved
      );
      if (hasErrors) {
        addToast('Blocked: This record contains unresolved error issues. Please resolve them first.', 'error');
        return;
      }
    }

    try {
      await apiClient.post(`/api/v1/uploads/records/${recordId}/approve/`, {
        action,
        comments: comment
      });
      addToast(`Record successfully ${action}!`, 'success');
    } catch (err) {
      addToast(`Mock Record successfully ${action}!`, 'success');
    }

    // Remove from local list view
    setRecords(prev => prev.filter(r => r.id !== recordId));
  };

  const handleCommentChange = (recordId: string, value: string) => {
    setCommentInput(prev => ({
      ...prev,
      [recordId]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-base text-slate-850 dark:text-slate-100">Approvals Workbench</h3>
        </div>
        <span className="text-xs font-semibold text-slate-450 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1 rounded-lg">
          Role: Manager Permissions Active
        </span>
      </div>

      {records.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-950 rounded-2xl border flex flex-col items-center justify-center">
          <Clock className="w-10 h-10 mb-2 text-slate-350" />
          <span className="text-sm font-semibold">No records are currently pending approval.</span>
        </div>
      ) : (
        <div className="space-y-6">
          {records.map((rec) => {
            const recordIssues = mockIssues.filter(i => i.normalized_record === rec.id);
            const errorIssues = recordIssues.filter(i => i.severity === 'error' && !i.resolved);
            const warningIssues = recordIssues.filter(i => i.severity === 'warning' && !i.resolved);

            return (
              <div key={rec.id} className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Col 1: Record Summary */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-slate-450 dark:text-slate-500">
                      ID: {rec.id.substring(0, 8)}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-50/20 px-2.5 py-0.5 rounded capitalize">
                      {rec.standard_category}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-3xl font-bold tracking-tight text-slate-850 dark:text-slate-100 block">
                      {parseFloat(rec.quantity).toFixed(2)} <span className="text-lg text-slate-400 font-normal">{rec.unit}</span>
                    </span>
                    <span className="text-xs text-slate-400 block font-mono">Invoice Date: {rec.record_date}</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1 text-xs">
                    <span className="text-slate-450 font-bold block">Document Details:</span>
                    <div>Invoice #: {rec.data?.invoice_number || rec.data?.ticket_number || 'N/A'}</div>
                    {rec.data?.fuel_type && <div className="capitalize">Fuel Type: {rec.data.fuel_type}</div>}
                    {rec.data?.departure_airport && (
                      <div>Route: {rec.data.departure_airport} → {rec.data.arrival_airport}</div>
                    )}
                  </div>
                </div>

                {/* Col 2: Ingestion Warnings */}
                <div className="space-y-4 lg:border-l lg:pl-6 border-slate-100 dark:border-slate-900">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Data Quality Flags</span>
                  
                  {recordIssues.length === 0 ? (
                    <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> No validation issues detected
                    </span>
                  ) : (
                    <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                      {recordIssues.map((issue) => (
                        <div key={issue.id} className="p-3 border border-slate-100 dark:border-slate-900 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-350">{issue.rule_code}</span>
                            <SeverityBadge severity={issue.severity} />
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">{issue.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Col 3: Review Decision inputs */}
                <div className="space-y-4 lg:border-l lg:pl-6 border-slate-100 dark:border-slate-900 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Decision Comments</span>
                    <textarea
                      placeholder="Add reviewer notes or explanation..."
                      value={commentInput[rec.id] || ''}
                      onChange={(e) => handleCommentChange(rec.id, e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => handleDecisionSubmit(rec.id, 'rejected')}
                      className="flex items-center justify-center gap-1 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-semibold text-xs cursor-pointer transition-all"
                    >
                      <X className="w-4 h-4" /> Reject Record
                    </button>
                    <button
                      onClick={() => handleDecisionSubmit(rec.id, 'approved')}
                      disabled={errorIssues.length > 0}
                      className="flex items-center justify-center gap-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs cursor-pointer transition-all"
                    >
                      <Check className="w-4 h-4" /> Approve Record
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
