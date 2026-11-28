import { ApiError } from '../../api/client';

/**
 * How the document editor treats a failed save. Kept out of the component so the
 * rules can be tested without one.
 *
 * - `conflict`: someone else saved first (409). Retrying would overwrite them, so
 *   autosave stops and the editor asks for a reload.
 * - `rejected`: the server refused this content (a 4xx: invalid, too large, not
 *   allowed). Sending it again gets the same answer, so it waits for the next edit.
 * - `retryable`: the request didn't get an answer about the content (offline, a
 *   timeout, a 5xx, rate limited). The same content is tried again after a pause.
 */
export type SaveFailure = 'conflict' | 'rejected' | 'retryable';

export function classifySaveError(error: unknown): SaveFailure {
	if (error instanceof ApiError) {
		if (error.status === 409) return 'conflict';
		if (error.status === 408 || error.status === 429) return 'retryable';
		if (error.status >= 400 && error.status < 500) return 'rejected';
		return 'retryable';
	}
	// fetch rejects with a TypeError when there's no response at all (offline, DNS, CORS).
	return 'retryable';
}

/** Pauses before each retry: quick at first, then backing off to every 30 seconds. */
export const SAVE_RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 30_000] as const;

export function saveRetryDelay(attempt: number): number {
	const index = Math.min(Math.max(attempt, 0), SAVE_RETRY_DELAYS_MS.length - 1);
	return SAVE_RETRY_DELAYS_MS[index] ?? 30_000;
}

/** How long to wait after the last edit before autosaving. A new document goes almost at once. */
export function autosaveDelay(isNew: boolean): number {
	return isNew ? 300 : 800;
}

/** The longest an edit stays unsaved while typing carries on without a pause. */
export const AUTOSAVE_MAX_WAIT_MS = 4_000;

/**
 * When to autosave, given when the oldest unsaved edit was made. A pause in typing
 * saves after `autosaveDelay`; typing that never pauses still saves once the
 * oldest edit is `AUTOSAVE_MAX_WAIT_MS` old. A plain debounce restarted on every
 * key, so someone typing without stopping was never saved.
 */
export function autosaveIn(isNew: boolean, unsavedSince: number, now: number): number {
	const untilMax = unsavedSince + AUTOSAVE_MAX_WAIT_MS - now;
	return Math.max(0, Math.min(autosaveDelay(isNew), untilMax));
}
