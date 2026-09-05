// Signing and verifying `/media/:id/:filename` URLs.
//
// The point is that a private asset stays reachable *through the CMS* without a
// session — an <img> in an email, a <video> on a page rendered for an entitled
// visitor, a download link with a deadline — while the bucket itself stays
// closed and its layout stays invisible.
//
// This is deliberately not `config.signedDownloads`, which redirects to a
// signed URL on the *bucket*. That works, but it hands the viewer a
// `r2.cloudflarestorage.com` URL, exposes the storage key layout, and moves the
// asset outside every check this route performs — including range handling and
// derivative selection. Signing our own URL keeps all of it here.

import { createHmac, timingSafeEqual } from 'node:crypto';

/** Query parameter names, kept in one place since both halves must agree. */
export const ASSET_SIGNATURE_PARAM = 'sig';
export const ASSET_EXPIRY_PARAM = 'exp';

/** 15 minutes. Long enough to load a page and start a download, short enough that a leaked link dies. */
export const DEFAULT_ASSET_URL_TTL_SECONDS = 900;

/**
 * What the signature covers: the asset and the deadline. Nothing else.
 *
 * Not the filename — it is cosmetic, derived from the asset row, and a rename
 * would silently invalidate live links. Not the requested width either: a
 * responsive `srcset` asks for the same asset at six widths, and signing the
 * width would mean six signatures for one image, so the caller would have to
 * mint them per breakpoint or give up on `srcset`. The question a signature
 * answers is "may this caller read this asset", not "which rendition" — every
 * derivative is the same picture, and the access decision is identical for all
 * of them.
 */
function payload(assetId: string, expiresAt: number): string {
	return `${assetId}:${expiresAt}`;
}

function sign(secret: string, assetId: string, expiresAt: number): string {
	return createHmac('sha256', secret).update(payload(assetId, expiresAt)).digest('base64url');
}

export interface SignedAssetUrlOptions {
	/** Seconds the link stays valid. Defaults to {@link DEFAULT_ASSET_URL_TTL_SECONDS}. */
	expiresIn?: number;
	/** Overrides "now" — for tests, and for minting a link that starts later. */
	now?: Date;
}

/**
 * Append a signature and expiry to a `/media/...` path.
 *
 * Returns the path unchanged when no secret is configured. That is the safe
 * direction: an unsigned URL to a private asset is refused by the route, so a
 * missing secret costs access rather than granting it.
 */
export function signAssetUrl(
	secret: string | undefined,
	url: string,
	assetId: string,
	options: SignedAssetUrlOptions = {}
): string {
	if (!secret) return url;

	const nowSeconds = Math.floor((options.now?.getTime() ?? Date.now()) / 1000);
	const expiresAt = nowSeconds + (options.expiresIn ?? DEFAULT_ASSET_URL_TTL_SECONDS);

	// Relative paths are the common case here, so parse against a base and keep
	// only what we were given.
	const parsed = new URL(url, 'https://placeholder.invalid');
	parsed.searchParams.set(ASSET_EXPIRY_PARAM, String(expiresAt));
	parsed.searchParams.set(ASSET_SIGNATURE_PARAM, sign(secret, assetId, expiresAt));

	return url.startsWith('http') ? parsed.toString() : `${parsed.pathname}${parsed.search}`;
}

/**
 * Whether this request carries a valid, unexpired signature for this asset.
 *
 * Every failure returns `false` rather than throwing or distinguishing itself:
 * a caller learning *why* a signature was rejected learns something about the
 * secret. The route treats false exactly as it treats no signature at all.
 */
export function verifyAssetSignature(
	secret: string | undefined,
	params: URLSearchParams,
	assetId: string,
	now: Date = new Date()
): boolean {
	if (!secret) return false;

	const signature = params.get(ASSET_SIGNATURE_PARAM);
	const expiry = params.get(ASSET_EXPIRY_PARAM);
	if (!signature || !expiry) return false;

	const expiresAt = Number(expiry);
	if (!Number.isSafeInteger(expiresAt)) return false;
	if (expiresAt * 1000 <= now.getTime()) return false;

	const expected = Buffer.from(sign(secret, assetId, expiresAt));
	const actual = Buffer.from(signature);
	// timingSafeEqual throws on a length mismatch, which is itself an oracle of
	// sorts — check length first and compare only equal-length buffers.
	if (expected.length !== actual.length) return false;

	return timingSafeEqual(expected, actual);
}
