// Default configuration
const DEFAULT_BASE_URL = '/api';
const DEFAULT_TIMEOUT = 10000; // 10 seconds
export class ApiError extends Error {
    status;
    response;
    constructor(status, response, message) {
        super(message || `API Error: ${status}`);
        this.status = status;
        this.response = response;
        this.name = 'ApiError';
    }
}
export class ApiClient {
    baseUrl;
    timeout;
    constructor(baseUrl = DEFAULT_BASE_URL, timeout = DEFAULT_TIMEOUT) {
        this.baseUrl = baseUrl;
        this.timeout = timeout;
    }
    /**
     * Make HTTP request with proper error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        // Set up request with defaults
        const requestOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        requestOptions.signal = controller.signal;
        try {
            const response = await fetch(url, requestOptions);
            clearTimeout(timeoutId);
            const data = await response.json();
            // Handle HTTP errors
            if (!response.ok) {
                throw new ApiError(response.status, data, data.message || data.error);
            }
            // Handle API-level errors
            if (!data.success) {
                throw new ApiError(response.status, data, data.message || data.error);
            }
            return data;
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof ApiError) {
                throw error;
            }
            // Handle fetch errors (network, timeout, etc.)
            throw new ApiError(0, null, error instanceof Error ? error.message : 'Network error');
        }
    }
    /**
     * GET request
     */
    async get(endpoint, params) {
        let url = endpoint;
        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            });
            if (searchParams.toString()) {
                url += `?${searchParams.toString()}`;
            }
        }
        return this.request(url, { method: 'GET' });
    }
    /**
     * POST request
     */
    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined
        });
    }
    /**
     * PUT request
     */
    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined
        });
    }
    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}
// Export singleton instance
export const apiClient = new ApiClient();
