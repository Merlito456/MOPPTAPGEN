import React from 'react';
import { Zap, FileText, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  currentStep: 1 | 2 | 3;
  onSelectStep: (step: 1 | 2 | 3) => void;
  hasSpecs: boolean;
  onOpenFormatGuide: () => void;
  onOpenTssrViewer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onSelectStep,
  hasSpecs,
  onOpenFormatGuide,
  onOpenTssrViewer,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-amber-400 shadow-xs">
              <Zap className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">MOP Powertapping Generator</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Telco & FTTH
                </span>
              </div>
              <p className="text-xs text-slate-500">Method of Procedure generator from TSSR specifications</p>
            </div>
          </div>

          {/* Workflow Stepper */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Workflow progress">
            <button
              onClick={() => onSelectStep(1)}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                currentStep === 1
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border border-current">
                1
              </span>
              <span>Upload TSSR</span>
            </button>

            <span className="text-slate-300 font-bold">›</span>

            <button
              onClick={() => hasSpecs && onSelectStep(2)}
              disabled={!hasSpecs}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                currentStep === 2
                  ? 'bg-slate-900 text-white'
                  : hasSpecs
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border border-current">
                2
              </span>
              <span>Technical Specs</span>
              {hasSpecs && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            </button>

            <span className="text-slate-300 font-bold">›</span>

            <button
              onClick={() => hasSpecs && onSelectStep(3)}
              disabled={!hasSpecs}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                currentStep === 3
                  ? 'bg-slate-900 text-white'
                  : hasSpecs
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border border-current">
                3
              </span>
              <span>MOP Docx Output</span>
            </button>
          </nav>

          {/* Action / Help & TSSR Viewer button */}
          <div className="flex items-center space-x-2">
            {hasSpecs && onOpenTssrViewer && (
              <button
                type="button"
                onClick={onOpenTssrViewer}
                className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Click to view attached TSSR document"
              >
                <img src="/assets/pdf-icon.png" alt="PDF" className="w-3.5 h-3.5 object-contain" />
                <span className="hidden sm:inline">Attached TSSR</span>
              </button>
            )}

            <button
              onClick={onOpenFormatGuide}
              className="text-xs text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 font-medium transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Format Guide</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
