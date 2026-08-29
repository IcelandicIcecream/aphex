import { describe, it, expect } from 'vitest';
import {
	buildVariantKey,
	buildVariantUrl,
	imageConfigHash,
	parseVariantFilename,
	variantFilename,
	buildOriginalKey,
	DEFAULT_IMAGE_QUALITY,
	DEFAULT_IMAGE_WIDTHS,
	configHashFor,
	getVariants,
	pickVariant,
	resolveImageConfig,
	usableWidths
} from '@aphexcms/cms-core/server';

/**
 * The derivative layout and its selection logic.
 *
 * Derivatives are generated on first request, not at upload, and addressed
 * through the same `/media/{id}/{filename}` route as the original so they
 * inherit its access checks. Their names encode width + config hash, which is
 * what makes a variant URL immutable and safe to cache for a year.
 */

const CONFIG = { widths: [320, 640, 1280], quality: 80 };

function assetWith(variants: unknown) {
	return { metadata: { variants } } as any;
}

describe('variant filenames', () => {
	it('round-trips width and config hash', () => {
		const name = variantFilename(640, 'abc123');
		expect(name).toBe('w640-abc123.webp');
		expect(parseVariantFilename(name)).toEqual({
			width: 640,
			configHash: 'abc123',
			format: 'webp'
		});
	});

	it('does not mistake an ordinary filename for a variant', () => {
		// The route falls back to serving the original for anything unparseable,
		// so a false positive here would try to resize a PDF.
		for (const name of ['photo.png', 'original.jpg', 'w.webp', 'w640.webp', 'wabc-123.webp']) {
			expect(parseVariantFilename(name), name).toBeNull();
		}
	});

	it('refuses an absurd width at the pattern level', () => {
		// Bounded before any resizer sees it, independent of the ladder check.
		expect(parseVariantFilename('w999999-abc.webp')).toBeNull();
	});

	it('places a variant beside its original, not inside a new directory', () => {
		const original = buildOriginalKey('asset-1', 'photo.jpg', 'image/jpeg');
		const variant = buildVariantKey('asset-1', 640, 'abc123');
		expect(original).toBe('asset-1/original.jpg');
		expect(variant).toBe('asset-1/w640-abc123.webp');
		expect(variant.split('/')[0]).toBe(original.split('/')[0]);
	});

	it('builds a URL carrying no part of the user’s filename', () => {
		// This is what makes renaming an asset free: the variant URL is derived
		// from the id, so it can't fall out of step with a changed display name.
		const url = buildVariantUrl('asset-1', 640, 'abc123');
		expect(url).toBe('/media/asset-1/w640-abc123.webp');
		expect(url).not.toContain('photo');
	});
});

describe('imageConfigHash', () => {
	it('is stable for the same config', () => {
		expect(imageConfigHash(CONFIG)).toBe(imageConfigHash({ ...CONFIG }));
	});

	it('ignores the order widths were written in', () => {
		// Otherwise reordering the array in aphex.config.ts would orphan every
		// previously generated derivative and silently regenerate the lot.
		expect(imageConfigHash({ widths: [1280, 320, 640], quality: 80 })).toBe(
			imageConfigHash({ widths: [320, 640, 1280], quality: 80 })
		);
	});

	it('changes when quality changes', () => {
		expect(imageConfigHash({ ...CONFIG, quality: 60 })).not.toBe(imageConfigHash(CONFIG));
	});

	it('changes when the ladder changes', () => {
		expect(imageConfigHash({ ...CONFIG, widths: [320, 640] })).not.toBe(imageConfigHash(CONFIG));
	});
});

describe('resolveImageConfig', () => {
	it('is enabled by default', () => {
		expect(resolveImageConfig(undefined)).toEqual({
			widths: DEFAULT_IMAGE_WIDTHS,
			quality: DEFAULT_IMAGE_QUALITY
		});
	});

	it('is disabled by explicit null', () => {
		expect(resolveImageConfig(null)).toBeNull();
	});

	it('sorts and de-duplicates widths', () => {
		expect(resolveImageConfig({ widths: [640, 320, 640] })?.widths).toEqual([320, 640]);
	});

	it('drops nonsense widths and disables when none remain', () => {
		expect(resolveImageConfig({ widths: [0, -5, 99999, NaN] })).toBeNull();
	});

	it('falls back to the default quality when out of range', () => {
		for (const quality of [0, 101, -1, NaN]) {
			expect(resolveImageConfig({ widths: [320], quality })?.quality, `q=${quality}`).toBe(
				DEFAULT_IMAGE_QUALITY
			);
		}
	});
});

describe('getVariants', () => {
	it('returns null for an asset that has never been processed', () => {
		expect(getVariants({ metadata: {} } as any)).toBeNull();
	});

	it('treats a malformed record as absent rather than throwing', () => {
		// `metadata` is JSON that has been through a database and may predate the
		// feature. A bad record must regenerate, never crash a page render.
		for (const bad of [null, 'nope', 42, {}, { config: 'x' }, { config: 'x', widths: 'no' }]) {
			expect(getVariants(assetWith(bad)), JSON.stringify(bad)).toBeNull();
		}
	});

	it('drops entries missing required fields', () => {
		const record = {
			config: 'abc',
			generatedAt: '2026-01-01T00:00:00.000Z',
			widths: [
				{
					w: 320,
					h: 200,
					key: 'a/w320-abc.webp',
					path: 'b/a/w320-abc.webp',
					url: '/media/a/x',
					bytes: 1
				},
				{ w: 640, h: 400 }
			]
		};
		expect(getVariants(assetWith(record))?.widths).toHaveLength(1);
	});
});

describe('pickVariant', () => {
	const record = {
		config: 'abc',
		generatedAt: '2026-01-01T00:00:00.000Z',
		widths: [
			{
				w: 320,
				h: 200,
				key: 'a/w320-abc.webp',
				path: 'b/a/w320-abc.webp',
				url: '/media/a/w320-abc.webp',
				bytes: 1
			}
		]
	};

	it('finds an exact width under the matching config', () => {
		expect(pickVariant(assetWith(record), 320, 'abc')?.w).toBe(320);
	});

	it('ignores a record generated under a different config', () => {
		// Stale entries address keys nothing will request again, since every URL
		// embeds the hash. Treating them as hits would serve the wrong quality.
		expect(pickVariant(assetWith(record), 320, 'different')).toBeNull();
	});

	it('returns null for a width that was never generated', () => {
		expect(pickVariant(assetWith(record), 640, 'abc')).toBeNull();
	});
});

describe('usableWidths', () => {
	it('drops rungs at or above the original width', () => {
		// Upscaling produces a bigger file that looks no better.
		expect(usableWidths(CONFIG, 700)).toEqual([320, 640]);
	});

	it('keeps the whole ladder when the original is large', () => {
		expect(usableWidths(CONFIG, 4000)).toEqual([320, 640, 1280]);
	});

	it('still offers the smallest rung for a tiny original', () => {
		// An empty srcset would leave nothing to serve at all.
		expect(usableWidths(CONFIG, 100)).toEqual([320]);
	});

	it('falls back to the full ladder when the width is unknown', () => {
		expect(usableWidths(CONFIG, null)).toEqual([320, 640, 1280]);
	});
});

describe('configHashFor', () => {
	it('matches the raw hash of the resolved config', () => {
		const resolved = resolveImageConfig(CONFIG)!;
		expect(configHashFor(resolved)).toBe(imageConfigHash(resolved));
	});
});
