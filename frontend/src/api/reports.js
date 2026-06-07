import { apiClient } from "@/api/client";
export async function getReport(startDate, endDate, pagination) {
    const { data } = await apiClient.get("/reports", {
        params: {
            start_date: startDate,
            end_date: endDate,
            page: pagination?.page ?? 1,
            page_size: pagination?.page_size ?? 25,
        },
    });
    return data;
}
export async function getReportSummary(startDate, endDate) {
    const { data } = await apiClient.get("/reports/summary", {
        params: {
            start_date: startDate,
            end_date: endDate,
        },
    });
    return data;
}
