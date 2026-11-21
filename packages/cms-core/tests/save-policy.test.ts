import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/lib/api/client';
import {
	AUTOSAVE_MAX_WAIT_MS,
	autosaveDelay,
	autosaveIn,
	classifySaveError,
	saveRetryDelay,
	SAVE_RETRY_DELAYS_MS
} from '../src/lib/components/admin/save-policy';

describe('classifySaveError', () => {
	it('treats a 409 as a conflict: never retried, it would overwrite the other writer', () => {
		expect(classifySaveError(new ApiError(409, {}))).toBe('conflict');
	});

	it('treats a refusal of the content as final until the next edit', () => {
		for (const status of [400, 401, 403, 404, 413, 422]) {
			expect(classifySaveError(new ApiError(status, {}))).toBe('rejected');
		}
	});

	it('retries when there was no answer about the content', () => {
		for (const status of [408, 429, 500, 502, 503, 504]) {
			expect(classifySaveError(new ApiError(status, {}))).toBe('retryable');
		}
		// fetch's own failure when offline
		expect(classifySaveError(new TypeError('Failed to fetch'))).toBe('retryable');
	});
});

describe('saveRetryDelay', () => {
	it('backs off, then holds at the last pause', () => {
		expect(SAVE_RETRY_DELAYS_MS.map((_, i) => saveRetryDelay(i))).toEqual([
			...SAVE_RETRY_DELAYS_MS
		]);
		expect(saveRetryDelay(50)).toBe(SAVE_RETRY_DELAYS_MS.at(-1));
		expect(saveRetryDelay(-1)).toBe(SAVE_RETRY_DELAYS_MS[0]);
	});
});

describe('autosaveDelay', () => {
	it('saves a new document sooner than an existing one', () => {
		expect(autosaveDelay(true)).toBeLessThan(autosaveDelay(false));
	});
});

describe('autosaveIn', () => {
	it('saves after a short pause', () => {
		expect(autosaveIn(false, 1_000, 1_000)).toBe(autosaveDelay(false));
	});

	it('still saves while typing never pauses, once the oldest edit is old enough', () => {
		// First edit at t=0; still typing at t=3.5 s: the save comes at the 4 s mark.
		expect(autosaveIn(false, 0, 3_500)).toBe(AUTOSAVE_MAX_WAIT_MS - 3_500);
		// Past the limit: now.
		expect(autosaveIn(false, 0, 10_000)).toBe(0);
	});
});
