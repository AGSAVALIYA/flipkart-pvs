import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Check } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { Button } from "@/components/ui/Button";
export const CameraCapture = ({ onCapture, onCancel, }) => {
    const { videoRef, canvasRef, isActive, error: cameraError, capturedPhoto, startCamera, stopCamera, capturePhoto, retakePhoto, } = useCamera();
    const [useFallback, setUseFallback] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const fileInputRef = useRef(null);
    // Trigger camera startup on mount
    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, [startCamera, stopCamera]);
    // Sync photo preview URL whenever capturedPhoto blob updates
    useEffect(() => {
        if (capturedPhoto) {
            const url = URL.createObjectURL(capturedPhoto);
            setPhotoPreview(url);
            return () => URL.revokeObjectURL(url);
        }
        else {
            setPhotoPreview(null);
        }
    }, [capturedPhoto]);
    // Fallback upload trigger
    const handleFallbackChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const previewUrl = URL.createObjectURL(file);
            setPhotoPreview(previewUrl);
            onCapture(file); // Trigger select directly
        }
    };
    const handleCapture = async () => {
        const blob = await capturePhoto();
        if (blob) {
            stopCamera();
        }
    };
    const handleRetake = () => {
        retakePhoto();
        startCamera();
    };
    const handleConfirm = () => {
        if (capturedPhoto) {
            onCapture(capturedPhoto);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-4.5 w-full items-center select-none", children: [_jsx("canvas", { ref: canvasRef, className: "hidden" }), _jsxs("div", { className: "relative w-full max-w-md aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-800", children: [isActive && !photoPreview && (_jsxs(_Fragment, { children: [_jsx("video", { ref: videoRef, autoPlay: true, playsInline: true, muted: true, className: "w-full h-full object-cover" }), _jsx("div", { className: "absolute inset-0 border-[3px] border-dashed border-white/20 m-8 rounded-lg pointer-events-none flex items-center justify-center", children: _jsx("div", { className: "text-white/25 text-[10px] font-bold tracking-widest uppercase", children: "ALIGN PHYSICAL LABEL" }) })] })), photoPreview && (_jsx("img", { src: photoPreview, alt: "Physical label snap preview", className: "w-full h-full object-cover animate-fade-in" })), !isActive && !photoPreview && !useFallback && (_jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3", children: [_jsx("p", { className: "text-sm font-semibold text-slate-400", children: cameraError || "Initializing camera stream..." }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", className: "border-slate-800 text-white hover:bg-slate-900", onClick: startCamera, children: "Retry Stream" }), _jsx(Button, { variant: "primary", size: "sm", onClick: () => {
                                            setUseFallback(true);
                                            fileInputRef.current?.click();
                                        }, children: "Upload Photo" })] })] }))] }), _jsxs("div", { className: "flex items-center justify-center gap-4 w-full max-w-xs mt-1", children: [isActive && !photoPreview && (_jsx("button", { onClick: handleCapture, className: "h-15 w-15 rounded-full border-4 border-white bg-indigo-600 hover:bg-indigo-500 shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95", "aria-label": "Capture photograph", children: _jsx(Camera, { className: "h-6 w-6 text-white" }) })), photoPreview && (_jsxs("div", { className: "flex items-center gap-3.5 w-full animate-fade-in", children: [_jsxs(Button, { variant: "outline", onClick: handleRetake, className: "w-full gap-2 py-2.5 font-bold tracking-wide", children: [_jsx(RotateCcw, { className: "h-4 w-4" }), "Retake"] }), _jsxs(Button, { variant: "primary", onClick: handleConfirm, className: "w-full gap-2 py-2.5 font-bold tracking-wide shadow-indigo-600/20", children: [_jsx(Check, { className: "h-4 w-4" }), "Confirm"] })] }))] }), _jsx("input", { type: "file", ref: fileInputRef, onChange: handleFallbackChange, accept: "image/*", capture: "environment" // Forces back camera on mobile files input
                , className: "hidden" })] }));
};
export default CameraCapture;
