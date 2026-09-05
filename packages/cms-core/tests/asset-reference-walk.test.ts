import { describe, it, expect } from 'vitest';
import { collectAssetReferences } from '../src/lib/utils/asset-reference-walk';

const imageRef = (id: string) => ({
	_type: 'image' as const,
	asset: { _type: 'reference' as const, _ref: id }
});

const sorted = (data: unknown) =>
	collectAssetReferences(data).sort(
		(a, b) => a.fieldPath.localeCompare(b.fieldPath) || a.assetId.localeCompare(b.assetId)
	);

describe('collectAssetReferences', () => {
	it('finds a top-level image and names it by its field', () => {
		// The path is the *field*, not `coverImage.asset` — "Hero image" is what an
		// editor recognises; the inner wrapper key means nothing to them.
		expect(collectAssetReferences({ coverImage: imageRef('a1') })).toEqual([
			{ assetId: 'a1', fieldPath: 'coverImage' }
		]);
	});

	it('finds references nested in objects and arrays', () => {
		const doc = {
			seo: { ogImage: imageRef('a1') },
			gallery: { images: [imageRef('a2'), imageRef('a3')] }
		};
		expect(sorted(doc)).toEqual([
			{ assetId: 'a2', fieldPath: 'gallery.images[0]' },
			{ assetId: 'a3', fieldPath: 'gallery.images[1]' },
			{ assetId: 'a1', fieldPath: 'seo.ogImage' }
		]);
	});

	it('finds images embedded in portable text blocks', () => {
		// Rich text is an array of blocks, and an image block is a sibling of the
		// text blocks — the most common place an asset actually lives.
		const doc = {
			content: [
				{ _type: 'block', _key: 'k1', children: [{ _type: 'span', text: 'hello' }] },
				{ ...imageRef('a1'), _key: 'k2' },
				{ _type: 'callout', _key: 'k3', media: imageRef('a2') }
			]
		};
		expect(sorted(doc)).toEqual([
			{ assetId: 'a1', fieldPath: 'content[1]' },
			{ assetId: 'a2', fieldPath: 'content[2].media' }
		]);
	});

	it('treats file references the same as images', () => {
		const doc = { attachment: { _type: 'file', asset: { _type: 'reference', _ref: 'f1' } } };
		expect(collectAssetReferences(doc)).toEqual([{ assetId: 'f1', fieldPath: 'attachment' }]);
	});

	it('ignores document references', () => {
		// These point at the documents table and belong to reference-walk.ts. A
		// document id recorded as an asset id would make a document look like a
		// missing asset — and would keep a real asset from ever reading as unused.
		const doc = {
			author: { _type: 'reference', _ref: 'doc-1' },
			tags: [{ _type: 'reference', _ref: 'doc-2' }],
			coverImage: imageRef('a1')
		};
		expect(collectAssetReferences(doc)).toEqual([{ assetId: 'a1', fieldPath: 'coverImage' }]);
	});

	it('does not descend into a document reference looking for assets', () => {
		// An injected/denormalised reference could carry a resolved copy of the
		// target document. Walking into it would attribute the *target's* assets to
		// the referring document.
		const doc = {
			author: {
				_type: 'reference',
				_ref: 'doc-1',
				avatar: imageRef('should-not-be-found')
			}
		};
		expect(collectAssetReferences(doc)).toEqual([]);
	});

	it('records the same asset once per distinct field, and only once per field', () => {
		const doc = { coverImage: imageRef('a1'), seo: { ogImage: imageRef('a1') } };
		expect(sorted(doc)).toEqual([
			{ assetId: 'a1', fieldPath: 'coverImage' },
			{ assetId: 'a1', fieldPath: 'seo.ogImage' }
		]);
	});

	it('ignores malformed and empty references rather than recording junk', () => {
		// A half-written image field must not produce a row pointing at nothing —
		// an index entry with an empty asset id would make that asset unfindable
		// and could keep a real one pinned as "in use".
		const doc = {
			a: { _type: 'image' },
			b: { _type: 'image', asset: null },
			c: { _type: 'image', asset: { _type: 'reference' } },
			d: { _type: 'image', asset: { _type: 'reference', _ref: '' } },
			e: { _type: 'image', asset: { _type: 'notAReference', _ref: 'x' } }
		};
		expect(collectAssetReferences(doc)).toEqual([]);
	});

	it('handles empty and non-object input', () => {
		expect(collectAssetReferences(null)).toEqual([]);
		expect(collectAssetReferences(undefined)).toEqual([]);
		expect(collectAssetReferences('a string')).toEqual([]);
		expect(collectAssetReferences({})).toEqual([]);
		expect(collectAssetReferences([])).toEqual([]);
	});

	it('finds assets nested below an image node', () => {
		// An image object can carry its own fields, and a custom block may embed
		// further media under one.
		const doc = { hero: { ...imageRef('a1'), fallback: imageRef('a2') } };
		expect(sorted(doc)).toEqual([
			{ assetId: 'a1', fieldPath: 'hero' },
			{ assetId: 'a2', fieldPath: 'hero.fallback' }
		]);
	});
});
