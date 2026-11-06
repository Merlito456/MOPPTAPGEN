import React, { useRef, useState } from 'react';
import {
  Upload,
  Clipboard,
  Trash2,
  Image as ImageIcon,
  Check,
  Plus,
  Maximize2,
  X,
  Layers,
} from 'lucide-react';

interface ImageInputWidgetProps {
  label: string;
  subLabel?: string;
  imageDataUrl?: string; // Legacy single photo
  images?: string[]; // Array of photos (multiple photo support)
  onChange?: (dataUrl: string | undefined) => void; // Legacy single callback
  onChangeImages?: (images: string[]) => void; // Multi photo callback
  allowMultiple?: boolean;
}

export const ImageInputWidget: React.FC<ImageInputWidgetProps> = ({
  label,
  subLabel,
  imageDataUrl,
  images,
  onChange,
  onChangeImages,
  allowMultiple = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendFileInputRef = useRef<HTMLInputElement>(null);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [previewModalImg, setPreviewModalImg] = useState<{ url: string; index: number } | null>(null);

  // Normalize image list
  let currentImages: string[] = [];
  if (Array.isArray(images) && images.length > 0) {
    currentImages = images.filter(Boolean);
  } else if (imageDataUrl && imageDataUrl.trim()) {
    currentImages = [imageDataUrl.trim()];
  }

  const triggerChange = (newImages: string[]) => {
    if (onChangeImages) {
      onChangeImages(newImages);
    }
    if (onChange) {
      onChange(newImages[0] || undefined);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isAppend = false) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const readers = files.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve((event.target?.result as string) || '');
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then((newUrls) => {
      const valid = newUrls.filter(Boolean);
      if (valid.length === 0) return;

      if (!allowMultiple) {
        triggerChange([valid[0]]);
      } else if (isAppend) {
        triggerChange([...currentImages, ...valid]);
      } else {
        triggerChange(valid);
      }
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    });
  };

  const handlePasteBlob = (blob: Blob) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        if (!allowMultiple || currentImages.length === 0) {
          triggerChange([dataUrl]);
        } else {
          triggerChange([...currentImages, dataUrl]);
        }
        setPasteNotice('Image pasted from clipboard!');
        setTimeout(() => setPasteNotice(null), 2500);
      }
    };
    reader.readAsDataURL(blob);
  };

  const handleClipboardPaste = async () => {
    try {
      if (!navigator.clipboard?.read) {
        setPasteNotice('Clipboard API not available. Press Ctrl+V directly.');
        setTimeout(() => setPasteNotice(null), 3500);
        return;
      }
      const items = await navigator.clipboard.read();
      let found = false;
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            handlePasteBlob(blob);
            found = true;
            return;
          }
        }
      }
      if (!found) {
        setPasteNotice('No image in clipboard. Copy or take a screenshot first.');
        setTimeout(() => setPasteNotice(null), 3000);
      }
    } catch (err: any) {
      console.warn('Clipboard read error:', err);
      setPasteNotice('Paste permission denied. Press Ctrl+V inside the box.');
      setTimeout(() => setPasteNotice(null), 3000);
    }
  };

  const handleContainerPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          handlePasteBlob(file);
          e.preventDefault();
          return;
        }
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const next = currentImages.filter((_, idx) => idx !== indexToRemove);
    triggerChange(next);
  };

  const hasPhotos = currentImages.length > 0;

  return (
    <div
      tabIndex={0}
      onPaste={handleContainerPaste}
      className="border border-slate-200 rounded-xl p-3.5 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all space-y-3"
    >
      {/* Header Info */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 block">{label}</span>
            {allowMultiple && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium flex items-center gap-1">
                <Layers className="w-2.5 h-2.5" /> Multiple OK
              </span>
            )}
          </div>
          {subLabel && <span className="text-[11px] text-slate-500 block mt-0.5">{subLabel}</span>}
        </div>

        {hasPhotos && (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
            <Check className="w-3 h-3 text-emerald-600" />
            <span>
              {currentImages.length} Photo{currentImages.length > 1 ? 's' : ''}
            </span>
          </span>
        )}
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={allowMultiple}
        accept="image/png,image/jpeg,image/jpg,image/webp,image/bmp"
        className="hidden"
        onChange={(e) => handleFileChange(e, false)}
      />
      <input
        ref={appendFileInputRef}
        type="file"
        multiple={allowMultiple}
        accept="image/png,image/jpeg,image/jpg,image/webp,image/bmp"
        className="hidden"
        onChange={(e) => handleFileChange(e, true)}
      />

      {/* When Photos Exist: Gallery Grid */}
      {hasPhotos ? (
        <div className="space-y-3">
          <div
            className={`grid gap-2.5 ${
              currentImages.length === 1
                ? 'grid-cols-1'
                : currentImages.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-2 sm:grid-cols-3'
            }`}
          >
            {currentImages.map((imgUrl, idx) => (
              <div
                key={idx}
                className="group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                {/* Photo Header Tag */}
                <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1">
                  <span className="text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                  {idx === 0 && currentImages.length > 1 && (
                    <span className="text-[9px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                </div>

                {/* Photo Action Buttons */}
                <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setPreviewModalImg({ url: imgUrl, index: idx })}
                    className="p-1 bg-white/90 hover:bg-white text-slate-700 rounded shadow-xs transition-colors cursor-pointer"
                    title="View full resolution"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="p-1 bg-red-600 hover:bg-red-700 text-white rounded shadow-xs transition-colors cursor-pointer"
                    title="Delete this photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Thumbnail Image */}
                <div
                  onClick={() => setPreviewModalImg({ url: imgUrl, index: idx })}
                  className="cursor-pointer flex items-center justify-center p-1.5 bg-slate-100/60 min-h-[110px] max-h-[140px]"
                >
                  <img
                    src={imgUrl}
                    alt={`${label} ${idx + 1}`}
                    className="object-contain max-h-[130px] w-auto rounded transition-transform group-hover:scale-[1.02]"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">
              Paste directly from clipboard (Ctrl+V) or click Add Photo
            </span>

            <div className="flex items-center space-x-2">
              {allowMultiple && (
                <button
                  type="button"
                  onClick={() => appendFileInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Add Photo</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleClipboardPaste}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-md flex items-center space-x-1 transition-colors cursor-pointer"
                title="Paste another image from clipboard"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste (Ctrl+V)</span>
              </button>

              <button
                type="button"
                onClick={() => triggerChange([])}
                className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md flex items-center space-x-1 transition-colors cursor-pointer"
                title="Remove all photos"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State Dropzone */
        <div className="space-y-2">
          <div className="border border-dashed border-slate-300 rounded-lg p-3.5 text-center bg-slate-50/60 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-500 mb-2">
              <ImageIcon className="w-4 h-4 text-slate-400" />
              <span>No image attached yet (Supports multiple photos)</span>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo{allowMultiple ? 's' : ''}</span>
              </button>
              <button
                type="button"
                onClick={handleClipboardPaste}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Paste image directly from clipboard (or press Ctrl+V)"
              >
                <Clipboard className="w-3.5 h-3.5 text-slate-600" />
                <span>Paste (Ctrl+V)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {pasteNotice && (
        <p className="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200 text-center font-medium">
          {pasteNotice}
        </p>
      )}

      {/* Lightbox Fullscreen Preview Modal */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewModalImg(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl p-2 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800">
                {label} — Photo #{previewModalImg.index + 1}
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalImg(null)}
                className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center max-h-[80vh]">
              <img
                src={previewModalImg.url}
                alt="Full resolution preview"
                className="max-h-[75vh] max-w-full object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
