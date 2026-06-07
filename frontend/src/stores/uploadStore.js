import { create } from "zustand";
export const useUploadStore = create((set) => ({
    currentJobId: null,
    status: "idle",
    progress: 0,
    filename: null,
    error: null,
    startUpload: (filename, jobId) => set({
        currentJobId: jobId,
        status: "pending",
        progress: 0,
        filename,
        error: null,
    }),
    setUploading: (filename, progress) => set({
        status: "uploading",
        progress,
        filename,
        currentJobId: null,
        error: null,
    }),
    updateProgress: (progress, status) => set({
        progress,
        status,
    }),
    completeUpload: () => set({
        status: "completed",
        progress: 100,
    }),
    failUpload: (errorMsg) => set({
        status: "failed",
        error: errorMsg,
    }),
    reset: () => set({
        currentJobId: null,
        status: "idle",
        progress: 0,
        filename: null,
        error: null,
    }),
}));
