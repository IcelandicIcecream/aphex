import { describe, expect, it } from 'vitest';
import type { SchemaType } from '../types/schemas';
import {
	previewDepth,
	previewReferenceFields,
	readPath,
	resolvePreviewMedia,
	resolvePreviewSubtitle,
	resolvePreviewTitle,
	withPreviewReferences
} from './preview';

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

describe('previews through a reference', () => {
	const row = {
		type: 'object',
		name: 'menuDish',
		title: 'Dish',
		fields: [{ name: 'dish', type: 'reference', to: [{ type: 'dish' }] }],
		preview: { select: { title: 'dish.name', subtitle: 'dish.price' } }
	} as never;

	it('names the reference fields a preview reads through', () => {
		expect(previewReferenceFields(row)).toEqual(['dish']);
		expect(
			previewReferenceFields({ fields: [], preview: { select: { title: 'name' } } } as never)
		).toEqual([]);
	});

	it('reads the referenced document once it is loaded, and the type title until then', () => {
		const item = { _type: 'menuDish', dish: { _type: 'reference', _ref: 'd1' } };
		const docs = new Map([['d1', { id: 'd1', name: 'Burrata', price: '$18' }]]);
		const loaded = withPreviewReferences(item, ['dish'], docs);
		expect(resolvePreviewTitle(loaded, row)).toBe('Burrata');
		expect(resolvePreviewSubtitle(loaded, row)).toBe('$18');
		expect(resolvePreviewTitle(withPreviewReferences(item, ['dish'], new Map()), row)).toBe('Dish');
		expect(item.dish).toEqual({ _type: 'reference', _ref: 'd1' });
	});
});

describe('a listed value in a preview', () => {
	it('shows the option’s title, not the stored value', () => {
		const hero = {
			title: 'Hero',
			fields: [
				{
					name: 'variant',
					type: 'string',
					list: [{ title: 'Full bleed', value: 'fullBleed' }, 'plain']
				}
			],
			preview: { select: { title: 'heading', subtitle: 'variant' } }
		} as never;
		expect(resolvePreviewSubtitle({ variant: 'fullBleed' }, hero)).toBe('Full bleed');
		expect(resolvePreviewSubtitle({ variant: 'plain' }, hero)).toBe('plain');
		expect(resolvePreviewSubtitle({ variant: 'gone' }, hero)).toBe('gone');
	});
});
