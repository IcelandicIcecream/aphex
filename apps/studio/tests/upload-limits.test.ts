import { describe, it, expect } from 'vitest';
import {
	MAX_UPLOAD_BYTES,
	MULTIPART_OVERHEAD_BYTES,
	maxUploadFileBytes,
	resolveMaxUploadBytes,
	formatMegabytes
} from '@aphexcms/cms-core/server';

/**
 * The upload ceiling used to be written in four places that disagreed: a 10MB
 * `bodyLimit`, a 50MB constant in the assets route that nothing could reach
 * because the middleware rejected first, and a 10MB default in each storage
 * adapter. These functions exist so the enforced limit and the limit reported
 * to the client are the same number by construction.
 */

describe('resolveMaxUploadBytes', () => {
	it('falls back to the default when nothing is configured', () => {
		expect(resolveMaxUploadBytes(undefined)).toBe(MAX_UPLOAD_BYTES);
		expect(resolveMaxUploadBytes({})).toBe(MAX_UPLOAD_BYTES);
		expect(resolveMaxUploadBytes({ config: {} })).toBe(MAX_UPLOAD_BYTES);
		expect(resolveMaxUploadBytes({ config: { upload: {} } })).toBe(MAX_UPLOAD_BYTES);
	});

	it('uses a configured limit', () => {
		const hundredMb = 100 * 1024 * 1024;
		expect(resolveMaxUploadBytes({ config: { upload: { maxFileSize: hundredMb } } })).toBe(
			hundredMb
		);
	});

	it('honours a configured limit below the default', () => {
		// Lowering must work too — a deployment on a constrained host should be
		// able to tighten the ceiling, not only raise it.
		expect(resolveMaxUploadBytes({ config: { upload: { maxFileSize: 1024 } } })).toBe(1024);
	});

	it('ignores a value that would reject every request', () => {
		// A zero or negative ceiling rejects everything, including the requests
		// that would tell an operator why. Treat it as unset.
		for (const bad of [0, -1, NaN, Infinity]) {
			expect(
				resolveMaxUploadBytes({ config: { upload: { maxFileSize: bad } } }),
				`maxFileSize: ${bad}`
			).toBe(MAX_UPLOAD_BYTES);
		}
	});
});

describe('maxUploadFileBytes', () => {
	it('reserves headroom for multipart framing', () => {
		// The server limit is on the request body, which carries part headers and
		// boundary markers on top of the file. Without the margin a file of
		// exactly the limit passes the client pre-check and is then rejected —
		// the one outcome the pre-check exists to prevent.
		expect(maxUploadFileBytes(MAX_UPLOAD_BYTES)).toBe(MAX_UPLOAD_BYTES - MULTIPART_OVERHEAD_BYTES);
		expect(maxUploadFileBytes(MAX_UPLOAD_BYTES)).toBeLessThan(MAX_UPLOAD_BYTES);
	});

	it('never reports a negative ceiling', () => {
		expect(maxUploadFileBytes(1024)).toBe(0);
	});
});

describe('formatMegabytes', () => {
	it('renders whole megabytes', () => {
		expect(formatMegabytes(10 * 1024 * 1024)).toBe('10MB');
		expect(formatMegabytes(100 * 1024 * 1024)).toBe('100MB');
	});
});
