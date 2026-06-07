export declare enum Role {
    SUPER_ADMIN = "super_admin",
    ADMIN = "admin",
    OPERATOR = "operator",
    VIEWER = "viewer",
    QA_MANAGER = "qa_manager"
}
export declare enum Permission {
    PRODUCTS_VIEW = "products:view",
    PRODUCTS_UPLOAD = "products:upload",
    VALIDATION_VERIFY = "validation:verify",
    VALIDATION_VIEW_LOGS = "validation:view_logs",
    REPORTS_VIEW = "reports:view",
    REPORTS_EXPORT = "reports:export",
    USERS_VIEW = "users:view",
    USERS_CREATE = "users:create",
    USERS_UPDATE = "users:update",
    USERS_DELETE = "users:delete",
    SYSTEM_ADMIN = "system:admin"
}
export declare enum ValidationStatus {
    VERIFIED = "VERIFIED",
    MISMATCH = "MISMATCH",
    PENDING = "PENDING"
}
export declare enum AIProcessingMode {
    AUTOMATIC = "automatic",
    MANUAL = "manual",
    NOT_ALLOWED = "not_allowed"
}
export declare enum AIProcessingStatus {
    QUEUED = "queued",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    NOT_REQUESTED = "not_requested",
    NOT_ALLOWED = "not_allowed"
}
export interface UserLogin {
    username: string;
    password: string;
}
export interface UserCreate {
    username: string;
    password: string;
    role: Role;
}
export interface UserResponse {
    id: string;
    username: string;
    role: Role;
    is_active: boolean;
    created_at: string;
    created_by?: string | null;
}
export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    user: UserResponse;
}
export interface TokenPayload {
    sub: string;
    role: Role;
    exp: number;
    iat: number;
}
export interface ProductResponse {
    wid: string;
    ean: string;
    manufacturing_date: string;
    expiry_date: string;
}
export interface ProductLookupResponse {
    found: boolean;
    product: ProductResponse | null;
}
export interface UploadResponse {
    job_id: string;
    filename: string;
    status: string;
    message: string;
}
export interface IngestionJobResponse {
    id: string;
    filename: string;
    status: "pending" | "processing" | "completed" | "failed";
    total_rows: number | null;
    processed_rows: number;
    error_count: number;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
    error_message?: string | null;
}
export interface IngestionJobError {
    row: number;
    field: string;
    msg: string;
}
export interface IngestionStatusResponse {
    job: IngestionJobResponse;
    progress_percentage: number;
    current_rows_per_second: number | null;
    elapsed_seconds: number | null;
    estimated_remaining_seconds: number | null;
    estimated_completion_at: string | null;
    errors: IngestionJobError[];
}
export interface ValidationSubmitRequest {
    wid: string;
    captured_image: File;
    validation_status: ValidationStatus;
    notes?: string;
}
export interface ValidationResponse {
    id: number;
    wid: string;
    captured_image_url: string | null;
    validation_status: ValidationStatus;
    verified_by: string;
    verified_at: string;
    ai_extraction: AIExtractionResult | Record<string, unknown> | null;
    ai_match_result: string | null;
    ai_processing_mode: AIProcessingMode | null;
    ai_processing_status: AIProcessingStatus | null;
    ai_provider_name: string | null;
    ai_error_message: string | null;
    ai_processed_at: string | null;
    notes: string | null;
}
export interface ValidationWithProductResponse {
    validation: ValidationResponse;
    product: ProductResponse;
}
export interface AIExtractionResult {
    ean: string | null;
    manufacturing_date: string | null;
    expiry_date: string | null;
    confidence: number;
    raw_text: string;
    match_status?: string | null;
}
export interface ReportQuery {
    start_date: string;
    end_date: string;
    page?: number;
    page_size?: number;
}
export interface ReportSummary {
    total_verifications: number;
    verified_count: number;
    mismatch_count: number;
    pending_count: number;
    verification_rate: number;
    mismatch_rate: number;
}
export interface ReportRow {
    id: number;
    wid: string;
    ean: string;
    validation_status: ValidationStatus;
    verified_by: string;
    verified_at: string;
    ai_match_result: string | null;
    ai_processing_status: AIProcessingStatus | null;
}
export interface ReportResponse {
    summary: ReportSummary;
    logs: PaginatedResponse<ReportRow>;
}
export interface PaginationParams {
    page: number;
    page_size: number;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}
export interface ErrorDetail {
    loc: (string | number)[];
    msg: string;
    type: string;
}
export interface ErrorResponse {
    detail: string | ErrorDetail[];
}
export interface PermissionSet {
    role: Role;
    permissions: Permission[];
}
export interface AIProcessingSettings {
    provider_name: string | null;
    provider_available: boolean;
    role_modes: Record<Role, AIProcessingMode>;
    updated_at: string | null;
}
export interface AIProcessingSettingsUpdate {
    role_modes: Record<Role, AIProcessingMode>;
}
