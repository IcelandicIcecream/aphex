import { describe, expect, it } from 'vitest';
import { detectMimeType, validateFile } from '../src/lib/utils/mime-detect';
import { DEFAULT_ALLOWED_MIME_TYPES } from '../src/lib/utils/file-accept';

/** A header-shaped buffer: the 4-byte tag, then binary padding like a real table directory. */
const font = (tag: string | number[]) =>
	Buffer.concat([
		typeof tag === 'string' ? Buffer.from(tag, 'latin1') : Buffer.from(tag),
		Buffer.from([0x00, 0x0c, 0x00, 0x80, 0x00, 0x03, 0x00, 0x40, 0x4f, 0x53, 0x2f, 0x32])
	]);

const withFonts = ['font/woff2', 'font/woff', 'font/otf', 'font/ttf'];

describe('font detection', () => {
	it.each([
		['wOF2', 'brand.woff2', 'font/woff2'],
		['wOFF', 'brand.woff', 'font/woff'],
		['OTTO', 'brand.otf', 'font/otf'],
		[[0x00, 0x01, 0x00, 0x00], 'brand.ttf', 'font/ttf'],
		['ttcf', 'brand.ttc', 'font/collection']
	] as const)('recognizes %s', (tag, name, mime) => {
		expect(detectMimeType(font(tag as string | number[]), name)).toBe(mime);
	});

	it("trusts Apple's ASCII 'true' tag only for a font file name", () => {
		expect(detectMimeType(font('true'), 'legacy.ttf')).toBe('font/ttf');
		expect(detectMimeType(Buffer.from('true story, a plain note'), 'notes.txt')).toBeNull();
	});

	// The bug this guards: browsers often send fonts as application/octet-stream,
	// the route stored any unrecognized file as that, and so a font could never pass
	// an allow-list, even one that named font types.
	it('passes an allow-list naming fonts even when the browser sends octet-stream', () => {
		const result = validateFile(font('wOF2'), 'brand.woff2', 'application/octet-stream', {
			allowedMimeTypes: withFonts
		});
		expect(result).toMatchObject({ valid: true, detectedMimeType: 'font/woff2' });
	});

	it('passes the default list, which already names the web font types', () => {
		const result = validateFile(font('wOF2'), 'brand.woff2', 'application/octet-stream', {
			allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES
		});
		expect(result).toMatchObject({ valid: true, detectedMimeType: 'font/woff2' });
	});

	it('refuses a font uploaded as an image', () => {
		const result = validateFile(font('wOFF'), 'photo.png', 'image/png', {
			allowedMimeTypes: withFonts
		});
		expect(result.valid).toBe(false);
	});
});
