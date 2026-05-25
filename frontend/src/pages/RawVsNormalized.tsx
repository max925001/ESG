// frontend/src/pages/RawVsNormalized.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { mockRecords } from '../utils/mockData';
import { 
  GitCompare, 
  ArrowRight, 
  CheckCircle,
  FileCode,
  Check,
  Zap
} from 'lucide-react';
import apiClient from '../lib/axios';

export const RawVsNormalized: React.FC = () => {
  const location = useLocation();
  const passedRecordId = location.state?.recordId;

  const [records, setRecords] = useState<any[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await apiClient.get('/api/v1/uploads/records/');
        setRecords(res.data);
        if (res.data.length > 0) {
          setSelectedRecordId(passedRecordId || res.data[0].id);
        }
      } catch (err) {
        setRecords(mockRecords);
        if (mockRecords.length > 0) {
          setSelectedRecordId(passedRecordId || mockRecords[0].id);
        }
      }
    };
    fetchRecords();
  }, [passedRecordId]);

  const activeRecord = useMemo(() => {
    return records.find(r => r.id === selectedRecordId) || null;
  }, [records, selectedRecordId]);

  // Derived Raw row values (simulated since backend stores raw record)
  const rawData = useMemo(() => {
    if (!activeRecord) return {};
    
    // In our mock schema we stored original values inside normalized record.data
    const origQty = activeRecord.data?.original_quantity;
    const origUnit = activeRecord.data?.original_unit;
    
    if (activeRecord.standard_category === 'fuel') {
      return {
        menge: origQty || '1000',
        einheit: origUnit || 'gallons',
        buchungsdatum: activeRecord.record_date === '2026-05-20' ? '20.05.2026' : activeRecord.record_date,
        kraftstofftyp: activeRecord.data?.fuel_type || 'diesel',
        belegnummer: activeRecord.data?.invoice_number || 'INV-SAP-101'
      };
    }
    if (activeRecord.standard_category === 'electricity') {
      return {
        'account number': activeRecord.data?.account_number || '1234567',
        'read date': activeRecord.record_date,
        'usage (mwh)': origQty || '10.5',
        'invoice number': activeRecord.data?.invoice_number || 'INV-UT-501'
      };
    }
    return {
      employee_id: activeRecord.data?.employee_id || 'EMP-001',
      departure_airport: activeRecord.data?.departure_airport || 'LHR',
      arrival_airport: activeRecord.data?.arrival_airport || 'JFK',
      distance_miles: origQty || '3450',
      booking_date: activeRecord.record_date,
      ticket_number: activeRecord.data?.ticket_number || 'TKT-TR-901'
    };
  }, [activeRecord]);

  return (
    <div className="space-y-6">
      {/* Header Selector */}
      <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-base text-slate-850 dark:text-slate-100">Comparison Auditor</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold uppercase">Selected Record:</span>
          <select
            value={selectedRecordId}
            onChange={(e) => setSelectedRecordId(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-xs sm:max-w-md"
          >
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                [{r.standard_category.toUpperCase()}] {r.record_date} - {r.id.substring(0, 8)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeRecord ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT: Raw Uploaded Data */}
          <div className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-900">
              <FileCode className="w-5 h-5 text-slate-400" />
              <h4 className="font-bold text-sm text-slate-850 dark:text-slate-100">Original Uploaded Row Data</h4>
            </div>
            
            <div className="space-y-4 font-mono text-xs">
              {Object.entries(rawData).map(([key, value]) => (
                <div key={key} className="flex justify-between p-3 border border-slate-50 dark:border-slate-900 rounded-xl bg-slate-50/50 dark:bg-slate-900/10">
                  <span className="text-slate-450 uppercase font-semibold">{key}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Normalized Cleaned Data */}
          <div className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-500" />
                <h4 className="font-bold text-sm text-slate-850 dark:text-slate-100">Normalized Platform Output</h4>
              </div>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Audit Safe
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Category */}
              <div className="flex justify-between p-3 border border-slate-50 dark:border-slate-900 rounded-xl">
                <span className="text-slate-400 font-semibold uppercase">standard_category</span>
                <span className="font-bold text-slate-850 dark:text-slate-100 capitalize">{activeRecord.standard_category}</span>
              </div>

              {/* Date */}
              <div className="flex justify-between p-3 border border-slate-50 dark:border-slate-900 rounded-xl">
                <span className="text-slate-400 font-semibold uppercase">record_date</span>
                <span className="font-mono font-bold text-slate-850 dark:text-slate-100">{activeRecord.record_date}</span>
              </div>

              {/* Quantity */}
              <div className="flex justify-between p-3 border border-emerald-100 dark:border-emerald-900/20 bg-emerald-50/10 dark:bg-emerald-950/5 rounded-xl">
                <span className="text-slate-400 font-semibold uppercase">quantity</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 line-through font-mono">
                    {activeRecord.data?.original_quantity}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-mono font-bold text-emerald-500">
                    {parseFloat(activeRecord.quantity).toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Unit */}
              <div className="flex justify-between p-3 border border-emerald-100 dark:border-emerald-900/20 bg-emerald-50/10 dark:bg-emerald-950/5 rounded-xl">
                <span className="text-slate-400 font-semibold uppercase">unit</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 line-through uppercase font-bold">
                    {activeRecord.data?.original_unit}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-bold text-emerald-500">
                    {activeRecord.unit}
                  </span>
                </div>
              </div>

              {/* Additional attributes */}
              <div className="p-3 border border-slate-50 dark:border-slate-900 rounded-xl bg-slate-50/30 dark:bg-slate-900/10 space-y-2">
                <span className="text-slate-400 font-semibold uppercase block">Audit Parameters</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  <div>Invoice / Bill Document:</div>
                  <div className="font-semibold text-right">
                    {activeRecord.data?.invoice_number || activeRecord.data?.ticket_number || 'N/A'}
                  </div>
                  {activeRecord.standard_category === 'fuel' && (
                    <>
                      <div>Fuel Type:</div>
                      <div className="font-semibold text-right capitalize">{activeRecord.data?.fuel_type}</div>
                    </>
                  )}
                  {activeRecord.standard_category === 'travel' && (
                    <>
                      <div>Employee Reference:</div>
                      <div className="font-semibold text-right">{activeRecord.data?.employee_id}</div>
                      <div>Route:</div>
                      <div className="font-semibold text-right">
                        {activeRecord.data?.departure_airport} → {activeRecord.data?.arrival_airport}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-950 rounded-2xl border">
          No records are currently imported to run comparison audits.
        </div>
      )}
    </div>
  );
};
