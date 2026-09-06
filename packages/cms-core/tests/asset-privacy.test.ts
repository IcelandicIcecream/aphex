import { describe, it, expect } from 'vitest';
import {
	findFieldByPath,
	resolveFieldPrivacy,
	isAssetPrivate
} from '../src/lib/utils/asset-privacy';
import type { SchemaType } from '../src/lib/types/schemas';

const schema = {
	name: 'blog_post',
	type: 'document',
	fields: [
		{ name: 'title', type: 'string' },
		{ name: 'coverImage', type: 'image', private: true },
		{ name: 'openGraph', type: 'image' },
		{ name: 'contract', type: 'file', private: true },
		{ name: 'seo', type: 'object', fields: [{ name: 'ogImage', type: 'image', private: true }] }
	]
} as unknown as SchemaType;

describe('findFieldByPath', () => {
	it('finds a top-level field and one nested in an object', () => {
		expect(findFieldByPath(schema.fields!, 'coverImage')?.name).toBe('coverImage');
		expect(findFieldByPath(schema.fields!, 'seo.ogImage')?.name).toBe('ogImage');
	});

	it('returns null for a path that does not exist', () => {
		expect(findFieldByPath(schema.fields!, 'nope')).toBeNull();
		expect(findFieldByPath(schema.fields!, 'title.nested')).toBeNull();
	});
});

describe('resolveFieldPrivacy', () => {
	it('reads private from image and file fields', () => {
		expect(resolveFieldPrivacy(schema, 'coverImage')).toBe(true);
		expect(resolveFieldPrivacy(schema, 'contract')).toBe(true);
		expect(resolveFieldPrivacy(schema, 'seo.ogImage')).toBe(true);
		expect(resolveFieldPrivacy(schema, 'openGraph')).toBe(false);
	});

	it('returns null — not false — when it cannot answer', () => {
		// The distinction is the whole point: null means "unknown", and the caller
		// falls back to the stamped value rather than reading it as public.
		expect(resolveFieldPrivacy(schema, 'renamedAway')).toBeNull();
		expect(resolveFieldPrivacy(schema, 'title')).toBeNull(); // not an asset field
		expect(resolveFieldPrivacy(null, 'coverImage')).toBeNull();
		expect(resolveFieldPrivacy(schema, undefined)).toBeNull();
	});
});

describe('isAssetPrivate', () => {
	it('prefers the live schema, so toggling private applies at once', () => {
		expect(isAssetPrivate(true, undefined)).toEqual({ isPrivate: true, usedFallback: false });
		// Field says public now, even though it was private at upload.
		expect(isAssetPrivate(false, true)).toEqual({ isPrivate: false, usedFallback: false });
	});

	it('falls back to the stamped value when the field is gone', () => {
		// The rename case. Without this the asset would read as public.
		expect(isAssetPrivate(null, true)).toEqual({ isPrivate: true, usedFallback: true });
	});

	it('treats an asset with no information at all as public', () => {
		// Library uploads predating field context. Defaulting these to private
		// would make every existing asset inaccessible overnight.
		expect(isAssetPrivate(null, undefined)).toEqual({ isPrivate: false, usedFallback: false });
		expect(isAssetPrivate(null, false)).toEqual({ isPrivate: false, usedFallback: false });
	});
});
