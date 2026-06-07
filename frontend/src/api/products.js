import { apiClient } from "@/api/client";
export async function uploadCSV(file, onProgress) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post("/products/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300_000, // 5 min for large files
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        },
    });
    return data;
}
export async function getIngestionStatus(jobId) {
    const { data } = await apiClient.get(`/products/upload/${jobId}/status`);
    return data;
}
export async function getProduct(wid) {
    const { data } = await apiClient.get(`/products/${encodeURIComponent(wid)}`);
    return data;
}
export async function getProductStats() {
    const { data } = await apiClient.get("/products/stats");
    return data;
}
export async function getRecentJobs() {
    const { data } = await apiClient.get("/products/upload/recent");
    return data;
}
