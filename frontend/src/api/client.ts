import axios from "axios";
import type { AxiosError } from "axios";
import { API_BASE_URL } from "@/lib/constants";
import type { ErrorResponse } from "@/api/types";
import { useAuthStore } from "@/stores/authStore";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30_000,
});

/* ---- Request interceptor: attach JWT ---- */
apiClient.interceptors.request.use((config) => {
  // Read token directly from persisted localStorage to avoid circular imports
  try {
    const raw = localStorage.getItem("auth-storage");
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { accessToken?: string } };
      const token = parsed?.state?.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // Silently fail — no token attached
  }
  return config;
});

/* ---- Response interceptor: handle 401 ---- */
let _redirectingToLogin = false;

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorResponse>) => {
    if (error.response?.status === 401) {
      if (!_redirectingToLogin) {
        _redirectingToLogin = true;
        // Clear in-memory Zustand state and persisted localStorage atomically
        useAuthStore.getState().logout();
        // Redirect to login if not already there
        if (window.location.pathname !== "/login") {
          window.location.replace("/login");
        }
        // Reset flag after navigation settles
        setTimeout(() => { _redirectingToLogin = false; }, 2000);
      }
    }
    return Promise.reject(error);
  },
);

/** Extract a user-friendly error message from an Axios error */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ErrorResponse | undefined;
    if (data?.detail) {
      if (typeof data.detail === "string") return data.detail;
      if (Array.isArray(data.detail)) {
        return data.detail.map((d) => d.msg).join(", ");
      }
    }
    if (error.response?.status === 404) return "Resource not found";
    if (error.response?.status === 403) return "Access denied";
    if (error.response?.status === 422) return "Validation error";
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}

export function getStorageUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) {
    return null;
  }

  const normalizedPath = relativePath.replace(/^\/+/, "");

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  if (/^https?:\/\//i.test(API_BASE_URL)) {
    const baseUrl = new URL(API_BASE_URL);
    const basePath = baseUrl.pathname.replace(/\/api\/?$/, "/");
    return new URL(`storage/${normalizedPath}`, `${baseUrl.origin}${basePath}`).toString();
  }

  return `${window.location.origin}/storage/${normalizedPath}`;
}
