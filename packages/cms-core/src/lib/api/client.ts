// Base API client with common functionality
import type { ApiResponse } from './types';

// Default configuration
const DEFAULT_BASE_URL = '/api';
const DEFAULT_TIMEOUT = 10000; // 10 seconds

export class ApiError extends Error {
	constructor(
		public status: number,
		public response: any,
		message?: string
	) {
		super(message || `API Error: ${status}`);
		this.name = 'ApiError';
	}
}

export class ApiClient {
	private baseUrl: string;
	private timeout: number;

	constructor(baseUrl = DEFAULT_BASE_URL, timeout = DEFAULT_TIMEOUT) {
		this.baseUrl = baseUrl;
		this.timeout = timeout;
	}

	/**
	 * Make HTTP request with proper error handling
	 */
	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
		const url = `${this.baseUrl}${endpoint}`;

		// Set up request with defaults
		// Don't set Content-Type for FormData (browser will set it with boundary)
		const headers: Record<string, string> = {};
		if (!(options.body instanceof FormData)) {
			headers['Content-Type'] = 'application/json';
		}

		const requestOptions: RequestInit = {
			headers: {
				...headers,
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

			const data: ApiResponse<T> = await response.json();

			// Handle HTTP errors
			if (!response.ok) {
				throw new ApiError(response.status, data, data.message || data.error);
			}

			// Handle API-level errors
			if (!data.success) {
				throw new ApiError(response.status, data, data.message || data.error);
			}

			return data;
		} catch (error) {
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
	async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
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

		return this.request<T>(url, { method: 'GET' });
	}

	/**
	 * POST request
	 */
	async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, {
			method: 'POST',
			// Don't stringify FormData - pass it directly
			body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
		});
	}

	/**
	 * PUT request
	 */
	async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, {
			method: 'PUT',
			// Don't stringify FormData - pass it directly
			body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
		});
	}

	/**
	 * DELETE request
	 */
	async delete<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, {
			method: 'DELETE',
			body: body ? JSON.stringify(body) : undefined
		});
	}

	/**
	 * PATCH request
	 */
	async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, {
			method: 'PATCH',
			// Don't stringify FormData - pass it directly
			body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
		});
	}
}

// Export singleton instance
export const apiClient = new ApiClient();
