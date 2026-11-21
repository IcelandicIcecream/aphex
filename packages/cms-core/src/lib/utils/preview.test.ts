import { describe, expect, it } from 'vitest';
import type { SchemaType } from '../types/schemas';
import { previewDepth, readPath, resolvePreviewMedia } from './preview';

const episode: SchemaType = {
	type: 'document',
	name: 'episode',
	title: 'Episode',
	fields: [
		{ name: 'title', type: 'string', title: 'Title' },
		{ name: 'voice', type: 'reference', title: 'Voice', to: [{ type: 'voice' }] }
	],
	preview: { select: { title: 'title', subtitle: 'voice.name' } }
};

describe('preview through a reference', () => {
	it('fetches the list at depth 1 when a selected path starts at a reference', () => {
		expect(previewDepth(episode)).toBe(1);
		expect(previewDepth({ ...episode, preview: { select: { title: 'title' } } })).toBe(0);
	});

	it('reads the resolved reference, which is the target document itself', () => {
		const row = {
			id: 'e1',
			title: 'Pilot',
			voice: { id: 'v1', name: 'Ada', _meta: { type: 'voice' } },
			_meta: { type: 'episode' }
		};
		expect(readPath(row, 'voice.name')).toBe('Ada');
	});

	it('reads nothing through a reference that stayed unresolved', () => {
		const row = { id: 'e1', voice: { _type: 'reference', _ref: 'v1' } };
		expect(readPath(row, 'voice.name')).toBeUndefined();
	});
});

describe('a custom block’s picture', () => {
	const photo = {
		_type: 'photo',
		_key: 'a',
		image: { _type: 'image', asset: { _type: 'reference', _ref: 'asset-1' } },
		caption: 'Our shop'
	};

	it('is its first image, with no preview config', () => {
		expect(resolvePreviewMedia(photo, { title: 'Photo' })).toBe('asset-1');
	});

	it('follows select.media', () => {
		const two = { ...photo, cover: { asset: { _ref: 'asset-2' } } };
		expect(resolvePreviewMedia(two, { preview: { select: { media: 'cover' } } })).toBe('asset-2');
	});

	it('follows prepare().media', () => {
		expect(
			resolvePreviewMedia(photo, {
				preview: { select: { image: 'image' }, prepare: (s) => ({ media: s.image as string }) }
			})
		).toBe('asset-1');
	});

	it('is null for a block without one', () => {
		expect(resolvePreviewMedia({ _type: 'callout', text: 'Hi' }, null)).toBeNull();
		expect(resolvePreviewMedia({ _type: 'photo', image: { asset: {} } }, null)).toBeNull();
	});
});
