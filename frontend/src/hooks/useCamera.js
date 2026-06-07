import { useRef, useState, useCallback, useEffect } from "react";
export function useCamera() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState(null);
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    // Request access to webcam video stream
    const startCamera = useCallback(async () => {
        setError(null);
        setCapturedPhoto(null);
        try {
            const constraints = {
                video: {
                    facingMode: "environment", // Prefer back-facing camera on mobile
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            };
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            setIsActive(true);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                await videoRef.current.play();
            }
        }
        catch (err) {
            console.error("Camera access failed: ", err);
            setError("Unable to access camera. Please check device permissions.");
            setIsActive(false);
        }
    }, []);
    // Stop video capture and release resource tracks
    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsActive(false);
    }, [stream]);
    // Capture current video frame onto canvas and output Blob
    const capturePhoto = useCallback(() => {
        return new Promise((resolve) => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || !isActive) {
                resolve(null);
                return;
            }
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve(null);
                return;
            }
            // Match canvas dimensions to video feed sizing
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            // Draw frame snapshot
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Convert to high-quality jpeg blob
            canvas.toBlob((blob) => {
                if (blob) {
                    setCapturedPhoto(blob);
                    resolve(blob);
                }
                else {
                    resolve(null);
                }
            }, "image/jpeg", 0.95);
        });
    }, [isActive]);
    const retakePhoto = useCallback(() => {
        setCapturedPhoto(null);
    }, []);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [stream]);
    return {
        videoRef,
        canvasRef,
        isActive,
        error,
        capturedPhoto,
        startCamera,
        stopCamera,
        capturePhoto,
        retakePhoto,
    };
}
