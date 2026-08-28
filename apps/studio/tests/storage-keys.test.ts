import { describe, it, expect } from 'vitest';
import { buildAssetUrl, buildOriginalKey, extensionFor } from '@aphexcms/cms-core/server';

/**
 * The storage key layout. See `storage/keys.ts` for why it looks like this —
 * in short: derivable from the asset id (so a variant can be written beside an
 * original) and opaque (no org segment, no user-supplied filename).
 */

describe('extensionFor', () => {
	it('prefers the uploaded filename’s extension, lowercased', () => {
		expect(extensionFor('Photo.JPG', 'image/jpeg')).toBe('jpg');
	});

	it('falls back to the MIME type when the filename has none', () => {
		expect(extensionFor('screenshot', 'image/png')).toBe('png');
	});

	it('falls back to bin when neither is usable', () => {
		expect(extensionFor('noextension', 'application/x-unknown')).toBe('bin');
		expect(extensionFor('noextension')).toBe('bin');
	});

	it('rejects an extension that could alter the key’s shape', () => {
		// A "extension" carrying a separator or spaces would let a caller-supplied
		// filename reshape the key, which is exactly what the id-derived layout is
		// meant to prevent.
		expect(extensionFor('evil.pn/g', 'image/png')).toBe('png');
		expect(extensionFor('evil.p g', 'image/png')).toBe('png');
		expect(extensionFor('archive.tar.gz')).toBe('gz');
		// Absurdly long extensions are rejected rather than embedded.
		expect(extensionFor(`x.${'a'.repeat(40)}`, 'image/png')).toBe('png');
	});
});

describe('buildOriginalKey', () => {
	it('is derived from the asset id alone, plus an extension', () => {
		expect(buildOriginalKey('abc-123', 'Holiday Photo.JPG', 'image/jpeg')).toBe(
			'abc-123/original.jpg'
		);
	});

	it('never embeds the user’s filename', () => {
		const key = buildOriginalKey('abc-123', '../../etc/passwd.png', 'image/png');
		expect(key).toBe('abc-123/original.png');
		expect(key).not.toContain('passwd');
		expect(key).not.toContain('..');
	});

	it('carries no organization segment', () => {
		// The org lives on the row. Putting it in the key would leak org ids into
		// storage paths and force a copy if an asset ever moved between orgs.
		expect(buildOriginalKey('abc-123', 'a.png', 'image/png').split('/')).toHaveLength(2);
	});
});

describe('buildAssetUrl', () => {
	it('addresses the asset by id, with the filename as a trailing cosmetic segment', () => {
		expect(buildAssetUrl('abc-123', 'photo.png')).toBe('/media/abc-123/photo.png');
	});

	it('encodes a filename that would otherwise break the URL', () => {
		expect(buildAssetUrl('abc-123', 'my photo #1.png')).toBe(
			'/media/abc-123/my%20photo%20%231.png'
		);
	});

	it('changes on rename while the storage key does not', () => {
		// This is what makes renaming metadata-only: the object stays at
		// `{assetId}/original.{ext}` and only the URL's display segment moves.
		const before = buildAssetUrl('abc-123', 'old.png');
		const after = buildAssetUrl('abc-123', 'new.png');
		expect(before).not.toBe(after);
		expect(buildOriginalKey('abc-123', 'old.png', 'image/png')).toBe(
			buildOriginalKey('abc-123', 'new.png', 'image/png')
		);
	});
});
