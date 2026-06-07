import type { UploadResponse, IngestionStatusResponse, ProductLookupResponse, IngestionJobResponse, PaginatedResponse, PaginationParams } from "@/api/types";
export declare function uploadCSV(file: File, onProgress?: (progress: number) => void): Promise<UploadResponse>;
export declare function getIngestionStatus(jobId: string): Promise<IngestionStatusResponse>;
export declare function getProduct(wid: string): Promise<ProductLookupResponse>;
export declare function getProductStats(): Promise<{
    count: number;
}>;
export declare function getRecentJobs(pagination: PaginationParams): Promise<PaginatedResponse<IngestionJobResponse>>;
