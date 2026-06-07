import React, { useEffect, useRef, useState } from "react";
import { Camera, Check, LoaderCircle, RotateCcw, Upload } from "lucide-react";
import { clsx } from "clsx";
import { useCamera } from "@/hooks/useCamera";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob) => void;
  onCancel?: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onCancel,
}) => {
  const { toast } = useToast();
  const {
    videoRef,
    canvasRef,
    isActive,
    isInitializing,
    error: cameraError,
    startCamera,
    stopCamera,
    capturePhoto,
    retakePhoto,
  } = useCamera();

  const [useFallback, setUseFallback] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedBlob, setSelectedBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Trigger camera startup on mount
  useEffect(() => {
    void startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Sync photo preview URL whenever selectedBlob updates
  useEffect(() => {
    if (selectedBlob) {
      const url = URL.createObjectURL(selectedBlob);
      setPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPhotoPreview(null);
    }
  }, [selectedBlob]);

  // Upload trigger with size checking
  const handleFallbackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 1 * 1024 * 1024) {
        toast("File size exceeds 1MB limit.", "error");
        e.target.value = ""; // Clear file
        return;
      }
      stopCamera();
      setSelectedBlob(file);
    }
  };

  const handleCapture = async () => {
    const blob = await capturePhoto();
    if (blob) {
      stopCamera();
      setSelectedBlob(blob);
    }
  };

  const handleRetake = () => {
    retakePhoto();
    setSelectedBlob(null);
    void startCamera();
  };

  const handleConfirm = () => {
    if (selectedBlob) {
      onCapture(selectedBlob);
    }
  };

  return (
    <div className="flex flex-col gap-4.5 w-full items-center select-none">
      {/* Hidden processing canvas used for extracting snaps */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Viewfinder Frame */}
      <div className="relative w-full max-w-md aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-800">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={clsx(
            "w-full h-full object-cover",
            isActive && !photoPreview ? "block" : "hidden",
          )}
        />

        {isActive && !photoPreview && (
          <>
            {/* Viewfinder Target Overlays */}
            <div className="absolute inset-0 border-[3px] border-dashed border-white/20 m-8 rounded-lg pointer-events-none flex items-center justify-center">
              <div className="text-white/25 text-[10px] font-bold tracking-widest uppercase">
                ALIGN PHYSICAL LABEL
              </div>
            </div>
          </>
        )}

        {photoPreview && (
          <img
            src={photoPreview}
            alt="Physical label snap preview"
            className="w-full h-full object-cover animate-fade-in"
          />
        )}

        {isInitializing && !photoPreview && !useFallback && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 text-center text-slate-200">
            <LoaderCircle className="h-7 w-7 animate-spin text-cyan-400" />
            <p className="text-sm font-semibold">Starting camera stream...</p>
          </div>
        )}

        {/* Viewfinder Overlay Alerts */}
        {!isActive && !photoPreview && !useFallback && !isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3">
            <p className="text-sm font-semibold text-slate-400">
              {cameraError || "Camera preview is unavailable."}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-800 text-white hover:bg-slate-900"
                onClick={() => {
                  void startCamera();
                }}
              >
                Retry Stream
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setUseFallback(true);
                  fileInputRef.current?.click();
                }}
              >
                Upload Photo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Viewfinder Action Buttons */}
      <div className="flex flex-col items-center justify-center gap-4 w-full max-w-xs mt-1">
        {isActive && !photoPreview && (
          <div className="flex flex-col items-center gap-4 w-full animate-fade-in">
            <button
              onClick={handleCapture}
              className="h-15 w-15 rounded-full border-4 border-white bg-indigo-600 hover:bg-indigo-500 shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
              aria-label="Capture photograph"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
            <div className="w-full h-px bg-slate-200 dark:bg-slate-800/60 my-0.5" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full gap-1.5 py-2.5 font-bold tracking-wide border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/40"
            >
              <Upload className="h-4 w-4" />
              Upload Photo (Max 1MB)
            </Button>
          </div>
        )}
 
        {photoPreview && (
          <div className="flex items-center gap-3.5 w-full animate-fade-in">
            <Button
              variant="outline"
              onClick={handleRetake}
              className="w-full gap-2 py-2.5 font-bold tracking-wide"
            >
              <RotateCcw className="h-4 w-4" />
              Retake
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              className="w-full gap-2 py-2.5 font-bold tracking-wide shadow-indigo-600/20"
            >
              <Check className="h-4 w-4" />
              Confirm
            </Button>
          </div>
        )}
      </div>

      {/* Fallback hidden file pickers */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFallbackChange}
        accept="image/*"
        capture="environment" // Forces back camera on mobile files input
        className="hidden"
      />
    </div>
  );
};
export default CameraCapture;
