import React, { useState } from 'react';
import {
  Download,
  Printer,
  Copy,
  Check,
  Edit3,
  FileText,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import type { OfficialMopSpecs } from '../types/mop';
import { generateMopDocxBlob, buildTappingSummary, buildOltLabel } from '../utils/docxGenerator';

interface MopDocumentPreviewProps {
  specs: OfficialMopSpecs;
  onBackToEdit: () => void;
  onOpenTssrViewer?: () => void;
}

export const MopDocumentPreview: React.FC<MopDocumentPreviewProps> = ({
  specs,
  onBackToEdit,
  onOpenTssrViewer,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const isEricsson = specs.format === 'ERICSSON_FTTH';
  const targetFileName = specs.generatedMopFileName;

  const siteName = specs.site_name || specs.siteName || 'SITE';
  const plaid = specs.plaid || specs.siteId || 'PLAID';
  const equipment = specs.equipment || specs.equipmentModel || 'Nokia Lightspan MF-2';
  const author = specs.prepared_by || specs.author || 'John Carlo Rabanes';
  const targetDatetime = specs.target_datetime || specs.targetImplementationDates || 'May 19- June 19, 2026';
  const oltLabel = buildOltLabel(equipment, specs.olt_label_custom);

  const rs1 = specs.rs_entries?.[0] || {
    name: specs.rectifierSystem || 'Eltek Flatpack 1',
    load: specs.fuseMain || 'F1',
    ampere: specs.fuseAmperage || '16A',
    rdnt_load: specs.fuseRedundant || 'F2',
    rdnt_ampere: specs.fuseAmperage || '16A',
  };
  const rs2 = specs.rs_entries?.[1];

  const tappingLines = buildTappingSummary(specs.tapping_mode, specs.rs_entries || [rs1], equipment);

  const handleDownloadDocx = async () => {
    try {
      setIsGenerating(true);
      const blob = await generateMopDocxBlob(specs);
      saveAs(blob, targetFileName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to generate docx:', err);
      alert('An error occurred while compiling the DOCX file.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySummary = () => {
    const summary = `
=============================================================
METHOD OF PROCEDURE (MOP): POWER TAPPING
Target Document: ${targetFileName}
TSSR Reference: ${specs.tssrFileName}
Author: ${author} (${specs.position || 'OLT Rollout Engineer'})
Site & System: ${siteName}_${plaid} (${oltLabel})
Equipment: ${equipment}
Tapping Mode: ${specs.tapping_mode}
Fuses: ${tappingLines.join(' | ')}
Implementation Window: ${targetDatetime}
=============================================================
`.trim();

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner Toolbar */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              100% Identical Official Template Formatted
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-mono text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400 shrink-0" />
            {targetFileName}
          </h2>
          <p className="text-xs text-slate-300">
            Based on template:{' '}
            <span className="font-semibold text-amber-200">
              {isEricsson ? 'FTTH Horizontal MOP Template' : 'ONE TSSR MOP Template'}
            </span>
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {onOpenTssrViewer && (
            <button
              type="button"
              onClick={onOpenTssrViewer}
              className="px-3.5 py-2 text-xs font-semibold text-red-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-red-900/50 hover:border-red-700 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              title="Open and view the attached TSSR document"
            >
              <img src="/assets/pdf-icon.png" alt="PDF" className="w-3.5 h-3.5 object-contain" />
              <span>View Attached TSSR</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToEdit}
            className="px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center space-x-1.5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Parameters</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center space-x-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:flex px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg items-center space-x-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print MOP</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadDocx}
            disabled={isGenerating}
            className="px-5 py-2.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center space-x-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Generating Identical .DOCX...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Identical .DOCX</span>
              </>
            )}
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>"{targetFileName}" compiled and downloaded successfully using the exact official template!</span>
        </div>
      )}

      {/* Official MOP Document Layout Preview */}
      <div className="bg-white border border-slate-300 shadow-md rounded-lg p-8 sm:p-12 text-slate-800 font-sans print:shadow-none print:p-0 print:border-none space-y-6 text-xs">
        {/* Table 1: MOP HISTORY */}
        <div>
          <h2 className="font-bold text-slate-900 text-sm mb-1 uppercase tracking-wide">MOP HISTORY</h2>
          <table className="w-full border border-slate-300 border-collapse text-left">
            <thead className="bg-slate-100 font-bold">
              <tr>
                <th className="p-2 border border-slate-300">MOST RECENT VERSION</th>
                <th className="p-2 border border-slate-300">REVISION DETAIL/S</th>
                <th className="p-2 border border-slate-300">AUTHOR</th>
                <th className="p-2 border border-slate-300">APPROVED BY</th>
                <th className="p-2 border border-slate-300">DATE APPROVED</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-slate-300 font-bold">{specs.mopVersion || '1.0'}</td>
                <td className="p-2 border border-slate-300">{specs.revisionDetail || '1st DRAFT'}</td>
                <td className="p-2 border border-slate-300 font-bold">{author}</td>
                <td className="p-2 border border-slate-300">{specs.approvedBy || 'Dhenver Santos'}</td>
                <td className="p-2 border border-slate-300">{specs.dateApproved || new Date().toISOString().split('T')[0]}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 1: DESCRIPTION */}
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900 text-xs uppercase">1. DESCRIPTION</h3>
          <p className="p-2.5 bg-slate-50 border border-slate-200 rounded font-medium text-slate-900">
            Power tapping of Site Nokia OLT {siteName} System
          </p>
        </div>

        {/* Section 2: PURPOSE AND SCOPE */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-900 text-xs uppercase">2. PURPOSE AND SCOPE</h3>
          <div className="space-y-1.5 pl-2">
            <p><strong>PURPOSE:</strong> To power on {siteName}(mini OLT) for B2B as a pre-requisite of Site deployment.</p>
            <p><strong>SCOPE:</strong> {equipment} (Mini OLT power tapping of DC +48Vdc breakers/panels.</p>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-[11px] space-y-1">
              <div>
                <strong>PROPOSED RECTIFIER SYSTEM LOAD BREAKER FUSE:</strong> ({rs1.name} / MAIN: {rs1.load}
                {rs1.rdnt_load ? ` / RDNT: ${rs1.rdnt_load}` : ''})
              </div>
              {tappingLines.map((line, idx) => (
                <div key={idx}>• {line}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: BACKGROUND */}
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900 text-xs uppercase">3. BACKGROUND</h3>
          <p className="text-slate-700 pl-2">
            {specs.projectName ||
              `Blaine Plus Project for additional OLT GPON/VOICE deployment of ${equipment} equipment for the Globe Project`}
          </p>
        </div>

        {/* Section 4: PROPONENT */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-900 text-xs uppercase">4. PROPONENT</h3>
          <table className="w-full border border-slate-300 border-collapse text-left">
            <thead className="bg-slate-100 font-bold">
              <tr>
                <th className="p-2 border border-slate-300">Name</th>
                <th className="p-2 border border-slate-300">Position</th>
                <th className="p-2 border border-slate-300">Dept./Div.</th>
                <th className="p-2 border border-slate-300 w-28">Signature</th>
                <th className="p-2 border border-slate-300 w-24">Date</th>
              </tr>
            </thead>
            <tbody>
              {(specs.proponents || [
                { name: author, position: specs.position || 'OLT Rollout Engineer', deptDiv: `Nokia / ${oltLabel}` },
                { name: 'Edgar Peralta', position: 'OLT Supervisor', deptDiv: `Nokia / ${oltLabel}` },
                { name: 'Dhenver Santos', position: 'Technical Team Head', deptDiv: `Nokia / ${oltLabel}` },
              ]).map((p, idx) => (
                <tr key={idx}>
                  <td className="p-2 border border-slate-300 font-semibold">{p.name}</td>
                  <td className="p-2 border border-slate-300">{p.position}</td>
                  <td className="p-2 border border-slate-300">{p.deptDiv}</td>
                  <td className="p-2 border border-slate-300 text-slate-400">Signed</td>
                  <td className="p-2 border border-slate-300 text-slate-500">2026</td>
                </tr>
              ))}
              {(specs.approvers || [
                { name: 'Kristy Mae Dela Torre', role: 'Minor – Section Head Approval' },
                { name: 'Butch Doble', role: 'Major / Critical – Department / Division Head' },
              ]).map((a, idx) => (
                <tr key={`app-${idx}`}>
                  <td className="p-2 border border-slate-300 font-semibold">{a.name}</td>
                  <td className="p-2 border border-slate-300">{a.role}</td>
                  <td className="p-2 border border-slate-300">Globe Engineering</td>
                  <td className="p-2 border border-slate-300 text-slate-400">Approved</td>
                  <td className="p-2 border border-slate-300 text-slate-500">2026</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 5: Target Date and Time */}
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900 text-xs uppercase">5. Target Date and Time of Implementation:</h3>
          <p className="p-2.5 bg-sky-50 border border-sky-200 rounded font-bold text-sky-950 font-mono">
            &lt; {targetDatetime.replace(/^[<>\s]+|[<>\s]+$/g, '')} &gt;
          </p>
        </div>

        {/* Section 8: SITE AND E2E SYSTEM AFFECTED */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-900 text-xs uppercase">8. SITE AND E2E SYSTEM AFFECTED</h3>
          <table className="w-full border border-slate-300 border-collapse text-left">
            <thead className="bg-slate-100 font-bold">
              <tr>
                <th className="p-2 border border-slate-300 w-1/2">Site (Location)</th>
                <th className="p-2 border border-slate-300 w-1/2">System (E2E)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-slate-300 font-bold font-mono text-blue-800">{siteName}_{plaid}</td>
                <td className="p-2 border border-slate-300 font-bold">{oltLabel}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ATTACHED RECTIFIER PHOTOS IN MOP */}
        <div className="space-y-3 pt-2">
          <h3 className="font-bold text-slate-900 text-xs uppercase">ATTACHED RECTIFIER LOAD & SITE PHOTOS IN MOP</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* RS1 Load */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1.5">
              <span className="font-bold text-slate-800 text-[11px] block">RS1 Load Schedule Image</span>
              {rs1.load_img_dataUrl ? (
                <img
                  src={rs1.load_img_dataUrl}
                  alt="RS1 Load Schedule"
                  className="w-full h-36 object-contain rounded border border-slate-300 bg-white"
                />
              ) : (
                <div className="h-28 border border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-400 text-[11px]">
                  <ImageIcon className="w-5 h-5 mb-1" />
                  <span>No load schedule attached</span>
                </div>
              )}
            </div>

            {/* RS1 Existing */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1.5">
              <span className="font-bold text-slate-800 text-[11px] block">RS1 Existing Rectifier Photo</span>
              {rs1.existing_img_dataUrl ? (
                <img
                  src={rs1.existing_img_dataUrl}
                  alt="RS1 Existing Rectifier"
                  className="w-full h-36 object-contain rounded border border-slate-300 bg-white"
                />
              ) : (
                <div className="h-28 border border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-400 text-[11px]">
                  <ImageIcon className="w-5 h-5 mb-1" />
                  <span>No rectifier photo attached</span>
                </div>
              )}
            </div>

            {/* RS2 Photos if 2 rectifiers */}
            {specs.total_rectifiers >= 2 && rs2 && (
              <>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1.5">
                  <span className="font-bold text-slate-800 text-[11px] block">RS2 Load Schedule Image</span>
                  {rs2.load_img_dataUrl ? (
                    <img
                      src={rs2.load_img_dataUrl}
                      alt="RS2 Load Schedule"
                      className="w-full h-36 object-contain rounded border border-slate-300 bg-white"
                    />
                  ) : (
                    <div className="h-28 border border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-400 text-[11px]">
                      <ImageIcon className="w-5 h-5 mb-1" />
                      <span>No RS2 load schedule attached</span>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1.5">
                  <span className="font-bold text-slate-800 text-[11px] block">RS2 Existing Rectifier Photo</span>
                  {rs2.existing_img_dataUrl ? (
                    <img
                      src={rs2.existing_img_dataUrl}
                      alt="RS2 Existing Rectifier"
                      className="w-full h-36 object-contain rounded border border-slate-300 bg-white"
                    />
                  ) : (
                    <div className="h-28 border border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-400 text-[11px]">
                      <ImageIcon className="w-5 h-5 mb-1" />
                      <span>No RS2 photo attached</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* TSSR APPROVER REMARKS ATTACHMENTS (Tapping Point Section) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              TSSR APPROVER REMARKS & TAPPING APPROVAL (TAPPING POINT SECTION)
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              {specs.approver_remarks_images && specs.approver_remarks_images.filter(Boolean).length > 0
                ? `${specs.approver_remarks_images.filter(Boolean).length} photo(s) attached`
                : 'None attached (optional)'}
            </span>
          </div>

          {specs.approver_remarks_images && specs.approver_remarks_images.filter(Boolean).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {specs.approver_remarks_images.filter(Boolean).map((imgUrl, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1.5">
                  <span className="font-bold text-slate-800 text-[11px] block">
                    TSSR Approver Remark Photo #{idx + 1}
                  </span>
                  <img
                    src={imgUrl}
                    alt={`TSSR Approver Remark ${idx + 1}`}
                    className="w-full h-40 object-contain rounded border border-slate-300 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 italic block text-center">
                    TSSR Approver Remarks / Tapping Point Approval Confirmation (Photo {idx + 1})
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-500 text-xs text-center">
              No TSSR Approver remarks photos attached. You can attach photos in Edit Parameters.
            </div>
          )}
        </div>

        {/* Section 14: SUPPORTING DOCUMENTS (Approved TSSR) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-2">
              <span>14. SUPPORTING DOCUMENTS</span>
              <span className="text-[10px] bg-red-50 text-red-700 font-semibold px-2 py-0.5 rounded border border-red-200 normal-case">
                Clickable Attachment
              </span>
            </h3>
            {onOpenTssrViewer && (
              <button
                type="button"
                onClick={onOpenTssrViewer}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold underline flex items-center gap-1 cursor-pointer"
              >
                Open document viewer ↗
              </button>
            )}
          </div>

          <table className="w-full border border-slate-300 border-collapse text-left text-xs">
            <thead className="bg-[#FFFF00] font-bold text-black">
              <tr>
                <th className="p-2 border border-slate-300 w-1/3 italic font-serif">Reference Number</th>
                <th className="p-2 border border-slate-300 w-2/3 italic font-serif text-center">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-slate-300 align-top bg-slate-50/50">
                  <span className="text-red-600 italic font-semibold block text-xs">
                    Approved TSSR / Technical power proposal
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Verified site technical proposal & power allocation
                  </span>
                </td>
                <td className="p-3 border border-slate-300 align-top bg-white">
                  <div className="italic font-bold text-slate-900 mb-2.5">
                    Please see attached signed tssr.
                  </div>

                  {/* Interactive Clickable TSSR Attachment Box */}
                  <div
                    onClick={onOpenTssrViewer}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onOpenTssrViewer?.();
                      }
                    }}
                    className="inline-flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-50 hover:bg-red-50/60 border-2 border-dashed border-slate-300 hover:border-red-400 rounded-xl transition-all cursor-pointer group shadow-2xs w-full max-w-xl text-left"
                    title="Click to open attached signed TSSR"
                  >
                    <div className="relative shrink-0">
                      <img
                        src="/assets/pdf-icon.png"
                        alt="PDF Attachment"
                        className="w-11 h-11 object-contain drop-shadow-xs group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-bold px-1 rounded uppercase">
                        PDF
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-bold text-slate-900 text-xs truncate group-hover:text-red-700 transition-colors">
                        {specs.tssrFileName}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          Signed & Approved TSSR
                        </span>
                        {specs.tssrFileSize && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-slate-600">
                              {(specs.tssrFileSize / 1024).toFixed(0)} KB
                            </span>
                          </>
                        )}
                        <span>·</span>
                        <span className="text-blue-600 group-hover:text-blue-800 font-bold underline flex items-center gap-0.5">
                          Click to open & view
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 20: PLANNED ACTIVITY PROCEDURES */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-900 text-xs uppercase">20. PLANNED ACTIVITY PROCEDURES</h3>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1 text-slate-700 leading-relaxed font-mono text-[11px]">
            {tappingLines.map((line, idx) => (
              <p key={idx} className="font-bold text-slate-900">• {line}</p>
            ))}
            <p className="pt-1 text-slate-600 font-sans text-xs">
              Make sure power tapping of the breaker is for the terminals of the equipment. Also the breaker should be switched off prior to the tapping of cable/s.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
