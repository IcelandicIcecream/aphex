import { describe, expect, it } from 'vitest';
import type { SchemaType } from '@aphexcms/cms-core';
import {
	auditDocument,
	issueCounts,
	markDuplicates,
	placedImages,
	type AssetInfo
} from '../src/lib/audit';

const page: SchemaType = {
	type: 'document',
	name: 'page',
	title: 'Page',
	fields: [
		{ name: 'title', type: 'string', title: 'Title' },
		{ name: 'seo', type: 'object', title: 'SEO', fields: [] }
	]
};

const image = (ref: string, alt?: string) => ({
	_type: 'image',
	asset: { _type: 'reference', _ref: ref },
	alt
});
const assets = new Map<string, AssetInfo>([
	['wide', { alt: null, width: 1200, height: 630, isImage: true }],
	['small', { alt: null, width: 600, height: 315, isImage: true }],
	['square', { alt: null, width: 1600, height: 1600, isImage: true }],
	['described', { alt: 'A loaf on a board', width: 800, height: 600, isImage: true }],
	['pdf', { alt: null, width: null, height: null, isImage: false }]
]);
const goodSeo = {
	metaTitle: 'Sourdough classes in Fitzroy',
	metaDescription:
		'Learn to bake a proper sourdough loaf in three hours, flour and starter included, in our Fitzroy kitchen.',
	ogImage: image('wide')
};
const codes = (doc: Record<string, unknown>) =>
	auditDocument(doc, page, assets).issues.map((i) => i.code);

describe('auditDocument', () => {
	it('passes a page with everything in place', () => {
		const audit = auditDocument({ id: '1', title: 'Classes', seo: goodSeo }, page, assets);
		expect(audit).toMatchObject({
			status: 'good',
			issues: [],
			name: 'Classes',
			title: goodSeo.metaTitle
		});
	});

	it('calls a missing title or description an error', () => {
		const audit = auditDocument({ id: '1', seo: { ogImage: image('wide') } }, page, assets);
		expect(audit.status).toBe('error');
		expect(audit.issues.map((i) => i.code)).toEqual(['no-title', 'no-description']);
	});

	it('flags a title and a description Google cuts off', () => {
		expect(codes({ title: 'x', seo: { ...goodSeo, metaTitle: 'a'.repeat(61) } })).toEqual([
			'title-long'
		]);
		expect(codes({ title: 'x', seo: { ...goodSeo, metaDescription: 'a'.repeat(161) } })).toEqual([
			'description-long'
		]);
		expect(codes({ title: 'x', seo: { ...goodSeo, metaDescription: 'Too short.' } })).toEqual([
			'description-short'
		]);
	});

	it('checks the share image’s size and shape', () => {
		expect(codes({ seo: { ...goodSeo, ogImage: undefined } })).toEqual(['no-image']);
		expect(codes({ seo: { ...goodSeo, ogImage: image('small') } })).toEqual(['image-small']);
		expect(codes({ seo: { ...goodSeo, ogImage: image('square') } })).toEqual(['image-shape']);
	});

	it('falls back to the document’s own picture for the share image', () => {
		expect(
			codes({ seo: { ...goodSeo, ogImage: undefined }, coverImage: image('wide', 'Bread') })
		).toEqual([]);
	});

	it('counts placed pictures with no alt text, anywhere in the document', () => {
		const doc = {
			seo: goodSeo,
			blocks: [
				{ _type: 'hero', image: image('wide') },
				{
					_type: 'gallery',
					images: [image('wide', 'Our kitchen'), image('small'), image('described')]
				},
				{ _type: 'download', file: { _type: 'file', asset: { _ref: 'pdf' } } }
			]
		};
		const audit = auditDocument(doc, page, assets);
		expect(audit.issues).toEqual([
			{ code: 'missing-alt', severity: 'warning', message: '2 images without alt text' }
		]);
	});

	it('doesn’t count the share image as a placed picture', () => {
		expect(placedImages({ seo: { ogImage: image('wide') } })).toEqual([]);
	});

	it('marks a page hidden from search without calling it a problem', () => {
		const audit = auditDocument(
			{ title: 'Thanks', seo: { ...goodSeo, noIndex: true } },
			page,
			assets
		);
		expect(audit).toMatchObject({ hidden: true, status: 'good' });
	});
});

describe('markDuplicates', () => {
	const doc = (id: string, title: string, description: string, noIndex = false) =>
		auditDocument(
			{
				id,
				title: id,
				seo: { ...goodSeo, metaTitle: title, metaDescription: description, noIndex }
			},
			page,
			assets
		);

	it('flags both of a pair, naming the other', () => {
		const description = goodSeo.metaDescription;
		const [a, b, c] = markDuplicates([
			doc('a', 'Classes', description),
			doc('b', 'classes ', 'Another description long enough to pass the check, easily.'),
			doc('c', 'Other', description)
		]);
		expect(a.issues.map((i) => i.message)).toEqual([
			'Same title as “b”',
			'Same description as “c”'
		]);
		expect(b.issues.map((i) => i.code)).toEqual(['duplicate-title']);
		expect(c.issues.map((i) => i.code)).toEqual(['duplicate-description']);
	});

	it('ignores pages hidden from search', () => {
		const [a, b] = markDuplicates([
			doc('a', 'Same', goodSeo.metaDescription),
			doc('b', 'Same', goodSeo.metaDescription, true)
		]);
		expect(a.issues).toEqual([]);
		expect(b.issues).toEqual([]);
	});

	it('sums documents by issue, in order of importance', () => {
		const audits = [
			auditDocument({ seo: {} }, page, assets),
			auditDocument({ title: 'x', seo: { ...goodSeo, ogImage: undefined } }, page, assets)
		];
		expect(issueCounts(audits).map((g) => [g.code, g.count])).toEqual([
			['no-title', 1],
			['no-description', 1],
			['no-image', 2]
		]);
	});
});
