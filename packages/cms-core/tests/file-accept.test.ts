import { describe, expect, it } from 'vitest';
import {
	DEFAULT_ALLOWED_MIME_TYPES,
	acceptedFileTypesInputValue,
	effectiveFileType,
	isAcceptedFileType,
	normalizeAcceptedFileTypes,
	resolveFieldAcceptedFileTypes,
	resolveGlobalAllowedMimeTypes,
	validateGlobalAllowedMimeTypes
} from '../src/lib/utils/file-accept';
import type { SchemaType } from '../src/lib/types/schemas';

const schema = {
	name: 'article',
	type: 'document',
	fields: [
		{ name: 'hero', type: 'image', accept: ['image/png', '.webp'] },
		{ name: 'photo', type: 'image' },
		{ name: 'attachment', type: 'file', accept: 'application/pdf,.docx' },
		{ name: 'anything', type: 'file' }
	]
} as SchemaType;

describe('accepted file types', () => {
	it('normalizes strings, arrays, comma lists, casing, and duplicates', () => {
		expect(normalizeAcceptedFileTypes([' IMAGE/PNG, .WebP ', 'image/png'])).toEqual([
			'image/png',
			'.webp'
		]);
		expect(acceptedFileTypesInputValue(['image/png', '.webp'])).toBe('image/png,.webp');
	});

	it('matches exact MIME types, MIME wildcards, and filename extensions', () => {
		expect(isAcceptedFileType('photo.png', 'image/png', ['image/png'])).toBe(true);
		expect(isAcceptedFileType('photo.jpeg', 'image/jpeg', ['image/*'])).toBe(true);
		expect(isAcceptedFileType('report.DOCX', '', ['.docx'])).toBe(true);
		expect(isAcceptedFileType('report.pdf', 'application/pdf', ['image/*', '.docx'])).toBe(false);
	});

	it('does not let a wildcard match a MIME prefix without the slash', () => {
		expect(isAcceptedFileType('payload.bin', 'imageevil/binary', ['image/*'])).toBe(false);
	});

	it('resolves field rules and applies the image default', () => {
		expect(resolveFieldAcceptedFileTypes(schema, 'hero')).toEqual(['image/png', '.webp']);
		expect(resolveFieldAcceptedFileTypes(schema, 'photo')).toEqual(['image/*']);
		expect(resolveFieldAcceptedFileTypes(schema, 'attachment')).toEqual([
			'application/pdf',
			'.docx'
		]);
		expect(resolveFieldAcceptedFileTypes(schema, 'anything')).toBeUndefined();
	});

	it('falls back to the extension only when the browser reported no type', () => {
		// Chrome/Firefox hand over HEIC with an empty type; Safari reports it properly.
		expect(effectiveFileType('IMG_0042.HEIC', '')).toBe('image/heic');
		expect(effectiveFileType('IMG_0042.heif', '')).toBe('image/heif');
		expect(effectiveFileType('IMG_0042.heic', 'image/heic')).toBe('image/heic');
		// A reported type always wins, even a surprising one — guessing over the top
		// of the browser is how a mislabelled file gets silently reclassified.
		expect(effectiveFileType('sneaky.heic', 'text/html')).toBe('text/html');
		// Unknown extensions stay empty rather than being invented.
		expect(effectiveFileType('export.csv', '')).toBe('');
		expect(effectiveFileType('noextension', '')).toBe('');
	});

	it('lets a typeless HEIC through an image-only field once mapped', () => {
		expect(isAcceptedFileType('IMG_0042.heic', '', ['image/*'])).toBe(false);
		expect(
			isAcceptedFileType('IMG_0042.heic', effectiveFileType('IMG_0042.heic', ''), ['image/*'])
		).toBe(true);
	});

	it('resolves and validates the global MIME policy', () => {
		expect(resolveGlobalAllowedMimeTypes({ config: {} })).toEqual(DEFAULT_ALLOWED_MIME_TYPES);
		expect(DEFAULT_ALLOWED_MIME_TYPES).toContain('application/pdf');
		expect(DEFAULT_ALLOWED_MIME_TYPES).toContain('text/csv');
		expect(DEFAULT_ALLOWED_MIME_TYPES).not.toContain('image/svg+xml');
		expect(
			resolveGlobalAllowedMimeTypes({
				config: { upload: { allowedMimeTypes: [' IMAGE/* ', 'application/pdf'] } }
			})
		).toEqual(['image/*', 'application/pdf']);
		expect(() => validateGlobalAllowedMimeTypes(['image/*', 'application/pdf'])).not.toThrow();
		expect(() => validateGlobalAllowedMimeTypes([])).toThrow('at least one');
		expect(() => validateGlobalAllowedMimeTypes(['.pdf'])).toThrow('filename extensions');
	});
});
