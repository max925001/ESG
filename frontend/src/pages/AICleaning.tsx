// frontend/src/pages/AICleaning.tsx
import React, { useState } from 'react';
import { 
  Sparkles, 
  FileSpreadsheet, 
  HelpCircle, 
  CheckCircle, 
  TrendingUp, 
  RefreshCw, 
  Database,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';

// In-file mock configurations to simulate cleanings on raw files
interface MappingSuggestion {
  raw_header: string;
  suggested_target: string;
  confidence: number;
  rationale: string;
}

interface FileCleaningScenario {
  filename: string;
  source_type: 'fuel' | 'electricity' | 'travel';
  confidence: number;
  mappings: MappingSuggestion[];
  cellFixes: {
    row: number;
    column: string;
    original: string;
    cleaned: string;
    rationale: string;
  }[];
}

const cleaningScenarios: FileCleaningScenario[] = [
  {
    filename: "sap_fuel_may2026.csv",
    source_type: "fuel",
    confidence: 97,
    mappings: [
      { raw_header: "Menge", suggested_target: "quantity", confidence: 99, rationale: "German term for 'Quantity'. Automatically matched based on semantic ESG vocabulary." },
      { raw_header: "Buchungsdatum", suggested_target: "record_date", confidence: 98, rationale: "Matches posting date pattern. Configured as standard record transaction date." },
      { raw_header: "Einheit", suggested_target: "unit", confidence: 96, rationale: "German term for measurement 'Unit'. Maps directly to standard unit key." },
      { raw_header: "Belegnummer", suggested_target: "invoice_number", confidence: 92, rationale: "SAP invoice number reference mapped into custom metadata payload." }
    ],
    cellFixes: [
      { row: 3, column: "Menge", original: "0", cleaned: "0.0000", rationale: "Standardized decimal precision for emissions factor scaling." },
      { row: 4, column: "Einheit", original: "gallons", cleaned: "L", rationale: "Scaled volume from US gallons to Liters using 3.78541 multiplier." }
    ]
  },
  {
    filename: "utility_electricity_q2.csv",
    source_type: "electricity",
    confidence: 94,
    mappings: [
      { raw_header: "usage_mwh", suggested_target: "quantity", confidence: 92, rationale: "Energy quantity measured in Megawatt-hours. Scale factors will apply." },
      { raw_header: "read_date", suggested_target: "record_date", confidence: 99, rationale: "Direct match for operational measurement timeline timestamp." },
      { raw_header: "bill_unit", suggested_target: "unit", confidence: 95, rationale: "Maps to electrical power unit measurements." },
      { raw_header: "account_number", suggested_target: "account_number", confidence: 89, rationale: "Mapped as account indicator inside custom payload details." }
    ],
    cellFixes: [
      { row: 1, column: "usage_mwh", original: "10.5 MWh", cleaned: "10500 kWh", rationale: "Parsed unit suffix out of string and scaled to kWh base." },
      { row: 2, column: "usage_mwh", original: "120.0 MWh", cleaned: "120000 kWh", rationale: "Parsed unit suffix out of string and scaled to kWh base." }
    ]
  },
  {
    filename: "unaligned_sap_v2.csv",
    source_type: "fuel",
    confidence: 81,
    mappings: [
      { raw_header: "QTY_VAL", suggested_target: "quantity", confidence: 87, rationale: "Abbreviated quantity code representing raw consumption volume." },
      { raw_header: "POST_DT", suggested_target: "record_date", confidence: 84, rationale: "Abbreviated posting date representing historical transaction date." },
      { raw_header: "UOM_KEY", suggested_target: "unit", confidence: 82, rationale: "Unit of Measure lookup code mapped to catalog keys." }
    ],
    cellFixes: [
      { row: 1, column: "QTY_VAL", original: "N/A", cleaned: "0.0000", rationale: "Substituted invalid string with zero and flagged a low-priority warning." },
      { row: 2, column: "UOM_KEY", original: "Ltr", cleaned: "L", rationale: "Standardized non-conforming unit shorthand code to ISO-L." }
    ]
  }
];

export const AICleaning: React.FC = () => {
  const { addToast } = useUIStore();
  const [selectedFile, setSelectedFile] = useState<string>(cleaningScenarios[0].filename);
  const [loading, setLoading] = useState<boolean>(false);
  const [scenario, setScenario] = useState<FileCleaningScenario>(cleaningScenarios[0]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const handleFileChange = (filename: string) => {
    setLoading(true);
    const found = cleaningScenarios.find(s => s.filename === filename);
    setTimeout(() => {
      if (found) {
        setScenario(found);
        setOverrides({});
      }
      setLoading(false);
    }, 600);
  };

  const handleMappingOverride = (rawHeader: string, targetField: string) => {
    setOverrides(prev => ({
      ...prev,
      [rawHeader]: targetField
    }));
    addToast(`Overriding mapping for column "${rawHeader}" to "${targetField}".`, 'info');
  };

  const commitAlignment = () => {
    addToast('AI schema mapping and cleaning configurations successfully committed!', 'success');
  };

  const getConfidenceBadgeColor = (conf: number) => {
    if (conf >= 90) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (conf >= 70) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">AI CSV Cleaning Console</h2>
        </div>
        <p className="text-sm text-slate-450 dark:text-slate-400">
          Supervise deep learning schema inferences, override field mapping projections, and review automated data cleansing repairs.
        </p>
      </div>

      {/* Selector and Readiness Header */}
      <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Select Active Ingestion Session
          </span>
          <div className="relative">
            <select
              value={selectedFile}
              onChange={(e) => handleFileChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:border-emerald-500 cursor-pointer font-semibold"
            >
              {cleaningScenarios.map(s => (
                <option key={s.filename} value={s.filename}>
                  {s.filename}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Confidence Indicator */}
        {!loading && (
          <div className="flex items-center gap-4 bg-slate-900 border border-slate-800/60 p-4 rounded-xl">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">AI Category Confidence</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-100 uppercase tracking-wide">
                  {scenario.source_type}
                </span>
                <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${getConfidenceBadgeColor(scenario.confidence)}`}>
                  {scenario.confidence}% Matches
                </span>
              </div>
            </div>
            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full" 
                style={{ width: `${scenario.confidence}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-slate-950 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-sm text-slate-400 font-medium">Running deep network schema inference...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column mappings list (Left 2 columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Target Schema Field Projections
              </h3>
              <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                <Database className="w-3.5 h-3.5" />
                Table: normalized_records
              </span>
            </div>

            <div className="space-y-4">
              {scenario.mappings.map((map) => {
                const activeTarget = overrides[map.raw_header] || map.suggested_target;
                
                return (
                  <div 
                    key={map.raw_header}
                    className="p-5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-700 transition-all"
                  >
                    {/* Column metadata details */}
                    <div className="space-y-2 max-w-md">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm bg-slate-900 border border-slate-850 px-2 py-1 rounded text-slate-100 font-bold">
                          {map.raw_header}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                          {activeTarget}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                        {map.rationale}
                      </p>

                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Confidence:</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getConfidenceBadgeColor(map.confidence)}`}>
                          {map.confidence}%
                        </span>
                      </div>
                    </div>

                    {/* Manual mapping actions dropdown */}
                    <div className="flex-shrink-0">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Override Field Mapping
                      </label>
                      <select
                        value={activeTarget}
                        onChange={(e) => handleMappingOverride(map.raw_header, e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                      >
                        <option value="quantity">quantity</option>
                        <option value="record_date">record_date</option>
                        <option value="unit">unit</option>
                        <option value="invoice_number">invoice_number</option>
                        <option value="account_number">account_number</option>
                        <option value="ticket_number">ticket_number</option>
                        <option value="IGNORE">IGNORE COLUMN</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Commit button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={commitAlignment}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                Commit Schema Alignment
              </button>
            </div>
          </div>

          {/* AI data repairs panel (Right 1 column) */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              AI Cell-Level Repairs
            </h3>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <AlertCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-350 dark:text-slate-400 leading-relaxed font-semibold">
                  Values repaired during ingestion parsing:
                </span>
              </div>

              {scenario.cellFixes.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No cell fixes needed for this schema mapping.
                </p>
              ) : (
                <div className="space-y-4">
                  {scenario.cellFixes.map((fix, idx) => (
                    <div 
                      key={idx} 
                      className="p-3.5 bg-slate-900/50 border border-slate-850 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-500">Row {fix.row}</span>
                        <span className="font-mono text-emerald-400">{fix.column}</span>
                      </div>

                      <div className="flex items-center gap-2.5 py-1 text-xs">
                        <span className="text-slate-450 line-through bg-rose-500/5 border border-rose-500/10 px-1.5 py-0.5 rounded font-mono">
                          {fix.original}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="text-emerald-400 font-semibold bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                          {fix.cleaned}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-400 italic">
                        "{fix.rationale}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
