import { describe, expect, it } from 'vitest';
import { validateDocumentData } from '../src/lib/field-validation/utils';
import type { SchemaType } from '../src/lib/types/schemas';

// A page-builder block referenced by name (`{ type: 'cta' }`) carries no `fields`
// of its own — they live on the registered schema. Before validation was handed
// the registry, every field inside such a block went unchecked on save and publish.
const cta: SchemaType = {
	type: 'object',
	name: 'cta',
	title: 'CTA',
	fields: [
		{ name: 'label', type: 'string', title: 'Label', validation: (Rule) => Rule.required() },
		{ name: 'href', type: 'url', title: 'Link' }
	]
};

const page: SchemaType = {
	type: 'document',
	name: 'page',
	title: 'Page',
	fields: [
		{ name: 'title', type: 'string', title: 'Title' },
		{ name: 'layout', type: 'array', title: 'Layout', of: [{ type: 'cta' }] }
	]
};

// Item errors are reported on the array field, one message per item path.
function messagesFor(result: Awaited<ReturnType<typeof validateDocumentData>>, field: string) {
	return result.errors.filter((e) => e.field === field).flatMap((e) => e.errors);
}

describe('array items of registered types', () => {
	it('validates block fields against the registered schema when given the registry', async () => {
		const result = await validateDocumentData(
			page,
			{ title: 'Home', layout: [{ _type: 'cta', _key: 'a', href: 'not a url' }] },
			{ schemas: [cta, page] }
		);

		expect(result.isValid).toBe(false);
		const messages = messagesFor(result, 'layout');
		expect(messages.some((m) => m.startsWith('Field "layout[0].label"'))).toBe(true);
		expect(messages.some((m) => m.startsWith('Field "layout[0].href"'))).toBe(true);
	});

	it('leaves block contents unchecked without a registry (nothing to check against)', async () => {
		const result = await validateDocumentData(page, {
			title: 'Home',
			layout: [{ _type: 'cta', _key: 'a', href: 'not a url' }]
		});

		expect(result.isValid).toBe(true);
	});

	it('tolerates keys from fields a registered block has since dropped', async () => {
		const result = await validateDocumentData(
			page,
			{ title: 'Home', layout: [{ _type: 'cta', _key: 'a', label: 'Go', legacyColor: 'red' }] },
			{ schemas: [cta, page] }
		);

		expect(result.isValid).toBe(true);
	});

	it('still rejects unknown keys on inline object items', async () => {
		const inline: SchemaType = {
			...page,
			fields: [
				{
					name: 'layout',
					type: 'array',
					title: 'Layout',
					of: [{ type: 'ctaInline', fields: cta.fields }]
				}
			]
		};
		const result = await validateDocumentData(
			inline,
			{ layout: [{ _type: 'ctaInline', _key: 'a', label: 'Go', legacyColor: 'red' }] },
			{ schemas: [cta] }
		);

		expect(result.isValid).toBe(false);
		expect(messagesFor(result, 'layout')[0]).toMatch(
			/^Field "layout\[0\]\.legacyColor" Unknown field/
		);
	});

	it('rejects an object item with no _type instead of guessing the single declared type', async () => {
		const result = await validateDocumentData(
			page,
			{ title: 'Home', layout: [{ _key: 'a', label: 'Go' }] },
			{ schemas: [cta, page] }
		);

		expect(result.isValid).toBe(false);
		expect(messagesFor(result, 'layout')[0]).toMatch(/^Field "layout\[0\]" is missing a "_type"/);
		expect(result.structuralErrors.map((e) => e.field)).toContain('layout');
	});

	it('still resolves primitive items of a single-type array by position', async () => {
		const tags: SchemaType = {
			...page,
			fields: [{ name: 'tags', type: 'array', title: 'Tags', of: [{ type: 'string' }] }]
		};
		const result = await validateDocumentData(tags, { tags: ['a', 'b'] });
		expect(result.isValid).toBe(true);
	});
});
