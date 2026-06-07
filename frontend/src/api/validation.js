import { apiClient } from "@/api/client";
export async function submitVerification(formData) {
    const { data } = await apiClient.post("/validation/verify", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60_000,
    });
    return data;
}
export async function getValidationLogs(params) {
    const { data } = await apiClient.get("/validation/logs", { params });
    return data;
}
export async function getValidationHistory(wid) {
    const { data } = await apiClient.get(`/validation/history/${encodeURIComponent(wid)}`);
    return data;
}
