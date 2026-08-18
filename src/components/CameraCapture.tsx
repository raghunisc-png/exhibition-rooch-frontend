import {
  useEffect,
  useRef,
  useState,
} from "react";
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
  const inputRef =
    useRef<HTMLInputElement | null>(null);

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const [compressing, setCompressing] =
    useState(false);

  const [cameraOpen, setCameraOpen] =
    useState(false);

  const [cameraLoading, setCameraLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const processFile = async (
    raw: File
  ) => {
    setError(null);
    setCompressing(true);

    try {
      const compressed =
        await imageCompression(
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
        raw.name.replace(
          /\.\w+$/,
          ".jpg"
        ),
        {
          type: "image/jpeg",
        }
      );

      const previewUrl =
        URL.createObjectURL(file);

      if (value) {
        URL.revokeObjectURL(
          value.previewUrl
        );
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

  const handleFile = async (
    fileList: FileList | null
  ) => {
    const raw = fileList?.[0];

    if (!raw) {
      return;
    }

    await processFile(raw);
  };

  const openCamera = async () => {
    setError(null);
    setCameraLoading(true);

    try {
      stopCamera();

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Camera is not supported by this browser."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: {
                ideal: "environment",
              },
              width: {
                ideal: 1920,
              },
              height: {
                ideal: 1080,
              },
            },
            audio: false,
          }
        );

      streamRef.current = stream;
      setCameraOpen(true);

      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject =
            stream;

          void videoRef.current.play();
        }
      }, 50);
    } catch (err) {
      console.error(
        "Camera access failed:",
        err
      );

      let message =
        "Unable to open camera. Please allow camera permission and try again.";

      if (
        err instanceof DOMException
      ) {
        if (
          err.name ===
          "NotAllowedError"
        ) {
          message =
            "Camera permission was denied. Please allow camera access in your browser settings.";
        } else if (
          err.name ===
          "NotFoundError"
        ) {
          message =
            "No camera was found on this device.";
        } else if (
          err.name ===
          "NotReadableError"
        ) {
          message =
            "The camera is already being used by another application.";
        } else if (
          err.name ===
          "SecurityError"
        ) {
          message =
            "Camera access is blocked because this page is not running in a secure context.";
        }
      } else if (
        err instanceof Error
      ) {
        message = err.message;
      }

      setError(message);
      setCameraOpen(false);
      stopCamera();
    } finally {
      setCameraLoading(false);
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
  };

  const capturePhoto = async () => {
    const video =
      videoRef.current;

    const canvas =
      canvasRef.current;

    if (!video || !canvas) {
      setError(
        "Camera is not ready. Please try again."
      );

      return;
    }

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setError(
        "Camera is still loading. Please wait a moment and try again."
      );

      return;
    }

    try {
      canvas.width =
        video.videoWidth;

      canvas.height =
        video.videoHeight;

      const context =
        canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Unable to capture camera image."
        );
      }

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const blob =
        await new Promise<Blob | null>(
          (resolve) => {
            canvas.toBlob(
              resolve,
              "image/jpeg",
              0.92
            );
          }
        );

      if (!blob) {
        throw new Error(
          "Unable to create image."
        );
      }

      const file = new File(
        [blob],
        `product-photo-${Date.now()}.jpg`,
        {
          type: "image/jpeg",
        }
      );

      stopCamera();
      setCameraOpen(false);

      await processFile(file);
    } catch (err) {
      console.error(
        "Camera capture failed:",
        err
      );

      setError(
        "Couldn't capture the photo. Please try again."
      );
    }
  };

  const clear = () => {
    if (value) {
      URL.revokeObjectURL(
        value.previewUrl
      );
    }

    onChange(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setError(null);
  };

  if (cameraOpen) {
    return (
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm">

          <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
            <span className="text-sm font-bold text-white">
              Take Product Photo
            </span>

            <button
              type="button"
              onClick={closeCamera}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/10"
            >
              ✕ Close
            </button>
          </div>

          <div className="relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="aspect-[3/4] w-full object-cover"
            />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[70%] w-[80%] rounded-2xl border-2 border-white/60" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 bg-slate-900 px-4 py-5">

            <button
              type="button"
              onClick={closeCamera}
              className="rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() =>
                void capturePhoto()
              }
              disabled={
                compressing ||
                cameraLoading
              }
              className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white text-2xl shadow-lg transition active:scale-95 disabled:opacity-50"
              aria-label="Take photo"
            >
              📷
            </button>

          </div>
        </div>

        {error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        <canvas
          ref={canvasRef}
          className="hidden"
        />
      </div>
    );
  }

  if (value) {
    return (
      <div className="w-full max-w-md">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">

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

        {error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">

      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6">

        <div className="mb-5 text-center">

          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-slate-200">
            {compressing ? "…" : "📷"}
          </span>

          <p className="text-sm font-bold text-slate-700">
            {compressing
              ? "Processing photo..."
              : "Add product photo"}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            JPG or PNG · Automatically compressed
          </p>

        </div>

        <div className="grid grid-cols-2 gap-3">

          <button
            type="button"
            onClick={() =>
              inputRef.current?.click()
            }
            disabled={compressing}
            className="flex min-h-24 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-4 text-center shadow-sm transition hover:border-blue-400 hover:bg-blue-50/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="mb-2 text-2xl">
              📤
            </span>

            <span className="text-sm font-bold text-slate-700">
              Upload
            </span>

            <span className="mt-1 text-[11px] text-slate-400">
              Choose from device
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              void openCamera()
            }
            disabled={
              compressing ||
              cameraLoading
            }
            className="flex min-h-24 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-4 text-center shadow-sm transition hover:border-blue-400 hover:bg-blue-50/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="mb-2 text-2xl">
              {cameraLoading
                ? "…"
                : "📷"}
            </span>

            <span className="text-sm font-bold text-slate-700">
              {cameraLoading
                ? "Opening..."
                : "Camera"}
            </span>

            <span className="mt-1 text-[11px] text-slate-400">
              Take a photo
            </span>
          </button>

        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) =>
          void handleFile(
            e.target.files
          )
        }
      />

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      <canvas
        ref={canvasRef}
        className="hidden"
      />
    </div>
  );
}