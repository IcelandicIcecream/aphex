import { describe, it, expect } from 'vitest';
import { imageUrlBuilder } from '@aphexcms/cms-core';

/**
 * `urlFor(image).width(n)` snaps to the ladder.
 *
 * It used to be a method that lied: `.width(800)` stored the number, `url()`
 * ignored it and returned the full-size original. No error, no warning — the
 * page just shipped a multi-megabyte image, which is the failure mode that
 * renders perfectly.
 *
 * The snap reads the injected `srcset` rather than a copy of the width ladder.
 * That matters: the srcset's URLs already carry the current config hash, so
 * they can't drift when `images.widths` changes. A second copy of the ladder
 * here would rot *silently*, because a stale hash serves the original.
 */

const ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

/** An image field value as `injectAssetUrls` leaves it. */
function injected(widths = [320, 640, 960, 1280, 1920]) {
	return {
		_type: 'image' as const,
		asset: {
			_type: 'reference' as const,
			_ref: ID,
			url: `/media/${ID}/original.png`,
			width: 2400,
			height: 1600,
			srcset: widths.map((w) => `/media/${ID}/w${w}-cfg1.webp ${w}w`).join(', ')
		}
	};
}

const urlFor = imageUrlBuilder();

describe('imageUrlBuilder width snapping', () => {
	it('returns the exact rung when the width is on the ladder', () => {
		expect(urlFor(injected()).width(640).url()).toBe(`/media/${ID}/w640-cfg1.webp`);
	});

	it('rounds up to the next rung for an off-ladder width', () => {
		// 333 is not generatable — requesting it from /media serves the original.
		// Rounding up rather than down: a downscaled rung would be upscaled by the
		// browser, which is a visible regression, where rounding up only costs bytes.
		expect(urlFor(injected()).width(333).url()).toBe(`/media/${ID}/w640-cfg1.webp`);
	});

	it('returns the widest rung when nothing covers the request', () => {
		expect(urlFor(injected()).width(5000).url()).toBe(`/media/${ID}/w1920-cfg1.webp`);
	});

	it('respects a ladder that stops below the defaults', () => {
		// `buildSrcset` drops rungs at or above the original's own width, so a
		// small asset's srcset is short. Reading the srcset means that per-asset
		// truncation is inherited for free; a copy of the config would not know.
		expect(
			urlFor(injected([320, 640]))
				.width(1600)
				.url()
		).toBe(`/media/${ID}/w640-cfg1.webp`);
	});

	it('returns the original when no width is requested', () => {
		expect(urlFor(injected()).url()).toBe(`/media/${ID}/original.png`);
	});

	it('converts a height request through the asset aspect ratio', () => {
		// 2400x1600 is 3:2, so 400px tall wants 600px wide → the 640 rung.
		expect(urlFor(injected()).height(400).url()).toBe(`/media/${ID}/w640-cfg1.webp`);
	});

	it('lets width win when both dimensions are given', () => {
		expect(urlFor(injected()).size(1000, 100).url()).toBe(`/media/${ID}/w1280-cfg1.webp`);
	});
});

describe('imageUrlBuilder fallbacks', () => {
	it('returns the original when the value carries no srcset', () => {
		// An SVG, an animated source, a disabled pipeline, or a value that never
		// went through injection. A smaller image simply does not exist.
		const noSrcset = {
			_type: 'image' as const,
			asset: { _type: 'reference' as const, _ref: ID, url: `/media/${ID}/logo.svg` }
		};
		expect(urlFor(noSrcset).width(320).url()).toBe(`/media/${ID}/logo.svg`);
	});

	it('ignores a height it cannot convert', () => {
		const noDimensions = {
			_type: 'image' as const,
			asset: {
				_type: 'reference' as const,
				_ref: ID,
				url: `/media/${ID}/original.png`,
				srcset: `/media/${ID}/w320-cfg1.webp 320w`
			}
		};
		expect(urlFor(noDimensions).height(200).url()).toBe(`/media/${ID}/original.png`);
	});

	it('survives a malformed srcset instead of throwing', () => {
		const broken = {
			_type: 'image' as const,
			asset: {
				_type: 'reference' as const,
				_ref: ID,
				url: `/media/${ID}/original.png`,
				srcset: 'not-a-srcset,,, 640w'
			}
		};
		expect(urlFor(broken).width(640).url()).toBe(`/media/${ID}/original.png`);
	});

	it('returns null for no source at all', () => {
		expect(urlFor(null).width(640).url()).toBeNull();
	});

	it('ignores a non-positive width rather than snapping to the smallest rung', () => {
		expect(urlFor(injected()).width(0).url()).toBe(`/media/${ID}/original.png`);
	});
});

describe('imageUrlBuilder deprecated no-ops', () => {
	it('does not let quality or format change the URL', () => {
		// Kept for source compatibility, but they cannot be honoured: quality is
		// hashed into the variant filename, and every derivative is WebP. The test
		// pins that they are inert rather than silently producing a broken URL.
		const withOptions = urlFor(injected()).width(640).quality(50).format('png').fit('cover').url();
		expect(withOptions).toBe(`/media/${ID}/w640-cfg1.webp`);
	});
});
