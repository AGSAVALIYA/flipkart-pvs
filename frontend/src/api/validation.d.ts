import type { ValidationResponse, ValidationWithProductResponse, PaginatedResponse, PaginationParams } from "@/api/types";
export declare function submitVerification(formData: FormData): Promise<ValidationWithProductResponse>;
export declare function getValidationLogs(params: PaginationParams & {
    status?: string;
}): Promise<PaginatedResponse<ValidationResponse>>;
export declare function getValidationHistory(wid: string): Promise<ValidationResponse[]>;
export declare function getValidationLog(logId: number): Promise<ValidationResponse>;
export declare function requestValidationAIProcessing(logId: number): Promise<ValidationResponse>;
