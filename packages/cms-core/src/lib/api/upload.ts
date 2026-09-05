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
/**
 * PUT a file straight to object storage, reporting progress.
 *
 * Distinct from {@link uploadFormData} in two ways that matter:
 *
 * - **No credentials.** The target is a third-party origin and the URL already
 *   carries its own signature. Sending cookies would leak the session to the
 *   storage provider and trip CORS besides.
 * - **Raw body, not FormData.** The signature covers the object bytes; wrapping
 *   them in multipart framing would store the framing.
 *
 * A failure here is very often missing bucket CORS rather than a broken file,
 * and the browser deliberately hides the distinction — so the error says so.
 */
export function putToStorage(
	url: string,
	file: File | Blob,
	headers: Record<string, string> = {},
	options: UploadOptions = {}
): Promise<void> {
	const { onProgress, signal, timeoutMs } = options;

	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new ApiError(0, null, 'Upload cancelled'));
			return;
		}

		const xhr = new XMLHttpRequest();
		xhr.open('PUT', url, true);
		xhr.withCredentials = false;
		for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
		if (timeoutMs) xhr.timeout = timeoutMs;

		if (onProgress) {
			xhr.upload.addEventListener('progress', (event) => {
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
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve();
				return;
			}
			reject(new ApiError(xhr.status, null, `Storage rejected the upload (${xhr.status})`));
		});

		xhr.addEventListener('error', () => {
			cleanup();
			// A cross-origin PUT blocked by CORS surfaces here as a bare network
			// error with no detail, by design. Naming the likely cause is the only
			// way an operator finds it, since the browser console message is the
			// only other clue and nobody reads it from a toast.
			reject(
				new ApiError(
					0,
					null,
					'Could not reach storage. The bucket may not allow PUT from this origin (CORS).'
				)
			);
		});

		xhr.addEventListener('timeout', () => {
			cleanup();
			reject(new ApiError(0, null, 'Upload timed out'));
		});

		xhr.addEventListener('abort', () => {
			cleanup();
			reject(new ApiError(0, null, 'Upload cancelled'));
		});

		xhr.send(file);
	});
}

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
