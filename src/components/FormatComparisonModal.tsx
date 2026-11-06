import React from 'react';
import { X, Building2, Cable, Check, FileCheck, Layers } from 'lucide-react';

interface FormatComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (type: 'ONE_TSSR' | 'ERICSSON_FTTH' | 'ERICSSON_2RS') => void;
}

export const FormatComparisonModal: React.FC<FormatComparisonModalProps> = ({
  isOpen,
  onClose,
  onSelectSample,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 text-base">Official MOP Templates Guide</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                100% Identical Output
              </span>
            </div>
            <p className="text-xs text-slate-500">
              The generator uses your official company .docx templates with embedded diagrams, logos, and tables.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-xs">
          {/* Format 1: ONE TSSR */}
          <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-800 bg-blue-100 px-2.5 py-1 rounded text-xs">
                Format 1 · ONE TSSR Format Template
              </span>
              <button
                onClick={() => {
                  onSelectSample('ONE_TSSR');
                  onClose();
                }}
                className="font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-1"
              >
                <span>Load ONE TSSR Template</span> →
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-700" />
                MOP_PAGATPATCDOMISOR_MIN2250.docx
              </h3>
              <p className="text-slate-600">
                Power tapping of Site Nokia OLT PAGATPATCDOMISOR System (Globe Blaine Plus Project).
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-blue-100 font-mono space-y-1 text-slate-800">
              <div><span className="text-slate-400">TSSR File:</span> MIN2250_PAGATPATCDOMISOR_ONE_TSSR_09-15-26_1_1_01 (1).pdf</div>
              <div><span className="text-slate-400">Target MOP:</span> <span className="font-bold text-slate-900">MOP_PAGATPATCDOMISOR_MIN2250.docx</span></div>
              <div><span className="text-slate-400">Equipment:</span> Nokia Lightspan MF-2 (Mini OLT)</div>
              <div><span className="text-slate-400">Rectifier & Fuse:</span> RECTIFIER 1 – ELTEK (MAIN: F1 / RDNT: F2, 16A)</div>
            </div>

            <ul className="space-y-1 text-slate-700 list-disc list-inside">
              <li><strong>Author:</strong> John Carlo Rabanes (OLT Rollout Engineer)</li>
              <li><strong>Proponents:</strong> Dhenver Santos (Technical Team Head), Edgar Peralta (OLT Supervisor)</li>
              <li><strong>Implementation:</strong> May 19 - June 19, 2026 10:00AM-6:00PM</li>
            </ul>
          </div>

          {/* Format 2: Ericsson / Nokia FTTH */}
          <div className="border border-purple-200 bg-purple-50/30 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-800 bg-purple-100 px-2.5 py-1 rounded text-xs">
                Format 2 · Ericsson / Nokia FTTH Horizontal Template
              </span>
              <button
                onClick={() => {
                  onSelectSample('ERICSSON_FTTH');
                  onClose();
                }}
                className="font-bold text-purple-700 hover:text-purple-900 underline flex items-center gap-1"
              >
                <span>Load FTTH Template</span> →
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Cable className="w-4 h-4 text-purple-700" />
                MOP_POWERTAPPING_FTTH_HORIZONTAL_T7_KIMADZILCARMENCOT_MIN2183.docx
              </h3>
              <p className="text-slate-600">
                Power tapping of Site Nokia OLT KIMADZILCARMENCOT System (Page 1 PLAID: MIN2183, Tier 7 Horizontal Rollout).
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-purple-100 font-mono space-y-1 text-slate-800">
              <div><span className="text-slate-400">TSSR File:</span> FTTH HORIZONTAL_KIMADZILCARMENCOT_MIN2183_TSSR.pdf</div>
              <div><span className="text-slate-400">Equipment:</span> Nokia Lightspan MF-2 (Page 1 Solution: "MF2 – 1 CARD")</div>
              <div><span className="text-slate-400">Rectifier & Fuse:</span> RECTIFIER 1 – ELTEK (MAIN: F16 / RDNT: F17, 16A)</div>
            </div>

            <ul className="space-y-1 text-slate-700 list-disc list-inside">
              <li><strong>Author:</strong> John Carlo Rabanes</li>
              <li><strong>Approver:</strong> Liam Walter Meflores (Department / Division Head)</li>
              <li><strong>Implementation:</strong> November 9 - December 9, 2026 08:00AM-08:00PM</li>
            </ul>
          </div>

          {/* Format 3: 2 RS (Separate Rectifiers) Configuration */}
          <div className="border border-indigo-200 bg-indigo-50/30 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-800 bg-indigo-100 px-2.5 py-1 rounded text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Special Setup · Site with 2 Rectifiers (RS1 & RS2 Separate Tapping)
              </span>
              <button
                onClick={() => {
                  onSelectSample('ERICSSON_2RS');
                  onClose();
                }}
                className="font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1"
              >
                <span>Load 2 RS Sample</span> →
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Cable className="w-4 h-4 text-indigo-700" />
                2 RS Setup: RS1 (MAIN) + RS2 (RDNT)
              </h3>
              <p className="text-slate-600">
                Demonstrates automatic 2 RS detection, dual rectifier documentation in MOP headers, and multiple photo attachments per rectifier.
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-indigo-100 font-mono space-y-1 text-slate-800">
              <div><span className="text-slate-400">Total Rectifiers:</span> 2 Rectifiers on Site (RS1 & RS2)</div>
              <div><span className="text-slate-400">Tapping Mode:</span> Main + RDNT – Separate Rectifiers</div>
              <div><span className="text-slate-400">RS1 Tapping:</span> Eltek Flatpack 1 (MAIN: F16, 16A)</div>
              <div><span className="text-slate-400">RS2 Tapping:</span> Eltek Flatpack 2 (RDNT: L6, 16A)</div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              How the Template Engine Works:
            </span>
            <p className="text-slate-600 leading-relaxed">
              When you upload a TSSR or edit fields, the engine takes the authentic DOCX template file from your folder,
              updates the Site ID, Site Name, equipment model, and dates while preserving 100% of the original table styling,
              company headers, logos, and E2E system block diagram images.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
