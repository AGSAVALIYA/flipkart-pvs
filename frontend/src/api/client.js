import axios from "axios";
import { API_BASE_URL } from "@/lib/constants";
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
            const parsed = JSON.parse(raw);
            const token = parsed?.state?.accessToken;
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
    }
    catch {
        // Silently fail — no token attached
    }
    return config;
});
/* ---- Response interceptor: handle 401 ---- */
apiClient.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401) {
        // Clear persisted auth
        try {
            localStorage.removeItem("auth-storage");
        }
        catch {
            // ignore
        }
        // Redirect to login if not already there
        if (window.location.pathname !== "/login") {
            window.location.href = "/login";
        }
    }
    return Promise.reject(error);
});
/** Extract a user-friendly error message from an Axios error */
export function getErrorMessage(error) {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (data?.detail) {
            if (typeof data.detail === "string")
                return data.detail;
            if (Array.isArray(data.detail)) {
                return data.detail.map((d) => d.msg).join(", ");
            }
        }
        if (error.response?.status === 404)
            return "Resource not found";
        if (error.response?.status === 403)
            return "Access denied";
        if (error.response?.status === 422)
            return "Validation error";
        if (error.message)
            return error.message;
    }
    if (error instanceof Error)
        return error.message;
    return "An unexpected error occurred";
}
