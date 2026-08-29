import { describe, it, expect, vi } from 'vitest';
import { createCMSConfig, MAX_UPLOAD_BYTES } from '@aphexcms/cms-core/server';
import type { StorageAdapter, DatabaseAdapter } from '@aphexcms/cms-core/server';

/**
 * `upload.maxFileSize` is the only place the upload ceiling is set.
 *
 * It used to be set in two: the request-side checks read `upload.maxFileSize`
 * while the storage adapter carried an independent `maxFileSize` from its own
 * constructor. The reference app had 100MB in one and the S3 default of 10MB in
 * the other, so every upload in that band passed `bodyLimit`, passed the
 * direct-upload grant, was reported as allowed to the admin UI — and then died
 * inside `store()` with "File too large". Nothing anywhere reported the
 * disagreement.
 *
 * These tests pin the push-down that removed the second knob. Without the
 * `setMaxFileSize` call in `createCMSConfig` the first one fails.
 */

function stubAdapter() {
	let maxFileSize = 10 * 1024 * 1024;
	return {
		name: 'stub',
		store: vi.fn(async (data: { size: number }) => {
			if (data.size > maxFileSize) throw new Error(`File too large: ${data.size} bytes`);
			return {} as never;
		}),
		delete: vi.fn(async () => true),
		exists: vi.fn(async () => true),
		getUrl: () => '',
		getObject: vi.fn(async () => Buffer.alloc(0)),
		setMaxFileSize: vi.fn((bytes: number) => {
			maxFileSize = bytes;
		}),
		/** What the adapter would actually enforce, after any push-down. */
		effectiveLimit: () => maxFileSize
	};
}

function configure(storage: ReturnType<typeof stubAdapter>, upload?: { maxFileSize?: number }) {
	return createCMSConfig({
		schemaTypes: [],
		database: {} as DatabaseAdapter,
		storage: storage as unknown as StorageAdapter,
		upload
	});
}

describe('upload.maxFileSize is the single source of truth', () => {
	it('overrides the limit the adapter was constructed with', () => {
		const storage = stubAdapter();
		configure(storage, { maxFileSize: 100 * 1024 * 1024 });

		expect(storage.setMaxFileSize).toHaveBeenCalledWith(100 * 1024 * 1024);
		expect(storage.effectiveLimit()).toBe(100 * 1024 * 1024);
	});

	it('lets a file the request layer accepts through the adapter too', async () => {
		// The exact band that used to fail: over the adapter's 10MB default,
		// under the app's configured 100MB.
		const storage = stubAdapter();
		configure(storage, { maxFileSize: 100 * 1024 * 1024 });

		await expect(storage.store({ size: 14 * 1024 * 1024 })).resolves.toBeDefined();
	});

	it('still refuses a file over the configured ceiling', async () => {
		// The push-down raises and lowers alike — it is not a way to opt out of
		// having a limit. The adapter remains the backstop for callers that never
		// pass through `bodyLimit` (Local API, MCP, seeds, plugins).
		const storage = stubAdapter();
		configure(storage, { maxFileSize: 20 * 1024 * 1024 });

		expect(storage.effectiveLimit()).toBe(20 * 1024 * 1024);
		await expect(storage.store({ size: 21 * 1024 * 1024 })).rejects.toThrow('File too large');
	});

	it('applies the default ceiling when upload is unset', () => {
		const storage = stubAdapter();
		configure(storage);

		expect(storage.effectiveLimit()).toBe(MAX_UPLOAD_BYTES);
	});

	it('ignores a nonsensical configured value rather than blocking every upload', () => {
		// Mirrors `resolveMaxUploadBytes`, which treats a non-positive value as
		// unset: a zero here would otherwise reject everything, including the
		// uploads that would tell an operator why.
		const storage = stubAdapter();
		configure(storage, { maxFileSize: 0 });

		expect(storage.effectiveLimit()).toBe(MAX_UPLOAD_BYTES);
	});

	it('does not require an adapter to implement the setter', () => {
		// Optional on the interface, so a third-party adapter that caps nothing
		// stays valid. Config creation must not throw on it.
		const minimal = {
			name: 'minimal',
			store: vi.fn(),
			delete: vi.fn(),
			exists: vi.fn(),
			getUrl: () => '',
			getObject: vi.fn()
		} as unknown as StorageAdapter;

		expect(() =>
			createCMSConfig({
				schemaTypes: [],
				database: {} as DatabaseAdapter,
				storage: minimal,
				upload: { maxFileSize: 50 * 1024 * 1024 }
			})
		).not.toThrow();
	});

	it('does nothing when there is no storage adapter at all', () => {
		expect(() =>
			createCMSConfig({
				schemaTypes: [],
				database: {} as DatabaseAdapter,
				storage: null,
				upload: { maxFileSize: 50 * 1024 * 1024 }
			})
		).not.toThrow();
	});
});
