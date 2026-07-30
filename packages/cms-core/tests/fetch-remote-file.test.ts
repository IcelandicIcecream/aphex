/**
 * SSRF-guard coverage for `fetchRemoteFile` (used by the `upload_asset` agent tool's `url`
 * input). The caller here is an LLM that can be steered by content it merely read, so these
 * guards are a real security boundary, not just robustness — worth testing directly rather
 * than only through the tool.
 *
 * Run: pnpm -F @aphexcms/cms-core test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));
// Only `fetch` is mocked — the real `Agent` class is harmless to construct (no I/O happens
// until a request is actually dispatched through it, which the mocked `fetch` never does), and
// keeping it real lets a future test assert on the dispatcher's pinned-lookup behavior directly.
vi.mock('undici', async (importOriginal) => {
	const actual = await importOriginal<typeof import('undici')>();
	return { ...actual, fetch: vi.fn() };
});

import { lookup } from 'node:dns/promises';
import { fetch as undiciFetch } from 'undici';
import { fetchRemoteFile, MAX_REMOTE_FILE_BYTES } from '../src/lib/utils/fetch-remote-file';

const lookupMock = vi.mocked(lookup);
const fetchMock = vi.mocked(undiciFetch);

function fakeResponse(opts: {
	status?: number;
	headers?: Record<string, string>;
	body?: Uint8Array;
}) {
	const chunks = opts.body ? [opts.body] : [];
	let i = 0;
	return {
		status: opts.status ?? 200,
		ok: (opts.status ?? 200) < 300,
		headers: { get: (k: string) => opts.headers?.[k.toLowerCase()] ?? null },
		body: {
			getReader: () => ({
				read: async () => {
					if (i < chunks.length) return { done: false, value: chunks[i++] };
					return { done: true, value: undefined };
				},
				cancel: async () => {}
			})
		}
	} as unknown as Response;
}

describe('fetchRemoteFile', () => {
	beforeEach(() => {
		lookupMock.mockReset();
		fetchMock.mockReset();
	});

	it('rejects non-http(s) protocols before ever resolving DNS', async () => {
		await expect(fetchRemoteFile('file:///etc/passwd')).rejects.toThrow(/http\/https/);
		expect(lookupMock).not.toHaveBeenCalled();
	});

	it('rejects "localhost" without a DNS lookup', async () => {
		await expect(fetchRemoteFile('http://localhost/x')).rejects.toThrow(/not allowed/);
		expect(lookupMock).not.toHaveBeenCalled();
	});

	it('rejects a hostname resolving to a private address', async () => {
		lookupMock.mockResolvedValue([{ address: '10.0.0.5', family: 4 }]);
		await expect(fetchRemoteFile('http://internal.example.com/x')).rejects.toThrow(
			/private\/internal/
		);
	});

	it('rejects a hostname resolving to a link-local (cloud metadata) address', async () => {
		lookupMock.mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);
		await expect(fetchRemoteFile('http://metadata.example.com/x')).rejects.toThrow(
			/private\/internal/
		);
	});

	it('fetches a public URL and returns its bytes + content-type', async () => {
		lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
		const bytes = new Uint8Array([1, 2, 3, 4]);
		fetchMock.mockResolvedValue(
			fakeResponse({ headers: { 'content-type': 'image/png' }, body: bytes }) as never
		);
		const result = await fetchRemoteFile('http://example.com/cover.png');
		expect(Array.from(result.buffer)).toEqual([1, 2, 3, 4]);
		expect(result.contentType).toBe('image/png');
	});

	it('pins the connection to the validated address via the dispatcher, not a fresh lookup', async () => {
		lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
		fetchMock.mockResolvedValue(fakeResponse({ body: new Uint8Array([1]) }) as never);
		await fetchRemoteFile('http://example.com/cover.png');
		const [, init] = fetchMock.mock.calls[0]!;
		expect(init?.dispatcher).toBeDefined();
	});

	it('re-checks DNS on every redirect hop (closes the post-check-redirect bypass)', async () => {
		lookupMock.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]);
		lookupMock.mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }]);
		fetchMock.mockResolvedValueOnce(
			fakeResponse({ status: 302, headers: { location: 'http://internal.example.com/x' } }) as never
		);
		await expect(fetchRemoteFile('http://public.example.com/redirect')).rejects.toThrow(
			/private\/internal/
		);
		expect(lookupMock).toHaveBeenCalledTimes(2);
	});

	it('rejects a Content-Length above the size cap without reading the body', async () => {
		lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
		fetchMock.mockResolvedValue(
			fakeResponse({ headers: { 'content-length': String(MAX_REMOTE_FILE_BYTES + 1) } }) as never
		);
		await expect(fetchRemoteFile('http://example.com/huge.bin')).rejects.toThrow(/too large/i);
	});

	it('aborts a stream that exceeds the size cap even with no/lying Content-Length', async () => {
		lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
		const bigChunk = new Uint8Array(MAX_REMOTE_FILE_BYTES + 1);
		fetchMock.mockResolvedValue(fakeResponse({ body: bigChunk }) as never);
		await expect(fetchRemoteFile('http://example.com/huge.bin')).rejects.toThrow(/too large/i);
	});

	it('sends a User-Agent/Accept header (bare requests read as bot traffic to many CDNs)', async () => {
		lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
		fetchMock.mockResolvedValue(fakeResponse({ body: new Uint8Array([1]) }) as never);
		await fetchRemoteFile('http://example.com/cover.png');
		const [, init] = fetchMock.mock.calls[0]!;
		expect(init?.headers).toMatchObject({
			'User-Agent': expect.stringContaining('AphexCMS'),
			Accept: expect.stringContaining('image/*')
		});
	});

	it('retries once on a transient 503 and succeeds if the retry returns 200', async () => {
		lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
		fetchMock
			.mockResolvedValueOnce(fakeResponse({ status: 503 }) as never)
			.mockResolvedValueOnce(
				fakeResponse({
					headers: { 'content-type': 'image/png' },
					body: new Uint8Array([9])
				}) as never
			);
		const result = await fetchRemoteFile('http://example.com/cover.png');
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(Array.from(result.buffer)).toEqual([9]);
	});

	it('fails after one retry if the upstream 503 persists, with a clear message', async () => {
		lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
		fetchMock.mockResolvedValue(fakeResponse({ status: 503 }) as never);
		await expect(fetchRemoteFile('http://example.com/cover.png')).rejects.toThrow(
			/503.*retried once/
		);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('does not retry a 404 — a bad URL will not fix itself', async () => {
		lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
		fetchMock.mockResolvedValue(fakeResponse({ status: 404 }) as never);
		await expect(fetchRemoteFile('http://example.com/missing.png')).rejects.toThrow(/404/);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
