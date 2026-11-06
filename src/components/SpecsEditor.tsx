import React, { useState, useRef } from 'react';
import {
  FileText,
  User,
  Zap,
  Calendar,
  AlertTriangle,
  PhoneCall,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
  Plus,
  Trash2,
  Camera,
  ExternalLink,
  Upload,
  Download,
} from 'lucide-react';
import type { OfficialMopSpecs, RectifierEntry, TappingMode } from '../types/mop';
import { ImageInputWidget } from './ImageInputWidget';
import {
  MODE_SINGLE,
  MODE_SAME_RS,
  MODE_SEPARATE_RS,
  buildOltLabel,
  buildTappingSummary,
  safeFilename,
} from '../utils/docxGenerator';

interface SpecsEditorProps {
  specs: OfficialMopSpecs;
  onChange: (updatedSpecs: OfficialMopSpecs) => void;
  onProceedToDocx: () => void;
  onReset: () => void;
  onOpenTssrViewer?: () => void;
  onOpenTssrInNewTab?: () => void;
  onReplaceTssr?: (file: File) => void;
}

export const SpecsEditor: React.FC<SpecsEditorProps> = ({
  specs,
  onChange,
  onProceedToDocx,
  onReset,
  onOpenTssrViewer,
  onOpenTssrInNewTab,
  onReplaceTssr,
}) => {
  const [activeView, setActiveView] = useState<'tapping' | 'advanced'>('tapping');
  const tssrFileInputRef = useRef<HTMLInputElement>(null);
  const [advancedTab, setAdvancedTab] = useState<'proponents' | 'schedule' | 'procedures' | 'contacts'>('proponents');
  const [rs1Expanded, setRs1Expanded] = useState<boolean>(true);
  const [rs2Expanded, setRs2Expanded] = useState<boolean>(true);

  // Ensure rs_entries has at least 2 entries initialized
  const rs_entries: RectifierEntry[] = [
    specs.rs_entries?.[0] || {
      name: specs.rectifierSystem || 'Eltek Flatpack 1',
      load: specs.fuseMain || 'F1',
      ampere: specs.fuseAmperage || '16A',
      rdnt_load: specs.fuseRedundant || 'F2',
      rdnt_ampere: specs.fuseAmperage || '16A',
    },
    specs.rs_entries?.[1] || {
      name: 'Eltek Flatpack 2',
      load: '',
      ampere: '',
      rdnt_load: '',
      rdnt_ampere: '',
    },
  ];

  const updateField = (field: keyof OfficialMopSpecs, value: any) => {
    const updated: OfficialMopSpecs = { ...specs, [field]: value };
    if (field === 'site_name' || field === 'plaid') {
      const site_name = field === 'site_name' ? value : specs.site_name;
      const plaid = field === 'plaid' ? value : specs.plaid;
      updated.siteId = plaid;
      updated.siteName = site_name;
      updated.siteLocationSystem = `${site_name}_${plaid}`;
      if (specs.format === 'ERICSSON_FTTH') {
        updated.generatedMopFileName = `MOP_POWERTAPPING_FTTH_HORIZONTAL_T7_${safeFilename(site_name)}_${safeFilename(plaid)}.docx`;
      } else {
        updated.generatedMopFileName = `MOP_${safeFilename(site_name)}_${safeFilename(plaid)}.docx`;
      }
    }
    if (field === 'target_datetime') {
      updated.targetImplementationDates = value;
    } else if (field === 'targetImplementationDates') {
      updated.target_datetime = value;
    }
    onChange(updated);
  };

  const approverRemarksImages = specs.approver_remarks_images || [];

  const handleAddRemarkImage = () => {
    updateField('approver_remarks_images', [...approverRemarksImages, '']);
  };

  const handleUpdateRemarkImage = (idx: number, dataUrl: string | undefined) => {
    const updated = [...approverRemarksImages];
    if (dataUrl) {
      updated[idx] = dataUrl;
    } else {
      updated.splice(idx, 1);
    }
    updateField('approver_remarks_images', updated);
  };

  const handleRemoveRemarkImage = (idx: number) => {
    const updated = [...approverRemarksImages];
    updated.splice(idx, 1);
    updateField('approver_remarks_images', updated);
  };

  const updateRsEntry = (index: number, partial: Partial<RectifierEntry>) => {
    const newEntries = [...rs_entries];
    newEntries[index] = { ...newEntries[index], ...partial };
    
    // Also sync back to fuseMain / fuseRedundant for MOP preview
    const updated: OfficialMopSpecs = {
      ...specs,
      rs_entries: newEntries,
    };
    if (index === 0) {
      if (partial.name !== undefined) updated.rectifierSystem = partial.name;
      if (partial.load !== undefined) updated.fuseMain = partial.load;
      if (partial.ampere !== undefined) updated.fuseAmperage = partial.ampere;
      if (specs.tapping_mode === MODE_SAME_RS && partial.rdnt_load !== undefined) {
        updated.fuseRedundant = partial.rdnt_load;
      }
    } else if (index === 1 && specs.tapping_mode === MODE_SEPARATE_RS) {
      if (partial.load !== undefined) updated.fuseRedundant = partial.load;
    }
    onChange(updated);
  };

  const handleTotalRectifiersChange = (total: 1 | 2) => {
    const updated = { ...specs, total_rectifiers: total };
    if (total === 1 && specs.tapping_mode === MODE_SEPARATE_RS) {
      updated.tapping_mode = MODE_SAME_RS;
    }
    onChange(updated);
  };

  const handleTappingModeChange = (mode: TappingMode) => {
    const updated = { ...specs, tapping_mode: mode };
    if (mode === MODE_SEPARATE_RS && specs.total_rectifiers === 1) {
      updated.total_rectifiers = 2;
    }
    onChange(updated);
  };

  // Scenario description helper
  const getScenarioDescription = (mode: TappingMode, total: number) => {
    if (total === 1) {
      if (mode === MODE_SINGLE) return { text: '1 rectifier. Single MAIN tapping point. No RS2.', type: 'info' as const };
      if (mode === MODE_SAME_RS) return { text: '1 rectifier. MAIN + RDNT from same rectifier. No RS2.', type: 'info' as const };
      return { text: 'Separate mode requires 2 rectifiers. Set total rectifiers to 2.', type: 'warning' as const };
    }
    if (mode === MODE_SINGLE) return { text: '2 rectifiers. RS1 tapped (MAIN). RS2 documented only.', type: 'info' as const };
    if (mode === MODE_SAME_RS) return { text: '2 rectifiers. RS1 MAIN+RDNT. RS2 documented only.', type: 'info' as const };
    return { text: '2 rectifiers. RS1 = MAIN. RS2 = RDNT.', type: 'info' as const };
  };

  const scenarioDesc = getScenarioDescription(specs.tapping_mode, specs.total_rectifiers);

  // Equipment replacement preview calculation
  const equipment = specs.equipment || 'Nokia Lightspan MF-2';
  const olt_label = buildOltLabel(equipment, specs.olt_label_custom);
  const parts = equipment.trim().split(/\s+/);
  const vendor = parts[0] || 'Nokia';
  const model = parts.length > 1 ? parts[parts.length - 1] : equipment;

  // Planned activity fuse lines preview
  const plannedLines = buildTappingSummary(specs.tapping_mode, rs_entries, equipment);

  // Validation
  const rs1 = rs_entries[0];
  const rs2 = rs_entries[1];
  const validationErrors: string[] = [];
  if (!specs.site_name?.trim()) validationErrors.push('Site Name is required');
  if (!specs.plaid?.trim()) validationErrors.push('Plaid / Site ID is required');
  if (!specs.equipment?.trim()) validationErrors.push('Equipment model is required');
  if (!rs1.name?.trim()) validationErrors.push('RS1 Rectifier Name is required');
  if (!rs1.load?.trim()) validationErrors.push('RS1 Load Assignment is required');
  if (specs.tapping_mode === MODE_SAME_RS && !rs1.rdnt_load?.trim()) {
    validationErrors.push('RDNT Load Assignment is required for Same Rectifier mode');
  }
  if (specs.total_rectifiers >= 2 && !rs2.name?.trim()) {
    validationErrors.push('RS2 Rectifier Name is required when 2 rectifiers on site');
  }
  if (specs.tapping_mode === MODE_SEPARATE_RS && !rs2.load?.trim()) {
    validationErrors.push('RS2 RDNT Load Assignment is required for Separate Rectifiers mode');
  }

  const isEricsson = specs.format === 'ERICSSON_FTTH';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                isEricsson
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {isEricsson ? 'Template: Ericsson / Nokia FTTH' : 'Template: ONE TSSR (Nokia OLT)'}
            </span>
            <span className="text-xs text-slate-400">·</span>
            {onOpenTssrInNewTab || onOpenTssrViewer ? (
              <div className="inline-flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={onOpenTssrInNewTab || onOpenTssrViewer}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md text-red-700 text-xs font-mono font-medium transition-colors cursor-pointer group shadow-2xs"
                  title="Click to open attached TSSR document in a new tab"
                >
                  <img src="/assets/pdf-icon.png" alt="PDF" className="w-3.5 h-3.5 object-contain" />
                  <span className="truncate max-w-[180px] sm:max-w-xs font-bold">{specs.tssrFileName}</span>
                  <span className="text-[10px] bg-red-600 text-white font-sans px-1.5 py-0.2 rounded font-bold uppercase group-hover:bg-red-700 flex items-center gap-0.5">
                    <span>New Tab</span>
                  </span>
                </button>
                {onOpenTssrViewer && (
                  <button
                    type="button"
                    onClick={onOpenTssrViewer}
                    className="text-[10px] text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer"
                    title="Preview in modal window"
                  >
                    (Preview)
                  </button>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-mono truncate max-w-xs">
                TSSR: {specs.tssrFileName}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-mono">
            {specs.site_name}_{specs.plaid}
          </h2>
          <p className="text-xs text-slate-600 font-mono">
            Output File: <span className="font-semibold text-slate-900">{specs.generatedMopFileName}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Upload Another</span>
          </button>
          <button
            type="button"
            onClick={onProceedToDocx}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center space-x-2 shadow-xs transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Compile Identical MOP</span>
          </button>
        </div>
      </div>

      {/* Main Switcher: Power Tapping Setup vs Additional Sections */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveView('tapping')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            activeView === 'tapping'
              ? 'border-slate-900 text-slate-900 bg-slate-50/70'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span>⚡ Power Tapping & Rectifier Setup (Streamlit Logic)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('advanced')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            activeView === 'advanced'
              ? 'border-slate-900 text-slate-900 bg-slate-50/70'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-slate-500" />
          <span>📋 Signatories, Schedule & Detailed Procedures</span>
        </button>
      </div>

      {/* VIEW 1: POWER TAPPING & RECTIFIER SETUP (Full Streamlit PTAPMOP functionality) */}
      {activeView === 'tapping' && (
        <div className="space-y-6">
          {/* Section: General Information */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">General Information</h3>
                <p className="text-xs text-slate-500">
                  Site metadata, equipment model, rollout engineer, and execution window.
                </p>
              </div>
              {specs.solution && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Page 1 TSSR: {specs.solution}</span>
                </div>
              )}
            </div>

            {/* Page 1 TSSR Metadata Banner if detected */}
            {(specs.solution || specs.siteAddress || specs.territory) && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-600">
                <span className="font-semibold text-slate-800">Page 1 General Info:</span>
                {specs.solution && <span>Solution: <strong className="text-slate-900">{specs.solution}</strong></span>}
                {specs.project && <span>Project: <strong className="text-slate-900">{specs.project}</strong></span>}
                {specs.territory && <span>Territory: <strong className="text-slate-900">{specs.territory}</strong></span>}
                {specs.siteAddress && <span>Address: <strong className="text-slate-900">{specs.siteAddress}</strong></span>}
                {specs.towerco && <span>TowerCo: <strong className="text-slate-900">{specs.towerco}</strong></span>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Site Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. PAGATPATCDOMISOR or CDO-707-HS"
                  value={specs.site_name}
                  onChange={(e) => updateField('site_name', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>PLAID / Site ID <span className="text-red-500">*</span></span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    Page 1 Table
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. MIN2183 or MIN2250"
                  value={specs.plaid}
                  onChange={(e) => updateField('plaid', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold focus:border-red-500 focus:ring-1 focus:ring-red-400"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Equipment / OLT Model <span className="text-red-500">*</span></span>
                  {specs.solution && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Page 1 Solution: "{specs.solution}"
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nokia Lightspan MF-2"
                  value={specs.equipment}
                  onChange={(e) => {
                    const val = e.target.value;
                    const newOltLabel = /df-?16/i.test(val) ? 'OLT DF-16M' : /fx-?4/i.test(val) ? 'OLT FX-4' : 'OLT MF-2';
                    onChange({
                      ...specs,
                      equipment: val,
                      equipmentModel: val,
                      olt_label_custom: newOltLabel,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold"
                />
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400">Quick set:</span>
                  {[
                    { label: 'Nokia Lightspan MF-2', olt: 'OLT MF-2' },
                    { label: 'Nokia Lightspan DF-16M', olt: 'OLT DF-16M' },
                    { label: 'Nokia Lightspan FX-4', olt: 'OLT FX-4' },
                  ].map(({ label, olt }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        onChange({
                          ...specs,
                          equipment: label,
                          equipmentModel: label,
                          olt_label_custom: olt,
                        });
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                        specs.equipment === label
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom OLT Label <span className="text-slate-400 font-normal">(leave blank if Nokia Lightspan MF-2)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. OLT MA5800 or OLT DF-16M"
                  value={specs.olt_label_custom}
                  onChange={(e) => updateField('olt_label_custom', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prepared By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Carlo Rabanes"
                  value={specs.prepared_by}
                  onChange={(e) => updateField('prepared_by', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Position</label>
                <input
                  type="text"
                  placeholder="e.g. OLT Rollout Engineer"
                  value={specs.position}
                  onChange={(e) => updateField('position', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Target Date and Time of Implementation <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    MOP Section 5: &lt; {specs.target_datetime ? specs.target_datetime.replace(/^[<>\s]+|[<>\s]+$/g, '') : 'None'} &gt;
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. May 19- June 19, 2026 10:00AM-6:00PM"
                  value={specs.target_datetime}
                  onChange={(e) => updateField('target_datetime', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-medium">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => updateField('target_datetime', 'May 19- June 19, 2026 10:00AM-6:00PM')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded transition-colors"
                  >
                    May 19- June 19 (10AM-6PM)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('target_datetime', 'November 9 - December 9, 2026 08:00AM-08:00PM')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded transition-colors"
                  >
                    Nov 9 - Dec 9 (8AM-8PM)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const nextMonth = new Date(now);
                      nextMonth.setDate(now.getDate() + 30);
                      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                      const str = `${monthNames[now.getMonth()]} ${now.getDate()} - ${monthNames[nextMonth.getMonth()]} ${nextMonth.getDate()}, ${nextMonth.getFullYear()} 08:00AM-06:00PM`;
                      updateField('target_datetime', str);
                    }}
                    className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded transition-colors font-medium"
                  >
                    Current 30-Day Window
                  </button>
                </div>
              </div>
            </div>

            {/* Equipment Replacement Preview Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Equipment replacement preview (Single-Pass matching):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] font-mono text-slate-600 pt-1">
                <div>• Nokia Lightspan MF-2 → <strong className="text-slate-900">{equipment}</strong></div>
                <div>• OLT MF-2 → <strong className="text-slate-900">{olt_label}</strong></div>
                <div>• Nokia OLT MF-2 → <strong className="text-slate-900">{vendor} {olt_label}</strong></div>
                <div>• Nokia / OLT MF-2 → <strong className="text-slate-900">{vendor} / {olt_label}</strong></div>
                <div>• MF-2 → <strong className="text-slate-900">{model}</strong></div>
              </div>
            </div>
          </div>

          {/* Section: Power Tapping Configuration */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Power Tapping Configuration</h3>
              <p className="text-xs text-slate-500">
                Number of rectifiers present on site and breaker tapping architecture.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Total Rectifiers */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Total Number of Rectifiers on Site
                </label>
                <div className="flex items-center space-x-3">
                  {[1, 2].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleTotalRectifiersChange(num as 1 | 2)}
                      className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                        specs.total_rectifiers === num
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {num} Rectifier{num > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tapping Point Setup */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Tapping Point Setup
                </label>
                <div className="space-y-1.5">
                  {[MODE_SINGLE, MODE_SAME_RS, MODE_SEPARATE_RS].map((mode) => (
                    <label
                      key={mode}
                      className={`flex items-center space-x-2.5 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                        specs.tapping_mode === mode
                          ? 'bg-blue-50/70 border-blue-400 text-blue-900 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tapping_mode"
                        checked={specs.tapping_mode === mode}
                        onChange={() => handleTappingModeChange(mode as TappingMode)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>{mode}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Scenario Description Banner */}
            <div
              className={`p-3 rounded-lg border text-xs flex items-center space-x-2 ${
                scenarioDesc.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {scenarioDesc.type === 'warning' ? (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{scenarioDesc.text}</span>
            </div>
          </div>

          {/* Section: RS Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Rectifier System (RS) Details & Images</h3>
                <p className="text-xs text-slate-500">
                  Load Assignment = Fuse No. (e.g. <span className="font-mono font-bold text-blue-600">F8</span>, <span className="font-mono font-bold text-blue-600">F1</span>, <span className="font-mono font-bold text-blue-600">L3</span>). Attach Load Schedule and Existing Rectifier photos.
                </p>
              </div>
            </div>

            {/* RS1 Card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div
                onClick={() => setRs1Expanded(!rs1Expanded)}
                className="p-4 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between border-b border-slate-200 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    {specs.tapping_mode === MODE_SINGLE && 'RS1 Details – Tapping Point'}
                    {specs.tapping_mode === MODE_SAME_RS && 'RS1 Details – MAIN + RDNT (Same Rectifier)'}
                    {specs.tapping_mode === MODE_SEPARATE_RS && 'RS1 Details – MAIN Tapping Point'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    [{rs1.name || 'Rectifier 1'} · Fuse {rs1.load || 'None'}]
                  </span>
                </div>
                {rs1Expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </div>

              {rs1Expanded && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: RS1 Inputs */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-100 pb-1.5">
                        RS1 Information
                      </h4>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          RS1 Rectifier Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Eltek Flatpack 1 or Vertiv NetSure"
                          value={rs1.name}
                          onChange={(e) => updateRsEntry(0, { name: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {specs.tapping_mode === MODE_SAME_RS ? 'MAIN Fuse No.' : 'RS1 Fuse No.'} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. F8 or F1"
                            value={rs1.load}
                            onChange={(e) => updateRsEntry(0, { load: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold text-blue-700"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Breaker Size
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 16A or 10A"
                            value={rs1.ampere}
                            onChange={(e) => updateRsEntry(0, { ampere: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                          />
                        </div>
                      </div>

                      {/* Same Rectifier RDNT inputs */}
                      {specs.tapping_mode === MODE_SAME_RS && (
                        <div className="pt-3 border-t border-slate-100 space-y-3">
                          <span className="text-xs font-bold text-slate-800 block">
                            RDNT Tapping Point (Same Rectifier) <span className="text-red-500">*</span>
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                RDNT Fuse No.
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. F9 or F2"
                                value={rs1.rdnt_load}
                                onChange={(e) => updateRsEntry(0, { rdnt_load: e.target.value })}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold text-blue-700"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                RDNT Breaker Size
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 16A"
                                value={rs1.rdnt_ampere}
                                onChange={(e) => updateRsEntry(0, { rdnt_ampere: e.target.value })}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: RS1 Load Schedule Image */}
                    <div>
                      <ImageInputWidget
                        label="RS1 Load Schedule Image"
                        subLabel="Replaces {{RS1 Load schedule image}} in MOP"
                        imageDataUrl={rs1.load_img_dataUrl}
                        onChange={(dataUrl) => updateRsEntry(0, { load_img_dataUrl: dataUrl })}
                      />
                    </div>
                  </div>

                  {/* RS1 Existing Rectifier Photo */}
                  <div className="pt-2 border-t border-slate-100">
                    <ImageInputWidget
                      label="RS1 Existing Rectifier Photo"
                      subLabel="Replaces {{RS1 EXISTING IMAGE}} in MOP"
                      imageDataUrl={rs1.existing_img_dataUrl}
                      onChange={(dataUrl) => updateRsEntry(0, { existing_img_dataUrl: dataUrl })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* RS2 Card (If total_rectifiers >= 2) */}
            {specs.total_rectifiers >= 2 && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                <div
                  onClick={() => setRs2Expanded(!rs2Expanded)}
                  className="p-4 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between border-b border-slate-200 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      {specs.tapping_mode === MODE_SEPARATE_RS
                        ? 'RS2 Details – RDNT Tapping Point'
                        : 'RS2 Details – On Site (Not Used for Tapping)'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      [{rs2.name || 'Rectifier 2'}]
                    </span>
                  </div>
                  {rs2Expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </div>

                {rs2Expanded && (
                  <div className="p-6 space-y-6">
                    {specs.tapping_mode !== MODE_SEPARATE_RS && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center space-x-2">
                        <Info className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          This rectifier is present on site but <strong>not used for tapping</strong>. It will be fully documented in the MOP headers and photo sections.
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: RS2 Inputs */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-100 pb-1.5">
                          RS2 Information
                        </h4>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            RS2 Rectifier Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Eltek Flatpack 2"
                            value={rs2.name}
                            onChange={(e) => updateRsEntry(1, { name: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold"
                          />
                        </div>

                        {specs.tapping_mode === MODE_SEPARATE_RS ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                RS2 RDNT Fuse No. <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. L6 or F16"
                                value={rs2.load}
                                onChange={(e) => updateRsEntry(1, { load: e.target.value })}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold text-purple-700"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Breaker Size
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 16A"
                                value={rs2.ampere}
                                onChange={(e) => updateRsEntry(1, { ampere: e.target.value })}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                            No tapping assignment for this rectifier in {specs.tapping_mode} mode.
                          </div>
                        )}
                      </div>

                      {/* Right: RS2 Load Schedule Image */}
                      <div>
                        <ImageInputWidget
                          label="RS2 Load Schedule Image"
                          subLabel="Replaces {{RS2 Load schedule image}} in MOP"
                          imageDataUrl={rs2.load_img_dataUrl}
                          onChange={(dataUrl) => updateRsEntry(1, { load_img_dataUrl: dataUrl })}
                        />
                      </div>
                    </div>

                    {/* RS2 Existing Rectifier Photo */}
                    <div className="pt-2 border-t border-slate-100">
                      <ImageInputWidget
                        label="RS2 Existing Rectifier Photo"
                        subLabel="Replaces {{RS2 EXISTING IMAGE}} in MOP"
                        imageDataUrl={rs2.existing_img_dataUrl}
                        onChange={(dataUrl) => updateRsEntry(1, { existing_img_dataUrl: dataUrl })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: TSSR Approver Remarks on Tapping Point */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900">
                    TSSR Approver Remarks (Tapping Point Section)
                  </h3>
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Tapping Point Attachment
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attach screenshot(s) of the TSSR Approver remarks, signed tapping point approval confirmation, or load validation photos. Supports multiple photos.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRemarkImage}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Photo</span>
              </button>
            </div>

            {approverRemarksImages.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  <Camera className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 mb-1">No TSSR Approver Remarks Attached Yet</h4>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto mb-3">
                  TSSR Approver remarks confirm that the rectifier and fuse assignments have been officially verified and approved for tapping. You can attach multiple photos if necessary.
                </p>
                <button
                  type="button"
                  onClick={handleAddRemarkImage}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach Approver Remarks Photo</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {approverRemarksImages.map((imgDataUrl, idx) => (
                    <div key={idx} className="relative border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-blue-600" />
                          Approver Remarks Photo #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRemarkImage(idx)}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 p-1 rounded flex items-center space-x-1 transition-colors"
                          title="Remove this photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Remove</span>
                        </button>
                      </div>
                      <ImageInputWidget
                        label={`Photo #${idx + 1} Image`}
                        subLabel="Upload file or paste screenshot from clipboard (Ctrl+V)"
                        imageDataUrl={imgDataUrl || undefined}
                        onChange={(dataUrl) => handleUpdateRemarkImage(idx, dataUrl)}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleAddRemarkImage}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Another Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 14: SUPPORTING DOCUMENTS (Attached TSSR Reference) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Section 14: Supporting Documents (Approved TSSR)
                  </h3>
                  <span className="text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                    Official Reference
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  The approved technical site survey report attached and hyperlinked in Section 14 of the generated MOP document.
                </p>
              </div>

              {onOpenTssrViewer && (
                <button
                  type="button"
                  onClick={onOpenTssrViewer}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open TSSR Viewer</span>
                </button>
              )}
            </div>

            {/* Attachment Box replicating Section 14 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-mono uppercase text-slate-500 font-bold block">
                    MOP Reference Entry:
                  </span>
                  <div className="text-xs font-semibold text-red-600 italic">
                    Approved TSSR / Technical power proposal
                  </div>
                  <div className="text-xs text-slate-700 font-bold italic">
                    Please see attached signed tssr.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onReplaceTssr && (
                    <>
                      <input
                        ref={tssrFileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            onReplaceTssr(e.target.files[0]);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => tssrFileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Replace File</span>
                      </button>
                    </>
                  )}

                  {onOpenTssrViewer && (
                    <button
                      type="button"
                      onClick={onOpenTssrViewer}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Inspect PDF</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Clickable Interactive Document Card */}
              <div
                onClick={onOpenTssrViewer}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onOpenTssrViewer?.();
                  }
                }}
                className="flex items-center space-x-3 p-3 bg-white hover:bg-red-50/40 border-2 border-dashed border-slate-300 hover:border-red-400 rounded-xl transition-all cursor-pointer group shadow-2xs"
                title="Click to open attached TSSR document"
              >
                <div className="relative shrink-0">
                  <img
                    src="/assets/pdf-icon.png"
                    alt="PDF Attachment"
                    className="w-12 h-12 object-contain drop-shadow-xs group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-bold px-1 rounded uppercase">
                    PDF
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-xs truncate group-hover:text-red-700 transition-colors">
                      {specs.tssrFileName}
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full shrink-0">
                      Approved
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 mt-1">
                    <span>Site: <strong className="text-slate-800">{specs.site_name} ({specs.plaid})</strong></span>
                    {specs.tssrFileSize && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{(specs.tssrFileSize / 1024).toFixed(0)} KB</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="text-blue-600 font-semibold group-hover:underline flex items-center gap-1">
                      Click to open & view attached document ↗
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Planned Activity Fuse Lines Live Preview (from Streamlit app) */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                📋 Planned Activity Fuse Lines Preview (Section 20):
              </span>
              <span className="text-[11px] text-slate-400">Live Auto-Generated</span>
            </div>

            <div className="space-y-1.5">
              {plannedLines.length > 0 ? (
                plannedLines.map((line, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-800/90 rounded border border-slate-700 font-mono text-xs text-emerald-300"
                  >
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 italic">
                  Enter RS load assignment above to generate fuse lines.
                </div>
              )}
            </div>
          </div>

          {/* Validation Errors Box */}
          {validationErrors.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Notice before compiling:</span>
              </div>
              <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: COMPLETE MOP SECTIONS (Proponents, Schedule, Procedures, Contacts) */}
      {activeView === 'advanced' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 flex space-x-1 overflow-x-auto pb-px">
            {[
              { id: 'proponents', label: 'Section 4: Proponents & Approvers', icon: User },
              { id: 'schedule', label: 'Section 5 & 15: Schedule & Timeline', icon: Calendar },
              { id: 'procedures', label: 'Section 19-21: Safety & Procedures', icon: AlertTriangle },
              { id: 'contacts', label: 'Section 12: Project Contacts Directory', icon: PhoneCall },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = advancedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setAdvancedTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-slate-900 text-slate-900 bg-slate-50/50 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Proponents & Approvers */}
          {advancedTab === 'proponents' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Section 4: Signatories & Approvers</h3>
                <p className="text-xs text-slate-500">
                  Engineering proponents responsible for MOP implementation and approval.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Proponents:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {specs.proponents?.map((p, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">{p.position}</span>
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => {
                          const newP = [...(specs.proponents || [])];
                          newP[idx] = { ...newP[idx], name: e.target.value };
                          updateField('proponents', newP);
                        }}
                        className="w-full px-2 py-1 text-xs font-bold bg-white border border-slate-300 rounded"
                      />
                      <span className="text-[11px] text-slate-600 block">{p.deptDiv}</span>
                    </div>
                  ))}
                </div>

                <h4 className="text-xs font-bold text-slate-700 uppercase pt-2">Approvers:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {specs.approvers?.map((a, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">{a.role}</span>
                      <input
                        type="text"
                        value={a.name}
                        onChange={(e) => {
                          const newA = [...(specs.approvers || [])];
                          newA[idx] = { ...newA[idx], name: e.target.value };
                          updateField('approvers', newA);
                        }}
                        className="w-full px-2 py-1 text-xs font-bold bg-white border border-slate-300 rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Schedule */}
          {advancedTab === 'schedule' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Section 5 & 15: Work Breakdown Schedule</h3>
                <p className="text-xs text-slate-500">
                  Target implementation window and step-by-step timeline.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="p-2 border-r border-slate-200 w-20">Start</th>
                      <th className="p-2 border-r border-slate-200 w-20">End</th>
                      <th className="p-2 border-r border-slate-200">Activity</th>
                      <th className="p-2 border-r border-slate-200 w-36">Responsible</th>
                      <th className="p-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {specs.schedule?.map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border-r border-slate-200 font-mono">{row.startTime}</td>
                        <td className="p-2 border-r border-slate-200 font-mono">{row.endTime}</td>
                        <td className="p-2 border-r border-slate-200 font-medium">{row.activity}</td>
                        <td className="p-2 border-r border-slate-200 text-slate-600">{row.responsible}</td>
                        <td className="p-2 text-slate-500">{row.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Procedures */}
          {advancedTab === 'procedures' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Section 19-21: Activity Procedures & Mitigations</h3>
                <p className="text-xs text-slate-500">Pre-activity, planned tapping procedures, and revert steps.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-900 block uppercase">19. Pre-Activity Procedures:</span>
                  <ul className="list-disc list-inside text-slate-700 space-y-1">
                    {specs.preActivityProcedures?.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-900 block uppercase">20. Planned Activity Procedures:</span>
                  <ul className="text-slate-700 space-y-1">
                    {specs.plannedProcedures?.map((p, idx) => (
                      <li key={idx} className="leading-relaxed">{p}</li>
                    ))}
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-900 block uppercase">21. Revert Back Procedures:</span>
                  <ul className="list-disc list-inside text-slate-700 space-y-1">
                    {specs.revertProcedures?.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Contacts */}
          {advancedTab === 'contacts' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Section 12: People Involved & Escalation</h3>
                <p className="text-xs text-slate-500">Implementers and Globe escalation directory.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {specs.peopleInvolved?.map((person, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <span className="font-bold text-slate-900 block">{person.name}</span>
                    <span className="text-slate-500 text-[11px] block">{person.company} · {person.role}</span>
                    <span className="font-mono text-slate-700 font-semibold block mt-1">{person.contactNumber}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <span className="text-xs text-slate-500">
          The generated document will be 100% identical to the template provided in the folder.
        </span>
        <button
          type="button"
          onClick={onProceedToDocx}
          className="px-6 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center space-x-2 shadow-xs transition-colors"
        >
          <span>Compile & Download Identical DOCX</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </button>
      </div>
    </div>
  );
};
