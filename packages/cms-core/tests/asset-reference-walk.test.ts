import { describe, it, expect } from 'vitest';
import {
	collectAssetReferences,
	collectAssetIdsUnstructured
} from '../src/lib/utils/asset-reference-walk';

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

describe('rich-text image blocks', () => {
	// The shape RichtextField writes: the asset ref sits under `data`, not
	// directly on the node. Checking only `node.asset` missed it, and the
	// recursion that would have reached `data.asset` was turned back by the
	// `_type === 'reference'` guard — so every image in block content was absent
	// from the index while the delete guard's substring scan still found it.
	const blockContent = (assetId: string) => ({
		content: [
			{ _type: 'block', _key: 'a', children: [{ _type: 'span', text: 'hello' }] },
			{ _type: 'image', _key: 'b', data: { asset: { _type: 'reference', _ref: assetId } } }
		]
	});

	it('finds an image nested under a block node data key', () => {
		const refs = collectAssetReferences(blockContent('asset-1'));
		expect(refs).toEqual([{ assetId: 'asset-1', fieldPath: 'content[1]' }]);
	});

	it('still finds a plain image field', () => {
		const refs = collectAssetReferences({
			coverImage: { _type: 'image', asset: { _type: 'reference', _ref: 'asset-2' } }
		});
		expect(refs).toEqual([{ assetId: 'asset-2', fieldPath: 'coverImage' }]);
	});

	it('does not mistake a document reference for an asset reference', () => {
		const refs = collectAssetReferences({
			related: { _type: 'reference', _ref: 'some-document-id' }
		});
		expect(refs).toEqual([]);
	});

	it('finds both shapes in one document', () => {
		const refs = collectAssetReferences({
			...blockContent('asset-1'),
			coverImage: { _type: 'image', asset: { _type: 'reference', _ref: 'asset-2' } }
		});
		expect(refs.map((r) => r.assetId).sort()).toEqual(['asset-1', 'asset-2']);
	});
});

describe('collectAssetIdsUnstructured (the walker-gap detector)', () => {
	it('agrees with the walker on the shapes it models', () => {
		const data = {
			coverImage: { _type: 'image', asset: { _type: 'reference', _ref: 'a' } },
			content: [{ _type: 'image', _key: 'k', data: { asset: { _type: 'reference', _ref: 'b' } } }]
		};
		expect(collectAssetIdsUnstructured(data)).toEqual(
			new Set(collectAssetReferences(data).map((r) => r.assetId))
		);
	});

	it('sees an asset the walker would miss under an unknown wrapper', () => {
		// The detector's whole reason to exist: a shape nobody has taught the
		// walker yet is reachable here, so a rebuild reports it instead of the
		// asset silently reading as unused until someone tries to delete it.
		const data = { odd: { wrapper: { asset: { _type: 'reference', _ref: 'hidden' } } } };
		expect(collectAssetIdsUnstructured(data).has('hidden')).toBe(true);
	});

	it('ignores document references', () => {
		expect(collectAssetIdsUnstructured({ related: { _type: 'reference', _ref: 'doc' } }).size).toBe(
			0
		);
	});

	it('terminates on a cycle', () => {
		const data: Record<string, unknown> = {
			image: { _type: 'image', asset: { _type: 'reference', _ref: 'a' } }
		};
		data.self = data;
		expect(collectAssetIdsUnstructured(data)).toEqual(new Set(['a']));
	});
});
