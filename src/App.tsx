import React, { useState } from 'react';
import { Header } from './components/Header';
import { TssrUploader } from './components/TssrUploader';
import { SpecsEditor } from './components/SpecsEditor';
import { MopDocumentPreview } from './components/MopDocumentPreview';
import { FormatComparisonModal } from './components/FormatComparisonModal';
import { TssrViewerModal } from './components/TssrViewerModal';
import { SAMPLE_ONE_TSSR, SAMPLE_ERICSSON_FTTH } from './data/sampleTssrs';
import { openTssrInNewTab } from './utils/pdfExtractor';
import type { TSSRTechnicalSpecs } from './types/mop';

export default function App() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [specs, setSpecs] = useState<TSSRTechnicalSpecs | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFormatGuideOpen, setIsFormatGuideOpen] = useState<boolean>(false);
  const [isTssrViewerOpen, setIsTssrViewerOpen] = useState<boolean>(false);

  const handleSpecsExtracted = (extractedSpecs: TSSRTechnicalSpecs) => {
    setSpecs(extractedSpecs);
    setCurrentStep(2);
  };

  const handleReset = () => {
    setSpecs(null);
    setCurrentStep(1);
  };

  const handleSelectSampleFromModal = (type: 'ONE_TSSR' | 'ERICSSON_FTTH' | 'ERICSSON_2RS') => {
    if (type === 'ONE_TSSR') {
      setSpecs(JSON.parse(JSON.stringify(SAMPLE_ONE_TSSR)));
    } else if (type === 'ERICSSON_2RS') {
      const s2 = JSON.parse(JSON.stringify(SAMPLE_ERICSSON_FTTH));
      s2.total_rectifiers = 2;
      s2.detected_2_rs = true;
      s2.tapping_mode = 'Main + RDNT – Separate Rectifiers';
      s2.rs_detection_notes = 'Detected 2 Rectifiers on site (RS1 & RS2) with Separate Rectifier tapping';
      s2.rs_entries = [
        {
          name: 'Eltek Flatpack 1',
          load: 'F16',
          ampere: '16A',
          rdnt_load: '',
          rdnt_ampere: '',
          load_images: [],
          existing_images: [],
        },
        {
          name: 'Eltek Flatpack 2',
          load: 'L6',
          ampere: '16A',
          rdnt_load: '',
          rdnt_ampere: '',
          load_images: [],
          existing_images: [],
        },
      ];
      setSpecs(s2);
    } else {
      setSpecs(JSON.parse(JSON.stringify(SAMPLE_ERICSSON_FTTH)));
    }
    setCurrentStep(2);
  };

  const handleReplaceTssr = async (file: File) => {
    try {
      let fileDataUrl = '';
      try {
        fileDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      } catch (err) {
        console.warn('FileReader error:', err);
      }

      if (specs) {
        const updated: TSSRTechnicalSpecs = {
          ...specs,
          tssrFileName: file.name,
          tssrFileDataUrl: fileDataUrl || specs.tssrFileDataUrl,
          tssrFileSize: file.size,
        };
        setSpecs(updated);
      }
    } catch (err) {
      console.error('Failed to replace TSSR:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      <Header
        currentStep={currentStep}
        onSelectStep={(step) => setCurrentStep(step)}
        hasSpecs={specs !== null}
        onOpenFormatGuide={() => setIsFormatGuideOpen(true)}
        onOpenTssrViewer={() => setIsTssrViewerOpen(true)}
        onOpenTssrInNewTab={() => specs && openTssrInNewTab(specs)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 1 && (
          <TssrUploader
            onSpecsExtracted={handleSpecsExtracted}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

        {currentStep === 2 && specs && (
          <SpecsEditor
            specs={specs}
            onChange={(updated) => setSpecs(updated)}
            onProceedToDocx={() => setCurrentStep(3)}
            onReset={handleReset}
            onOpenTssrViewer={() => setIsTssrViewerOpen(true)}
            onOpenTssrInNewTab={() => openTssrInNewTab(specs)}
            onReplaceTssr={handleReplaceTssr}
          />
        )}

        {currentStep === 3 && specs && (
          <MopDocumentPreview
            specs={specs}
            onBackToEdit={() => setCurrentStep(2)}
            onOpenTssrViewer={() => setIsTssrViewerOpen(true)}
            onOpenTssrInNewTab={() => openTssrInNewTab(specs)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">MOP Powertapping Generator</span>
            <span>·</span>
            <span>Philippine Electrical Code (PEC) & Telecom Construction Compliance</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Formats: ONE TSSR & Ericsson FTTH</span>
            <span>·</span>
            <button
              onClick={() => setIsFormatGuideOpen(true)}
              className="text-slate-600 hover:text-slate-900 underline"
            >
              Format Guide
            </button>
          </div>
        </div>
      </footer>

      <FormatComparisonModal
        isOpen={isFormatGuideOpen}
        onClose={() => setIsFormatGuideOpen(false)}
        onSelectSample={handleSelectSampleFromModal}
      />

      {specs && (
        <TssrViewerModal
          isOpen={isTssrViewerOpen}
          onClose={() => setIsTssrViewerOpen(false)}
          specs={specs}
          onReplaceTssr={handleReplaceTssr}
        />
      )}
    </div>
  );
}
