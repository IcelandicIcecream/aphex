/**
 * Upload size limits, shared by the server that enforces them and the client
 * that pre-checks against them.
 *
 * Deliberately its own tiny module rather than a constant in either place: the
 * client check is only useful if it agrees with the server, and two copies of a
 * number agree right up until someone changes one of them. Plain values, no
 * imports, so both a Svelte component and the Hono app can take it without
 * dragging anything else along.
 */

/**
 * Maximum accepted HTTP request body, in bytes.
 *
 * Enforced by the `bodyLimit` middleware on every `/api` route, which rejects
 * with 413 before the body is buffered.
 *
 * Note this is a limit on the *request*, not on the file: a multipart upload
 * also carries part headers and boundary markers, so the largest uploadable
 * file is slightly smaller. See {@link MULTIPART_OVERHEAD_BYTES}.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Headroom reserved for multipart framing when checking a file client-side.
 *
 * Without it a file of exactly {@link MAX_UPLOAD_BYTES} passes the client check
 * and is then rejected by the server — the worst outcome, since the pre-check
 * exists precisely so the user doesn't upload something doomed. Generous
 * relative to real framing (a few hundred bytes) because being slightly
 * conservative costs nothing and being slightly optimistic costs an upload.
 */
export const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

/** Largest file that can be expected to survive the request body limit. */
export const MAX_UPLOAD_FILE_BYTES = MAX_UPLOAD_BYTES - MULTIPART_OVERHEAD_BYTES;

/**
 * The configured request body limit, or the default when unset.
 *
 * Takes the whole CMS instances bag rather than the number so every call site
 * resolves it the same way — a route reading `config.upload.maxFileSize` itself
 * is how the enforced limit and the reported limit drift apart.
 *
 * A non-positive or non-finite value is treated as unset: it would otherwise
 * reject every request, including the ones that would tell an operator why.
 */
export function resolveMaxUploadBytes(instances?: {
	config?: { upload?: { maxFileSize?: number } };
}): number {
	const configured = instances?.config?.upload?.maxFileSize;
	if (typeof configured === 'number' && Number.isFinite(configured) && configured > 0) {
		return configured;
	}
	return MAX_UPLOAD_BYTES;
}

/** Largest file expected to fit within `maxUploadBytes` once multipart framing is counted. */
export function maxUploadFileBytes(maxUploadBytes: number): number {
	return Math.max(0, maxUploadBytes - MULTIPART_OVERHEAD_BYTES);
}

/** Render a byte count as whole megabytes for an error message. */
export function formatMegabytes(bytes: number): string {
	return `${Math.floor(bytes / (1024 * 1024))}MB`;
}
