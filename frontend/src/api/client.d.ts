export declare const apiClient: import("axios").AxiosInstance;
/** Extract a user-friendly error message from an Axios error */
export declare function getErrorMessage(error: unknown): string;
export declare function getStorageUrl(relativePath: string | null | undefined): string | null;
