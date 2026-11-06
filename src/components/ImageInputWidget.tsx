import React, { useRef, useState } from 'react';
import { Upload, Clipboard, Trash2, Image as ImageIcon, Check } from 'lucide-react';

interface ImageInputWidgetProps {
  label: string;
  subLabel?: string;
  imageDataUrl?: string;
  onChange: (dataUrl: string | undefined) => void;
}

export const ImageInputWidget: React.FC<ImageInputWidgetProps> = ({
  label,
  subLabel,
  imageDataUrl,
  onChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClipboardPaste = async () => {
    try {
      if (!navigator.clipboard?.read) {
        setPasteNotice('Clipboard read not supported by browser. Press Ctrl+V directly.');
        setTimeout(() => setPasteNotice(null), 3500);
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const reader = new FileReader();
            reader.onload = (event) => {
              onChange(event.target?.result as string);
              setPasteNotice('Image pasted from clipboard!');
              setTimeout(() => setPasteNotice(null), 2500);
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      setPasteNotice('No image found in clipboard. Please copy an image first.');
      setTimeout(() => setPasteNotice(null), 3000);
    } catch (err: any) {
      console.warn('Clipboard read error:', err);
      setPasteNotice('Paste permission denied. You can press Ctrl+V inside the box.');
      setTimeout(() => setPasteNotice(null), 3000);
    }
  };

  const handleContainerPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            onChange(event.target?.result as string);
            setPasteNotice('Image pasted!');
            setTimeout(() => setPasteNotice(null), 2000);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          return;
        }
      }
    }
  };

  return (
    <div
      tabIndex={0}
      onPaste={handleContainerPaste}
      className="border border-slate-200 rounded-lg p-3 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all space-y-2.5"
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-800 block">{label}</span>
          {subLabel && <span className="text-[11px] text-slate-500 block">{subLabel}</span>}
        </div>
        {imageDataUrl && (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
            <Check className="w-3 h-3" /> Attached
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/bmp"
        className="hidden"
        onChange={handleFileChange}
      />

      {imageDataUrl ? (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center max-h-48">
            <img src={imageDataUrl} alt={label} className="object-contain max-h-44 w-auto rounded" />
          </div>
          <div className="flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded font-medium transition-colors"
            >
              Change Image
            </button>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded flex items-center space-x-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-500 mb-2">
              <ImageIcon className="w-4 h-4 text-slate-400" />
              <span>No image attached</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center space-x-1 transition-colors shadow-2xs"
              >
                <Upload className="w-3 h-3" />
                <span>Upload Image</span>
              </button>
              <button
                type="button"
                onClick={handleClipboardPaste}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded text-xs font-medium flex items-center space-x-1 transition-colors"
                title="Paste image directly from clipboard (or press Ctrl+V)"
              >
                <Clipboard className="w-3 h-3" />
                <span>Paste (Ctrl+V)</span>
              </button>
            </div>
          </div>
          {pasteNotice && (
            <p className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 text-center">
              {pasteNotice}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
