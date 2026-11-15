/**
 * Array items in the generated types and the OpenAPI write shapes.
 *
 * A page builder declares its blocks in place — `of: [{ type: 'hero', fields }]` —
 * and both generators used to miss that form: `hero` is neither a field type nor a
 * registered schema, so the type generator dropped it (typing the whole array
 * `unknown[]`) and the JSON Schema accepted anything for it. Separately, the JSON
 * Schema forbade the `_type` that validation requires on every object item.
 *
 * Run: pnpm -F @aphexcms/cms-core test
 */
import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { generateTypes } from '../src/lib/type-gen';
import { buildSchemaComponents } from '../src/lib/server/api/openapi/json-schema';
import type { SchemaType } from '../src/lib/types/schemas';

const schemas: SchemaType[] = [
	{
		type: 'object',
		name: 'address',
		title: 'Address',
		fields: [{ name: 'street', type: 'string', title: 'Street' }]
	},
	{
		type: 'document',
		name: 'page',
		title: 'Page',
		fields: [
			{ name: 'title', type: 'string', title: 'Title' },
			{
				name: 'blocks',
				type: 'array',
				title: 'Blocks',
				of: [
					{
						type: 'hero',
						title: 'Hero',
						fields: [
							{ name: 'heading', type: 'string', title: 'Heading' },
							{ name: 'form', type: 'reference', title: 'Form', to: [{ type: 'page' }] },
							{
								name: 'links',
								type: 'array',
								title: 'Links',
								of: [
									{
										type: 'object',
										name: 'linkItem',
										title: 'Link',
										fields: [{ name: 'label', type: 'string', title: 'Label' }]
									}
								]
							}
						]
					},
					{
						type: 'faq',
						title: 'FAQ',
						fields: [{ name: 'tags', type: 'array', title: 'Tags', of: [{ type: 'string' }] }]
					}
				]
			},
			{ name: 'addresses', type: 'array', title: 'Addresses', of: [{ type: 'address' }] }
		]
	}
] as SchemaType[];

describe('generateTypes: array items', () => {
	const output = generateTypes(schemas);

	it('types blocks declared in place instead of unknown[]', () => {
		expect(output).not.toMatch(/blocks\?: unknown\[\]/);
		expect(output).toContain(`_type: 'hero';`);
		expect(output).toContain(`_type: 'faq';`);
		expect(output).toContain('heading?: string;');
		expect(output).toContain('tags?: string[];');
	});

	it('tags nested inline objects and named object schemas with their stored _type', () => {
		expect(output).toContain(`_type: 'linkItem';`);
		expect(output).toContain(`(Address & { _type: 'address'; _key?: string })[]`);
	});

	it('emits a Resolved variant when only an inline block holds a reference', () => {
		expect(output).toContain('export interface PageResolved');
	});

	it('produces a file that parses', () => {
		const result = ts.transpileModule(output, {
			reportDiagnostics: true,
			compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
		});
		expect(result.diagnostics ?? []).toEqual([]);
	});
});

describe('buildSchemaComponents: array items', () => {
	const page = buildSchemaComponents(schemas).PageData as {
		properties: Record<string, { items: Record<string, unknown> }>;
	};

	it('describes each block declared in place, with its _type required', () => {
		const variants = page.properties.blocks.items.oneOf as Array<{
			properties: Record<string, unknown>;
			required: string[];
		}>;
		expect(variants).toHaveLength(2);
		expect(variants[0].properties._type).toEqual({ type: 'string', const: 'hero' });
		expect(variants[0].properties.heading).toBeDefined();
		expect(variants[0].required).toContain('_type');
		expect(variants[1].properties._type).toEqual({ type: 'string', const: 'faq' });
	});

	it('requires _type on named object items too', () => {
		const item = page.properties.addresses.items as { allOf: Array<Record<string, unknown>> };
		expect(item.allOf[0]).toEqual({ $ref: '#/components/schemas/Address' });
		expect(item.allOf[1].required).toEqual(['_type']);
	});

	it('allows underscore keys, which the validator skips, and nothing else undeclared', () => {
		expect(page).toMatchObject({ patternProperties: { '^_': {} }, additionalProperties: false });
	});
});
