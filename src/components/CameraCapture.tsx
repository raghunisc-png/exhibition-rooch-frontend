import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";

export interface CapturedPhoto {
  file: File;
  previewUrl: string;
}

interface Props {
  value: CapturedPhoto | null;
  onChange: (photo: CapturedPhoto | null) => void;
}

/**
 * Product photo capture. `capture="environment"` opens the rear camera
 * directly on phones/tablets; on desktop it falls back to a normal file
 * picker. Images are compressed client-side before we ever touch the
 * network or IndexedDB, since booth wifi/data can be slow and photos will
 * often be queued offline.
 */
export default function CameraCapture({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (fileList: FileList | null) => {
    const raw = fileList?.[0];
    if (!raw) return;
    setError(null);
    setCompressing(true);
    try {
      const compressed = await imageCompression(raw, {
        maxSizeMB: 1.2,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: "image/jpeg",
      });
      const file = new File([compressed], raw.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
      const previewUrl = URL.createObjectURL(file);
      onChange({ file, previewUrl });
    } catch (err) {
      console.error("Photo compression failed", err);
      setError("Couldn't process that photo. Please try again.");
    } finally {
      setCompressing(false);
    }
  };

  const clear = () => {
    if (value) URL.revokeObjectURL(value.previewUrl);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">Product photo</label>

      {value ? (
        <div className="relative w-full max-w-xs overflow-hidden rounded-xl border">
          <img src={value.previewUrl} alt="Product" className="h-56 w-full object-cover" />
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={compressing}
          className="flex h-40 w-full max-w-xs flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 active:bg-gray-100 disabled:opacity-60"
        >
          <span className="text-3xl">📷</span>
          <span className="text-sm font-medium">{compressing ? "Processing…" : "Take / choose photo"}</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files)}
      />

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
