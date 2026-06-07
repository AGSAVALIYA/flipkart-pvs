import { useCallback, useEffect, useRef, useState } from "react";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);

  const stopTracks = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const clearVideoElement = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.pause();
    video.srcObject = null;
  }, []);

  // Request access to webcam video stream
  const startCamera = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setError(null);
    setCapturedPhoto(null);
    setIsInitializing(true);
    setIsActive(false);

    stopTracks(streamRef.current);
    streamRef.current = null;
    clearVideoElement();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API unavailable");
      }

      const constraints = {
        video: {
          facingMode: "environment", // Prefer back-facing camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (requestId !== requestIdRef.current) {
        stopTracks(mediaStream);
        return;
      }

      const video = videoRef.current;
      if (!video) {
        stopTracks(mediaStream);
        return;
      }

      streamRef.current = mediaStream;
      video.srcObject = mediaStream;
      await video.play();

      if (requestId !== requestIdRef.current) {
        stopTracks(mediaStream);
        return;
      }

      setIsActive(true);
    } catch (err: any) {
      if (err?.name === "AbortError" && requestId !== requestIdRef.current) {
        return;
      }

      console.error("Camera access failed: ", err);
      setError("Unable to access camera. Please check device permissions.");
      stopTracks(streamRef.current);
      streamRef.current = null;
      setIsActive(false);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsInitializing(false);
      }
    }
  }, [clearVideoElement, stopTracks]);

  // Stop video capture and release resource tracks
  const stopCamera = useCallback(() => {
    requestIdRef.current += 1;
    stopTracks(streamRef.current);
    streamRef.current = null;
    clearVideoElement();
    setIsActive(false);
    setIsInitializing(false);
  }, [clearVideoElement, stopTracks]);

  // Capture current video frame onto canvas and output Blob
  const capturePhoto = useCallback((): Promise<Blob | null> => {
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
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCapturedPhoto(blob);
            resolve(blob);
          } else {
            resolve(null);
          }
        },
        "image/jpeg",
        0.95
      );
    });
  }, [isActive]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return stopCamera;
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isActive,
    isInitializing,
    error,
    capturedPhoto,
    startCamera,
    stopCamera,
    capturePhoto,
    retakePhoto,
  };
}
