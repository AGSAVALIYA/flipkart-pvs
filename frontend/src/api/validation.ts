import { apiClient } from "@/api/client";
import type {
  ValidationResponse,
  ValidationWithProductResponse,
  PaginatedResponse,
  PaginationParams,
} from "@/api/types";

export async function submitVerification(
  formData: FormData,
): Promise<ValidationWithProductResponse> {
  const { data } = await apiClient.post<ValidationWithProductResponse>(
    "/validation/verify",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    },
  );
  return data;
}

export async function getValidationLogs(
  params: PaginationParams & { status?: string },
): Promise<PaginatedResponse<ValidationResponse>> {
  const { data } = await apiClient.get<PaginatedResponse<ValidationResponse>>(
    "/validation/logs",
    { params },
  );
  return data;
}

export async function getValidationHistory(
  wid: string,
): Promise<ValidationResponse[]> {
  const { data } = await apiClient.get<ValidationResponse[]>(
    `/validation/history/${encodeURIComponent(wid)}`,
  );
  return data;
}

export async function getValidationLog(
  logId: number,
): Promise<ValidationResponse> {
  const { data } = await apiClient.get<ValidationResponse>(
    `/validation/logs/${logId}`,
  );
  return data;
}

export async function requestValidationAIProcessing(
  logId: number,
): Promise<ValidationResponse> {
  const { data } = await apiClient.post<ValidationResponse>(
    `/validation/logs/${logId}/ai-process`,
  );
  return data;
}
