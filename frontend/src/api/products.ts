import { apiClient } from "@/api/client";
import type {
  UploadResponse,
  IngestionStatusResponse,
  ProductLookupResponse,
  IngestionJobResponse,
  PaginatedResponse,
  PaginationParams,
} from "@/api/types";

export async function uploadCSV(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<UploadResponse>(
    "/products/upload",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300_000, // 5 min for large files
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(percentCompleted);
        }
      },
    },
  );
  return data;
}

export async function getIngestionStatus(
  jobId: string,
): Promise<IngestionStatusResponse> {
  const { data } = await apiClient.get<IngestionStatusResponse>(
    `/products/upload/${jobId}/status`,
  );
  return data;
}

export async function getProduct(
  wid: string,
): Promise<ProductLookupResponse> {
  const { data } = await apiClient.get<ProductLookupResponse>(
    `/products/${encodeURIComponent(wid)}`,
  );
  return data;
}

export async function getProductStats(): Promise<{ count: number }> {
  const { data } = await apiClient.get<{ count: number }>(
    "/products/stats",
  );
  return data;
}

export async function getRecentJobs(
  pagination: PaginationParams,
): Promise<PaginatedResponse<IngestionJobResponse>> {
  const { data } = await apiClient.get<PaginatedResponse<IngestionJobResponse>>(
    "/products/upload/recent",
    {
      params: {
        page: pagination.page,
        page_size: pagination.page_size,
      },
    },
  );
  return data;
}
