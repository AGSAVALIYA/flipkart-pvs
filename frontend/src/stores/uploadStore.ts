import { create } from "zustand";

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

export const useUploadStore = create<UploadState>((set) => ({
  currentJobId: null,
  status: "idle",
  progress: 0,
  filename: null,
  error: null,

  startUpload: (filename, jobId) =>
    set({
      currentJobId: jobId,
      status: "pending",
      progress: 0,
      filename,
      error: null,
    }),

  setUploading: (filename, progress) =>
    set({
      status: "uploading",
      progress,
      filename,
      currentJobId: null,
      error: null,
    }),

  updateProgress: (progress, status) =>
    set({
      progress,
      status,
    }),

  completeUpload: () =>
    set({
      status: "completed",
      progress: 100,
    }),

  failUpload: (errorMsg) =>
    set({
      status: "failed",
      error: errorMsg,
    }),

  reset: () =>
    set({
      currentJobId: null,
      status: "idle",
      progress: 0,
      filename: null,
      error: null,
    }),
}));
