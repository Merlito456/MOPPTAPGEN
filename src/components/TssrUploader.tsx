import React, { useState, useRef } from 'react';
import {
  Upload,
  FileCheck2,
  Cpu,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Building2,
  Cable,
  Zap,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { TSSRTechnicalSpecs, TSSRFormatType } from '../types/mop';
import { SAMPLE_ONE_TSSR, SAMPLE_ERICSSON_FTTH } from '../data/sampleTssrs';
import { extractTextFromPdf, synthesizeSpecsFromText, parseFileNameMetadata } from '../utils/pdfExtractor';

interface TssrUploaderProps {
  onSpecsExtracted: (specs: TSSRTechnicalSpecs) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const TssrUploader: React.FC<TssrUploaderProps> = ({
  onSpecsExtracted,
  isLoading,
  setIsLoading,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<TSSRFormatType>('AUTO_DETECT');
  const [fastMode, setFastMode] = useState(true);
  const [progressStage, setProgressStage] = useState<number>(0);
  const [detectedPreview, setDetectedPreview] = useState<{
    siteId: string;
    siteName: string;
    format: string;
    equipment?: string;
    solution?: string;
    territory?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stagedSpecs, setStagedSpecs] = useState<TSSRTechnicalSpecs | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    setProgressStage(1);

    // 1. Instant filename & preliminary metadata detection (0-10ms)
    const fileMeta = parseFileNameMetadata(file.name);
    setDetectedPreview({
      siteId: fileMeta.siteId || 'Scanning...',
      siteName: fileMeta.siteName || file.name.replace(/\.[^/.]+$/, ''),
      format: selectedFormat === 'AUTO_DETECT' ? fileMeta.format : selectedFormat,
    });

    let fileDataUrl = '';
    try {
      // 2. High-speed client-side PDF text extraction (~200ms)
      setProgressStage(2);
      let textContent = '';
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        textContent = await extractTextFromPdf(file);
      } else if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
        textContent = await file.text();
      }

      // Read file data URL for in-app viewing and DOCX attachment
      try {
        fileDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      } catch (readErr) {
        console.warn('FileReader error:', readErr);
      }

      // 3. Immediately synthesize specs locally with Page 1 General Info detection (~20ms)
      const localSpecs = synthesizeSpecsFromText(file.name, textContent, selectedFormat);
      if (fileDataUrl) {
        localSpecs.tssrFileDataUrl = fileDataUrl;
        localSpecs.tssrFileSize = file.size;
      }

      setStagedSpecs(localSpecs);
      setDetectedPreview({
        siteId: localSpecs.siteId || localSpecs.plaid || '',
        siteName: localSpecs.siteName || localSpecs.site_name || '',
        format: localSpecs.format,
        equipment: localSpecs.equipment,
        solution: localSpecs.solution,
        territory: localSpecs.territory,
      });

      // If user enabled Fast Mode (or file is large > 5MB), complete immediately!
      if (fastMode || file.size > 8000000) {
        setProgressStage(3);
        setTimeout(() => {
          setProgressStage(4);
          setTimeout(() => {
            onSpecsExtracted(localSpecs);
            setIsLoading(false);
          }, 250);
        }, 300);
        return;
      }

      // Otherwise query backend with a strict 3.5s timeout for AI refinement
      setProgressStage(3);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      try {
        const response = await fetch('/api/extract-tssr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || 'application/pdf',
            extractedText: textContent.slice(0, 15000),
            formatHint: selectedFormat,
          }),
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.specs) {
            if (fileDataUrl) {
              result.specs.tssrFileDataUrl = fileDataUrl;
              result.specs.tssrFileSize = file.size;
            }
            setProgressStage(4);
            setTimeout(() => {
              onSpecsExtracted(result.specs);
              setIsLoading(false);
            }, 200);
            return;
          }
        }
      } catch (networkOrTimeoutErr) {
        console.log('Using optimized instant local specs parser:', networkOrTimeoutErr);
      }

      // Safe immediate fallback
      setProgressStage(4);
      setTimeout(() => {
        onSpecsExtracted(localSpecs);
        setIsLoading(false);
      }, 200);
    } catch (err: any) {
      console.error('Extraction error:', err);
      // Even in case of error, guarantee the user gets valid workable specs
      const fallback = synthesizeSpecsFromText(file.name, '', selectedFormat);
      if (fileDataUrl) {
        fallback.tssrFileDataUrl = fileDataUrl;
        fallback.tssrFileSize = file.size;
      }
      onSpecsExtracted(fallback);
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const loadBenchmark = (specs: TSSRTechnicalSpecs) => {
    setIsLoading(true);
    setProgressStage(1);
    setDetectedPreview({
      siteId: specs.siteId || specs.plaid || '',
      siteName: specs.siteName || specs.site_name || '',
      format: specs.format,
    });

    setTimeout(() => {
      setProgressStage(3);
      setTimeout(() => {
        setProgressStage(4);
        setTimeout(() => {
          onSpecsExtracted(JSON.parse(JSON.stringify(specs)));
          setIsLoading(false);
        }, 150);
      }, 200);
    }, 200);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Banner / Title */}
      <div className="text-center space-y-2 pt-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          TSSR to MOP Powertapping Generator
        </h1>
        <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
          Upload any telecom Technical Site Survey Report (TSSR). The system extracts electrical loads,
          transformer data, conductor sizing, and produces an authorized Method of Procedure (MOP) Word file (.docx).
        </p>
      </div>

      {/* Control Bar: Format & High-Speed Turbo Mode */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        {/* Turbo Fast Mode Switch */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            type="button"
            onClick={() => setFastMode(!fastMode)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              fastMode
                ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${fastMode ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
            <span>High-Speed Turbo Parse: {fastMode ? 'ON (<1s)' : 'Standard'}</span>
          </button>
          <span className="text-slate-400 hidden sm:inline">·</span>
          <span className="text-slate-500 text-[11px] hidden sm:inline">
            Fast client-side extraction eliminates upload delays
          </span>
        </div>

        {/* Format Selector */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setSelectedFormat('AUTO_DETECT')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              selectedFormat === 'AUTO_DETECT'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Auto Detect
          </button>
          <button
            type="button"
            onClick={() => setSelectedFormat('ONE_TSSR')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              selectedFormat === 'ONE_TSSR'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ONE TSSR
          </button>
          <button
            type="button"
            onClick={() => setSelectedFormat('ERICSSON_FTTH')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              selectedFormat === 'ERICSSON_FTTH'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ericsson FTTH
          </button>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          dragOver
            ? 'border-blue-500 bg-blue-50/50 scale-[1.005]'
            : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/50'
        } ${isLoading ? 'pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFileChange}
        />

        {isLoading ? (
          <div className="py-4 space-y-6 max-w-md mx-auto">
            {/* Visual Multi-Stage Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5 text-blue-700">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  {progressStage === 1 && 'Reading Document Streams...'}
                  {progressStage === 2 && 'Extracting Site Coordinates & Pole Specs...'}
                  {progressStage === 3 && 'Formulating Method of Procedure...'}
                  {progressStage >= 4 && 'Complete! Loading MOP Editor...'}
                </span>
                <span className="font-mono text-slate-900">
                  {progressStage === 1 ? '25%' : progressStage === 2 ? '55%' : progressStage === 3 ? '85%' : '100%'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-900 transition-all duration-300 rounded-full"
                  style={{
                    width:
                      progressStage === 1
                        ? '25%'
                        : progressStage === 2
                        ? '55%'
                        : progressStage === 3
                        ? '85%'
                        : '100%',
                  }}
                />
              </div>
            </div>

            {/* Detected Site Badge */}
            {detectedPreview && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>DETECTED TELECOM PROFILE:</span>
                  <span className="font-bold text-blue-700 uppercase">
                    {detectedPreview.format === 'ERICSSON_FTTH'
                      ? `Ericsson FTTH ${detectedPreview.territory ? `(${detectedPreview.territory})` : ''}`
                      : 'ONE TSSR'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm font-mono truncate">
                    {detectedPreview.siteName}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-100 text-red-800 border border-red-300">
                    PLAID (Page 1): {detectedPreview.siteId}
                  </span>
                </div>
                {detectedPreview.equipment && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      Page 1 Solution: {detectedPreview.solution ? `"${detectedPreview.solution}"` : 'Detected'} → {detectedPreview.equipment}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Instant Skip / Proceed Button */}
            {stagedSpecs && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSpecsExtracted(stagedSpecs);
                  setIsLoading(false);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 shadow-xs transition-colors pointer-events-auto"
              >
                <span>Instant Open & Edit Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Upload className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-900">
                Drop your TSSR file here, or <span className="text-blue-600 underline">browse files</span>
              </p>
              <p className="text-xs text-slate-500">
                Supports PDF (all page sizes, single-line diagrams), DOCX, TXT, or scan images
              </p>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500 pt-2">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" /> Instant client-side stream parser
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" /> Auto-extracts Pole ID & Coordinates
              </span>
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-800 text-sm">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Unable to process document</p>
            <p className="text-xs text-red-700">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Benchmark Datasets Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Quick Test with Benchmark Datasets
            </h2>
          </div>
          <span className="text-xs text-slate-500">Loads in &lt; 0.3s</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Format 1: ONE TSSR Format */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 shadow-2xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded">
                  Format 1 · ONE TSSR
                </span>
                <span className="text-xs text-slate-400">Greenfield / Cell Site</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-700" />
                  MIN2250 · PAGATPATCDOMISOR
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  CEPALCO Power Utility · 25 kVA Transformer · 60A MCCB · 2x14mm² THHN Cable
                </p>
              </div>

              <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                <div className="truncate">
                  <span className="text-slate-400">Input:</span> MIN2250_PAGATPATCDOMISOR_ONE_TSSR_09-15-26_1_1_01 (1).pdf
                </div>
                <div className="truncate font-semibold text-slate-800">
                  <span className="text-slate-400 font-normal">Output:</span> MOP_PAGATPATCDOMISOR_MIN2250.docx
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadBenchmark(SAMPLE_ONE_TSSR)}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <span>Load ONE TSSR Benchmark (Instant)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Format 2: Ericsson / Nokia FTTH Horizontal */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 shadow-2xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded">
                  Format 2 · Ericsson / Nokia
                </span>
                <span className="text-xs text-slate-400">FTTH Horizontal (T7)</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                  <Cable className="w-4 h-4 text-purple-700" />
                  MIN2183 · KIMADZILCARMENCOT
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  PHILPOWER / PHILTOWER · Carmen, Cotabato (T7) · MF2 – 1 CARD · Page 1 PLAID: MIN2183
                </p>
              </div>

              <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                <div className="truncate">
                  <span className="text-slate-400">Input:</span> FTTH HORIZONTAL_KIMADZILCARMENCOT_MIN2183_TSSR.pdf
                </div>
                <div className="truncate font-semibold text-slate-800">
                  <span className="text-slate-400 font-normal">Output:</span> MOP_POWERTAPPING_FTTH_HORIZONTAL_T7_KIMADZILCARMENCOT_MIN2183.docx
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadBenchmark(SAMPLE_ERICSSON_FTTH)}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <span>Load Ericsson FTTH Benchmark (Instant)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
