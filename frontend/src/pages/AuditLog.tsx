// frontend/src/pages/AuditLog.tsx
import React, { useEffect, useState } from 'react';
import { mockAudits } from '../utils/mockData';
import { AuditLog as AuditLogType } from '../types';
import apiClient from '../lib/axios';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Clock, 
  Terminal, 
  User as UserIcon, 
  Globe, 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  Database,
  ArrowRight
} from 'lucide-react';

export const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedTable, setSelectedTable] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/api/v1/audits/');
        if (response.data && Array.isArray(response.data)) {
          setLogs(response.data);
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          setLogs(response.data.data);
        } else {
          setLogs(mockAudits);
        }
      } catch (err) {
        console.warn('API error listing audit logs, falling back to local simulation data...');
        setLogs(mockAudits);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  // Extract unique actions and tables for filter dropdowns
  const actionsList = ['ALL', ...Array.from(new Set(logs.map(log => log.action)))];
  const tablesList = ['ALL', ...Array.from(new Set(logs.map(log => log.table_name)))];

  // Filtering logic
  const filteredLogs = logs.filter(log => {
    const userString = log.user 
      ? `${log.user.first_name} ${log.user.last_name} ${log.user.email}`.toLowerCase()
      : 'system';
    const matchesSearch = 
      userString.includes(searchTerm.toLowerCase()) ||
      log.record_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    const matchesTable = selectedTable === 'ALL' || log.table_name === selectedTable;

    return matchesSearch && matchesAction && matchesTable;
  });

  const getActionColor = (action: string) => {
    if (action.includes('APPROVED')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (action.includes('REJECTED') || action.includes('FAILED')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (action.includes('UPLOAD')) return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    if (action.includes('RESOLVE')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Audit Trail Logs</h2>
        </div>
        <p className="text-sm text-slate-400">
          Immutable ledger of user actions, system events, ingestion reviews, and data alterations.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by user, action, or record ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Action Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 font-medium">Action:</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-semibold ml-1"
            >
              {actionsList.map(act => (
                <option key={act} value={act} className="bg-slate-900 text-slate-100">
                  {act}
                </option>
              ))}
            </select>
          </div>

          {/* Table Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs w-full sm:w-auto">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 font-medium">Table:</span>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-semibold ml-1"
            >
              {tablesList.map(tbl => (
                <option key={tbl} value={tbl} className="bg-slate-900 text-slate-100">
                  {tbl}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-400 font-medium">Fetching secure logs ledger...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-950 border border-slate-800 rounded-2xl text-center">
          <Terminal className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="font-bold text-slate-200 mb-1">No Audit Logs Found</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Try adjusting your search query or dropdown filter selections.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div 
                key={log.id} 
                className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all shadow-sm"
              >
                {/* Header Row */}
                <div 
                  onClick={() => toggleExpand(log.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-slate-900 rounded-xl text-slate-400 mt-0.5">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-bold text-sm text-slate-100">
                          {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System Agent'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {log.user ? `(${log.user.email})` : '(Automated Task)'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
                        <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold tracking-wider ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                          <Database className="w-3.5 h-3.5 text-slate-500" />
                          {log.table_name}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          ID: {log.record_id}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                    <div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Section */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-800 bg-slate-900/30">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                      {/* Left: Metadata & Client Footprint */}
                      <div className="lg:col-span-1 space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Client Fingerprint
                        </h4>
                        
                        <div className="space-y-3">
                          <div className="flex items-start gap-2 text-xs">
                            <Globe className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-slate-400 block font-medium">IP Address</span>
                              <span className="font-mono text-slate-200">{log.ip_address || 'N/A'}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2 text-xs">
                            <Cpu className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-slate-400 block font-medium">User Agent</span>
                              <span className="text-slate-350 leading-relaxed font-mono block max-w-xs break-all">
                                {log.user_agent || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: State Changes & Payload View */}
                      <div className="lg:col-span-2 space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Ledger Entry Details
                        </h4>

                        {/* Special Visualizer for Status Changes */}
                        {log.changes && log.changes.old_status && log.changes.new_status ? (
                          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between mb-3 text-xs">
                            <div className="flex items-center gap-4">
                              <div>
                                <span className="text-slate-500 block">Old Status</span>
                                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-semibold uppercase">
                                  {log.changes.old_status}
                                </span>
                              </div>
                              <ArrowRight className="w-4 h-4 text-emerald-500" />
                              <div>
                                <span className="text-slate-500 block">New Status</span>
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold uppercase">
                                  {log.changes.new_status}
                                </span>
                              </div>
                            </div>
                            {log.changes.comments && (
                              <div className="text-right">
                                <span className="text-slate-500 block">Comments</span>
                                <span className="text-slate-200 italic font-medium">
                                  "{log.changes.comments}"
                                </span>
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* Raw JSON View */}
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] overflow-x-auto text-emerald-400">
                          <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
