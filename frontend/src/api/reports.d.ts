import type { ReportResponse, ReportSummary, PaginationParams } from "@/api/types";
export declare function getReport(startDate: string, endDate: string, pagination?: PaginationParams): Promise<ReportResponse>;
export declare function getReportSummary(startDate: string, endDate: string): Promise<ReportSummary>;
