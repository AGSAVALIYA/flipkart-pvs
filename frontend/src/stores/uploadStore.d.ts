interface UploadState {
    currentJobId: string | null;
    status: "idle" | "uploading" | "pending" | "processing" | "completed" | "failed";
    progress: number;
    filename: string | null;
    error: string | null;
    startUpload: (filename: string, jobId: string) => void;
    setUploading: (filename: string, progress: number) => void;
    updateProgress: (progress: number, status: "uploading" | "pending" | "processing" | "completed" | "failed") => void;
    completeUpload: () => void;
    failUpload: (errorMsg: string) => void;
    reset: () => void;
}
export declare const useUploadStore: import("zustand").UseBoundStore<import("zustand").StoreApi<UploadState>>;
export {};
