/**
 * How long to wait on a request carrying a file body.
 *
 * Its own module because both transports need it — the XHR upload path and the
 * fetch client — and a second copy of a heuristic is a second thing to get
 * wrong. No imports, so neither pays for it.
 *
 * Derived from the payload rather than configured. A timeout encodes no
 * decision the way a size limit does: its only job is to stop a hung request
 * spinning forever. Exposing it as a setting invites an inconsistent pair —
 * raise `upload.maxFileSize` to 100MB, leave the timeout at the JSON default,
 * and every large upload fails in a way that reads as a server rejection.
 * Deriving it means raising the size limit adjusts the deadline for free.
 */

/**
 * Assumed floor throughput, deliberately pessimistic — a phone on a bad
 * connection, not an office line. Too generous costs a slow failure on a
 * genuinely dead request; too tight kills uploads that were succeeding.
 */
const UPLOAD_ASSUMED_BYTES_PER_SECOND = 64 * 1024; // ~0.5 Mbps
const UPLOAD_TIMEOUT_FLOOR = 30_000;
const UPLOAD_TIMEOUT_CEILING = 15 * 60 * 1000;

export function uploadTimeoutForBytes(bytes: number): number {
	const transfer = (bytes / UPLOAD_ASSUMED_BYTES_PER_SECOND) * 1000;
	return Math.min(UPLOAD_TIMEOUT_CEILING, Math.max(UPLOAD_TIMEOUT_FLOOR, transfer));
}

export function uploadTimeoutFor(body: FormData): number {
	let bytes = 0;
	for (const value of body.values()) {
		// `File` extends `Blob`; checking Blob also covers a raw Blob part.
		if (typeof Blob !== 'undefined' && value instanceof Blob) bytes += value.size;
	}
	return uploadTimeoutForBytes(bytes);
}
