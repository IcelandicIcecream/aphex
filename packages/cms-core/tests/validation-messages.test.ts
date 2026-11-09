import { describe, expect, it } from 'vitest';
import {
	humanizeValidationMessage,
	toFieldIssues,
	validateDocumentData
} from '../src/lib/field-validation/utils';
import type { SchemaType } from '../src/lib/types/schemas';

/**
 * What an editor reads when a document can't be saved or published.
 *
 * Runs the real validator and renders what it produces, because the failure being
 * prevented is an editor reading `Field "layout[0].items[1].question" Required` and
 * concluding the site is broken. Came from a client project's patch of 11.3.0.
 */
const faqBlock: SchemaType = {
	type: 'object',
	name: 'faqBlock',
	title: 'FAQ',
	fields: [
		{
			name: 'items',
			type: 'array',
			title: 'Questions',
			of: [
				{
					type: 'object',
					name: 'faqItem',
					title: 'Question',
					fields: [
						{
							name: 'question',
							type: 'string',
							title: 'Question text',
							validation: (Rule) => Rule.required()
						}
					]
				}
			]
		},
		{
			name: 'cta',
			type: 'object',
			title: 'Button',
			fields: [
				{
					name: 'links',
					type: 'array',
					title: 'Links',
					of: [
						{
							type: 'object',
							name: 'link',
							title: 'Link',
							fields: [
								{
									name: 'label',
									type: 'string',
									title: 'Label',
									validation: (Rule) => Rule.required()
								}
							]
						}
					]
				}
			]
		}
	]
};

const page: SchemaType = {
	type: 'document',
	name: 'page',
	title: 'Page',
	fields: [
		{ name: 'title', type: 'string', title: 'Title', validation: (Rule) => Rule.required() },
		{
			name: 'seo',
			type: 'object',
			title: 'SEO',
			fields: [
				{
					name: 'metaTitle',
					type: 'string',
					title: 'Meta title',
					validation: (Rule) => Rule.required()
				}
			]
		},
		{ name: 'layout', type: 'array', title: 'Layout', of: [{ type: 'faqBlock' }] }
	]
};

const schemas = [page, faqBlock];

/** Everything an editor would be told about this document. */
async function readErrors(data: Record<string, unknown>): Promise<string[]> {
	const { errors } = await validateDocumentData(page, data, { schemas });
	return errors.flatMap((issue) =>
		issue.errors.map((message: string) =>
			humanizeValidationMessage(message, {
				field: page.fields.find((f) => f.name === issue.field),
				fieldName: issue.field,
				value: data[issue.field],
				schemas,
				includeRoot: true
			})
		)
	);
}

const valid = { title: 'Home', seo: { metaTitle: 'Home' } };

describe('validation errors an editor reads', () => {
	it('names a required field inside an array inside a block', async () => {
		const errors = await readErrors({
			...valid,
			layout: [
				{
					_type: 'faqBlock',
					_key: 'a',
					items: [
						{ _type: 'faqItem', _key: 'b', question: 'Fine' },
						{ _type: 'faqItem', _key: 'c' }
					]
				}
			]
		});
		expect(errors).toEqual([
			'Layout › FAQ (item 1) › Questions › Question (item 2) › Question text: This is required.'
		]);
	});

	it('does not double-wrap an array inside an object', async () => {
		const errors = await readErrors({
			...valid,
			layout: [
				{
					_type: 'faqBlock',
					_key: 'a',
					cta: { links: [{ _type: 'link', _key: 'l' }] }
				}
			]
		});
		expect(errors).toEqual([
			'Layout › FAQ (item 1) › Button › Links › Link (item 1) › Label: This is required.'
		]);
	});

	it('names a required field inside a plain object', async () => {
		expect(await readErrors({ title: 'Home', seo: {} })).toEqual([
			'SEO › Meta title: This is required.'
		]);
	});

	it('never shows validator jargon', async () => {
		const errors = await readErrors({
			title: 42,
			seo: { metaTitle: 'x' },
			leftover: true,
			layout: [{ _key: 'no-type' }, { _type: 'retiredBlock', _key: 'old' }]
		});
		expect(errors.length).toBe(4);
		expect(errors.join('\n')).not.toMatch(/_type|_key|Field "|declared|expected|schema|\[\d+\]/);
	});

	it('drops the field title when the message sits under that field', () => {
		const field = page.fields[0];
		expect(humanizeValidationMessage('Field "title" Required', { field })).toBe(
			'This is required.'
		);
	});

	it("leaves a schema's own message alone", () => {
		expect(humanizeValidationMessage('Must be at most 60 characters')).toBe(
			'Must be at most 60 characters'
		);
	});
});

describe('structured publish errors', () => {
	it('gives each nested failure its own path', async () => {
		const { errors } = await validateDocumentData(
			page,
			{
				title: 'Home',
				seo: {},
				layout: [{ _type: 'faqBlock', _key: 'a', items: [{ _type: 'faqItem', _key: 'b' }] }]
			},
			{ schemas }
		);
		expect(toFieldIssues(errors)).toEqual([
			{ field: 'seo', path: 'seo.metaTitle', errors: ['Required'], kind: 'content' },
			{
				field: 'layout',
				path: 'layout[0].items[0].question',
				errors: ['Required'],
				kind: 'content'
			}
		]);
	});
});
