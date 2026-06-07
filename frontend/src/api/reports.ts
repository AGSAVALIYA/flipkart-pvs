import { apiClient } from "@/api/client";
import type { ReportResponse, ReportSummary, PaginationParams } from "@/api/types";

export async function getReport(
  startDate: string,
  endDate: string,
  pagination?: PaginationParams,
): Promise<ReportResponse> {
  const { data } = await apiClient.get<ReportResponse>("/reports", {
    params: {
      start_date: startDate,
      end_date: endDate,
      page: pagination?.page ?? 1,
      page_size: pagination?.page_size ?? 25,
    },
  });
  return data;
}

export async function getReportSummary(
  startDate: string,
  endDate: string,
): Promise<ReportSummary> {
  const { data } = await apiClient.get<ReportSummary>("/reports/summary", {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });
  return data;
}
