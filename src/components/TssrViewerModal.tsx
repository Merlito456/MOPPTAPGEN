import React from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Building2,
  Cpu,
  Zap,
  CheckCircle2,
  Calendar,
  UserCheck,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import type { OfficialMopSpecs } from '../types/mop';

interface TssrViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  specs: OfficialMopSpecs;
  onReplaceTssr?: (file: File) => void;
}

export const TssrViewerModal: React.FC<TssrViewerModalProps> = ({
  isOpen,
  onClose,
  specs,
  onReplaceTssr,
}) => {
  const fileName = specs.tssrFileName || `${specs.plaid || specs.siteId}_${specs.site_name || specs.siteName}_TSSR.pdf`;
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Memoized blob URL for PDF/image to avoid memory leaks
  const isImageDataUrl = Boolean(specs.tssrFileDataUrl?.startsWith('data:image/'));

  const blobUrl = React.useMemo(() => {
    if (!specs.tssrFileDataUrl) return null;
    try {
      const parts = specs.tssrFileDataUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || (isImageDataUrl ? 'image/png' : 'application/pdf');
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      return URL.createObjectURL(blob);
    } catch (err) {
      console.warn('Failed to construct blob from dataUrl:', err);
      return null;
    }
  }, [specs.tssrFileDataUrl, isImageDataUrl]);

  React.useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Formatted file size string
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    } else {
      // Create a print-friendly summary window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>TSSR - ${specs.site_name} (${specs.plaid})</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
                h1 { color: #0f172a; border-bottom: 2px solid #00b0f0; padding-bottom: 8px; font-size: 18px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
                th { background-color: #f1f5f9; font-weight: bold; }
                .badge { display: inline-block; padding: 4px 8px; background: #dcfce7; color: #166534; font-weight: bold; border-radius: 4px; font-size: 12px; }
              </style>
            </head>
            <body>
              <h1>TECHNICAL SITE SURVEY REPORT (TSSR) - APPROVED POWER PROPOSAL</h1>
              <p><strong>Site:</strong> ${specs.site_name} (${specs.plaid})</p>
              <p><strong>Solution:</strong> ${specs.solution || specs.equipment}</p>
              <p><strong>Reference Document:</strong> ${fileName}</p>
              <p><span class="badge">APPROVED FOR COMMERCIAL POWER TAPPING</span></p>
              <table>
                <tr><th>Parameter</th><th>Verified Survey Specification</th></tr>
                <tr><td>Project</td><td>${specs.project || 'FTTH HORIZONTAL'}</td></tr>
                <tr><td>Scope</td><td>${specs.scope || 'NEW BUILD'}</td></tr>
                <tr><td>Solution / Equipment</td><td>${specs.equipment} (${specs.olt_label_custom})</td></tr>
                <tr><td>Territory / Region</td><td>${specs.territory || 'T7'} - ${specs.region || 'MINDANAO'}</td></tr>
                <tr><td>Site Address</td><td>${specs.siteAddress || 'Verified on survey'}</td></tr>
                <tr><td>Tower Provider</td><td>${specs.towerco || 'PHILTOWER'}</td></tr>
                <tr><td>Rectifier System</td><td>${specs.rs_entries[0]?.name || 'ELTEK Flatpack 1'}</td></tr>
                <tr><td>Allocated Breakers</td><td>Main: ${specs.rs_entries[0]?.load || 'F16'} (${specs.rs_entries[0]?.ampere || '16A'}) | RDNT: ${specs.rs_entries[0]?.rdnt_load || 'F17'} (${specs.rs_entries[0]?.rdnt_ampere || '16A'})</td></tr>
                <tr><td>Prepared / Surveyed By</td><td>${specs.prepared_by} (${specs.position})</td></tr>
                <tr><td>Target Date Window</td><td>${specs.target_datetime}</td></tr>
              </table>
              <script>window.print();</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const handleDownload = () => {
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Fallback: prompt to save text summary
      handleOpenInNewTab();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onReplaceTssr) {
      onReplaceTssr(e.target.files[0]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3 truncate">
            <img
              src="/assets/pdf-icon.png"
              alt="PDF"
              className="w-7 h-7 object-contain drop-shadow-xs shrink-0"
            />
            <div className="truncate">
              <h2 className="text-sm font-bold truncate flex items-center gap-2">
                <span className="truncate">{fileName}</span>
                <span className="text-[10px] bg-red-600 text-white font-semibold px-2 py-0.5 rounded-full uppercase shrink-0">
                  Signed TSSR
                </span>
                {specs.tssrFileSize && (
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded shrink-0 hidden sm:inline">
                    {formatFileSize(specs.tssrFileSize)}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Section 14: Approved TSSR / Technical Power Proposal Document
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleOpenInNewTab}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1 font-semibold"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">New Tab</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              title="Download TSSR"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/60">
          {/* If raw file blob is available, embed it as iframe (PDF) or img; otherwise show survey blueprint summary */}
          {blobUrl ? (
            <div className="w-full h-[65vh] rounded-xl overflow-hidden border border-slate-300 bg-white shadow-inner flex items-center justify-center">
              {isImageDataUrl ? (
                <div className="w-full h-full overflow-auto p-4 flex items-center justify-center bg-slate-100">
                  <img
                    src={blobUrl}
                    alt="TSSR Document Scan"
                    className="max-w-full max-h-full object-contain rounded shadow-md"
                  />
                </div>
              ) : (
                <iframe
                  src={`${blobUrl}#view=FitH`}
                  title="TSSR PDF Viewer"
                  className="w-full h-full border-0"
                />
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Authentic TSSR Summary Header Card */}
              <div className="bg-white border-2 border-slate-900 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-[#00B0F0] text-black font-extrabold text-xs px-4 py-2 border-b border-slate-900 flex items-center justify-between">
                  <span>14. &nbsp;&nbsp;&nbsp;&nbsp; SUPPORTING DOCUMENTS (APPROVED TSSR)</span>
                  <span className="bg-white/80 px-2 py-0.5 rounded text-[11px] font-bold">
                    Official Reference
                  </span>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center space-x-3">
                      <img
                        src="/assets/pdf-icon.png"
                        alt="PDF"
                        className="w-12 h-12 object-contain shrink-0"
                      />
                      <div>
                        <div className="font-bold text-slate-900 text-sm font-mono">{fileName}</div>
                        <div className="text-xs text-red-600 font-semibold italic">
                          Approved TSSR / Technical power proposal
                        </div>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Approved & Signed Technical Proposal</span>
                    </div>
                  </div>

                  {/* Survey Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Site & Plaid</span>
                      <strong className="text-slate-900 font-mono text-sm">{specs.site_name}</strong>
                      <span className="text-slate-600 block text-[11px]">{specs.plaid}</span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Solution / Equipment</span>
                      <strong className="text-slate-900">{specs.solution || specs.equipment}</strong>
                      <span className="text-slate-600 block text-[11px]">{specs.olt_label_custom}</span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Territory / Project</span>
                      <strong className="text-slate-900">{specs.territory || 'T7'} ({specs.region || 'MINDANAO'})</strong>
                      <span className="text-slate-600 block text-[11px]">{specs.project || 'FTTH HORIZONTAL'}</span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 sm:col-span-2">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Site Address & TowerCo</span>
                      <strong className="text-slate-900 block truncate">{specs.siteAddress || 'Site Location Survey Verified'}</strong>
                      <span className="text-slate-600 block text-[11px]">Tower Provider: {specs.towerco || 'PHILTOWER'}</span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Proposed Tapping Point</span>
                      <strong className="text-slate-900 block truncate">
                        {specs.rs_entries[0]?.name || 'ELTEK Flatpack 1'}
                      </strong>
                      <span className="text-slate-600 block text-[11px]">
                        Main: {specs.rs_entries[0]?.load || 'F16'} | RDNT: {specs.rs_entries[0]?.rdnt_load || 'F17'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Bar at Bottom of Modal */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Attached as official supporting document in Section 14 of the generated MOP document.</span>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {onReplaceTssr && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Replace PDF</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Copy</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
