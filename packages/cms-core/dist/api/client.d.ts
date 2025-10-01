import type { ApiResponse } from './types.js';
export declare class ApiError extends Error {
    status: number;
    response: any;
    constructor(status: number, response: any, message?: string);
}
export declare class ApiClient {
    private baseUrl;
    private timeout;
    constructor(baseUrl?: string, timeout?: number);
    /**
     * Make HTTP request with proper error handling
     */
    private request;
    /**
     * GET request
     */
    get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>>;
    /**
     * POST request
     */
    post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>>;
    /**
     * PUT request
     */
    put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>>;
    /**
     * DELETE request
     */
    delete<T>(endpoint: string): Promise<ApiResponse<T>>;
}
export declare const apiClient: ApiClient;
//# sourceMappingURL=client.d.ts.map