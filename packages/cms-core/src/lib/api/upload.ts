import { ApiError } from './client';
import type { ApiResponse } from './types';

/**
 * Uploads, on XMLHttpRequest rather than fetch.
 *
 * Not nostalgia: `fetch` has no upload progress event. Request body streams are
 * the standards-track answer and are still neither broadly supported nor usable
 * with a plain `FormData`, so XHR remains the only way to report how far a
 * multi-megabyte upload has actually got. Everything else here exists to make
 * that swap invisible — same `ApiResponse`, same `ApiError`, same defensive
 * parsing — so callers can't tell which transport ran.
 */

export interface UploadOptions {
	/** Called with 0–100 as the body is sent. Never called after completion. */
	onProgress?: (percent: number) => void;
	/** Aborts the upload. The promise rejects with an `ApiError` of status 0. */
	signal?: AbortSignal;
	/** Milliseconds of inactivity before giving up. */
	timeoutMs?: number;
}

/**
 * POST a FormData body with progress reporting.
 *
 * Resolves with the parsed body on success and rejects with `ApiError`
 * otherwise, matching `ApiClient` exactly.
 */
export function uploadFormData<T>(
	url: string,
	body: FormData,
	options: UploadOptions = {}
): Promise<ApiResponse<T>> {
	const { onProgress, signal, timeoutMs } = options;

	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new ApiError(0, null, 'Upload cancelled'));
			return;
		}

		const xhr = new XMLHttpRequest();
		xhr.open('POST', url, true);
		// Deliberately not setting Content-Type: the browser must add the
		// multipart boundary, and setting it by hand produces a body the server
		// cannot parse.
		xhr.withCredentials = true;
		if (timeoutMs) xhr.timeout = timeoutMs;

		if (onProgress) {
			xhr.upload.addEventListener('progress', (event) => {
				// `lengthComputable` is false when the size isn't known up front;
				// reporting a fabricated percentage would be worse than none.
				if (event.lengthComputable && event.total > 0) {
					onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
				}
			});
		}

		const onAbort = () => xhr.abort();
		signal?.addEventListener('abort', onAbort, { once: true });
		const cleanup = () => signal?.removeEventListener('abort', onAbort);

		xhr.addEventListener('load', () => {
			cleanup();

			// Parse defensively, for the same reason the fetch client does: a
			// proxy or serverless platform can reject the request before it
			// reaches the app and answer with HTML, and parsing first would throw
			// a syntax error that buries the real status.
			let data: ApiResponse<T> | null = null;
			try {
				data = JSON.parse(xhr.responseText) as ApiResponse<T>;
			} catch {
				// Left null; handled below.
			}

			const ok = xhr.status >= 200 && xhr.status < 300;
			if (!ok) {
				reject(
					new ApiError(
						xhr.status,
						data,
						data?.message || data?.error || `Upload failed (${xhr.status})`
					)
				);
				return;
			}
			if (!data) {
				reject(new ApiError(xhr.status, null, 'Malformed response from server'));
				return;
			}
			if (!data.success) {
				reject(new ApiError(xhr.status, data, data.message || data.error));
				return;
			}

			resolve(data);
		});

		xhr.addEventListener('error', () => {
			cleanup();
			// XHR reports network failures with no detail at all, by design —
			// exposing more would leak cross-origin information.
			reject(new ApiError(0, null, 'Network error during upload'));
		});

		xhr.addEventListener('timeout', () => {
			cleanup();
			reject(new ApiError(0, null, 'Upload timed out'));
		});

		xhr.addEventListener('abort', () => {
			cleanup();
			reject(new ApiError(0, null, 'Upload cancelled'));
		});

		xhr.send(body);
	});
}
