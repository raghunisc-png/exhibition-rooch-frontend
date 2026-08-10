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

export default function CameraCapture({
  value,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [compressing, setCompressing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const handleFile = async (
    fileList: FileList | null
  ) => {
    const raw = fileList?.[0];

    if (!raw) return;

    setError(null);
    setCompressing(true);

    try {
      const compressed = await imageCompression(
        raw,
        {
          maxSizeMB: 1.2,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          fileType: "image/jpeg",
        }
      );

      const file = new File(
        [compressed],
        raw.name.replace(/\.\w+$/, ".jpg"),
        {
          type: "image/jpeg",
        }
      );

      const previewUrl =
        URL.createObjectURL(file);

      if (value) {
        URL.revokeObjectURL(value.previewUrl);
      }

      onChange({
        file,
        previewUrl,
      });
    } catch (err) {
      console.error(
        "Photo compression failed",
        err
      );

      setError(
        "Couldn't process that photo. Please try again."
      );
    } finally {
      setCompressing(false);
    }
  };

  const clear = () => {
    if (value) {
      URL.revokeObjectURL(value.previewUrl);
    }

    onChange(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div>
      {value ? (
        <div className="group relative max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <img
            src={value.previewUrl}
            alt="Product preview"
            className="h-64 w-full object-cover"
          />

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10">
            <span className="text-xs font-semibold text-white">
              Product photo
            </span>

            <button
              type="button"
              onClick={clear}
              className="rounded-lg bg-white/95 px-3 py-2 text-xs font-bold text-red-600 shadow-sm transition hover:bg-white"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() =>
            inputRef.current?.click()
          }
          disabled={compressing}
          className="flex min-h-44 w-full max-w-md flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-slate-200">
            {compressing ? "…" : "📷"}
          </span>

          <span className="text-sm font-bold text-slate-700">
            {compressing
              ? "Processing photo..."
              : "Take or choose photo"}
          </span>

          <span className="mt-1 text-xs text-slate-400">
            JPG or PNG · Automatically compressed
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) =>
          void handleFile(e.target.files)
        }
      />

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}