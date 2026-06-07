export declare function useCamera(): {
    videoRef: import("react").RefObject<HTMLVideoElement | null>;
    canvasRef: import("react").RefObject<HTMLCanvasElement | null>;
    isActive: boolean;
    isInitializing: boolean;
    error: string | null;
    capturedPhoto: Blob | null;
    startCamera: () => Promise<void>;
    stopCamera: () => void;
    capturePhoto: () => Promise<Blob | null>;
    retakePhoto: () => void;
};
