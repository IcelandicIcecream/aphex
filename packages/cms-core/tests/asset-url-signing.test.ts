import { describe, it, expect } from 'vitest';
import {
	signAssetUrl,
	verifyAssetSignature,
	ASSET_EXPIRY_PARAM,
	ASSET_SIGNATURE_PARAM
} from '../src/lib/utils/asset-url-signing';

const SECRET = 'a-long-enough-test-secret-000000000000';
const ASSET = 'b3f1c0de-0000-4000-8000-000000000001';

const paramsOf = (url: string) => new URL(url, 'https://x.invalid').searchParams;

describe('signed asset URLs', () => {
	it('round-trips a signature it just minted', () => {
		const url = signAssetUrl(SECRET, `/media/${ASSET}/photo.jpg`, ASSET);
		expect(verifyAssetSignature(SECRET, paramsOf(url), ASSET)).toBe(true);
	});

	it('keeps the path and preserves existing query params', () => {
		const url = signAssetUrl(SECRET, `/media/${ASSET}/photo.jpg?w=800`, ASSET);
		expect(url.startsWith(`/media/${ASSET}/photo.jpg?`)).toBe(true);
		expect(paramsOf(url).get('w')).toBe('800');
	});

	it('does not bind the signature to the requested width', () => {
		// A responsive srcset asks for one asset at several widths. Signing the
		// width would mean a signature per breakpoint; the access decision is the
		// same for every rendition of the same picture.
		const url = signAssetUrl(SECRET, `/media/${ASSET}/photo.jpg?w=800`, ASSET);
		const wider = new URL(url, 'https://x.invalid');
		wider.searchParams.set('w', '1600');
		expect(verifyAssetSignature(SECRET, wider.searchParams, ASSET)).toBe(true);
	});

	it('rejects a signature minted for a different asset', () => {
		const url = signAssetUrl(SECRET, `/media/${ASSET}/photo.jpg`, ASSET);
		expect(verifyAssetSignature(SECRET, paramsOf(url), 'another-asset-id')).toBe(false);
	});

	it('rejects a different secret', () => {
		const url = signAssetUrl(SECRET, `/media/${ASSET}/photo.jpg`, ASSET);
		expect(verifyAssetSignature('not-the-secret', paramsOf(url), ASSET)).toBe(false);
	});

	it('rejects an expired link', () => {
		const url = signAssetUrl(SECRET, `/media/${ASSET}/photo.jpg`, ASSET, { expiresIn: 60 });
		const later = new Date(Date.now() + 61_000);
		expect(verifyAssetSignature(SECRET, paramsOf(url), ASSET, later)).toBe(false);
	});

	it('rejects a tampered expiry — the deadline is inside the signature', () => {
		const url = signAssetUrl(SECRET, `/media/${ASSET}/photo.jpg`, ASSET, { expiresIn: 60 });
		const extended = new URL(url, 'https://x.invalid');
		extended.searchParams.set(ASSET_EXPIRY_PARAM, String(2 ** 40));
		expect(verifyAssetSignature(SECRET, extended.searchParams, ASSET)).toBe(false);
	});

	it('rejects missing, empty and malformed signatures', () => {
		expect(verifyAssetSignature(SECRET, new URLSearchParams(), ASSET)).toBe(false);

		const noSig = new URLSearchParams({ [ASSET_EXPIRY_PARAM]: String(2 ** 40) });
		expect(verifyAssetSignature(SECRET, noSig, ASSET)).toBe(false);

		const garbage = new URLSearchParams({
			[ASSET_EXPIRY_PARAM]: 'not-a-number',
			[ASSET_SIGNATURE_PARAM]: 'x'
		});
		expect(verifyAssetSignature(SECRET, garbage, ASSET)).toBe(false);
	});

	it('fails closed when no secret is configured', () => {
		// Signing returns the URL untouched, and an unsigned URL to a private
		// asset is refused by the route — so a missing secret costs access rather
		// than granting it.
		const url = signAssetUrl(undefined, `/media/${ASSET}/photo.jpg`, ASSET);
		expect(url).toBe(`/media/${ASSET}/photo.jpg`);
		expect(verifyAssetSignature(undefined, paramsOf(url), ASSET)).toBe(false);
	});
});
