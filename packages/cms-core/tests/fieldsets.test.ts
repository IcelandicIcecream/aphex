import { describe, expect, it } from 'vitest';
import { filledCount, layoutFields } from '../src/lib/schema-utils/fieldsets';
import { validateSchemaReferences } from '../src/lib/schema-utils/validator';
import type { Field, SchemaType } from '../src/lib/types/schemas';

const f = (name: string, fieldset?: string): Field =>
	({ name, type: 'string', title: name, ...(fieldset ? { fieldset } : {}) }) as Field;

describe('layoutFields', () => {
	it('leaves fields alone when there are no fieldsets', () => {
		expect(layoutFields([f('a'), f('b')]).map((i) => i.kind)).toEqual(['field', 'field']);
	});

	it('puts each fieldset where its first field was, holding all of its fields', () => {
		const items = layoutFields(
			[f('a'), f('bg', 'colour'), f('font', 'type'), f('ink', 'colour'), f('z')],
			[
				{ name: 'colour', title: 'Colour' },
				{ name: 'type', title: 'Type' }
			]
		);
		expect(
			items.map((i) =>
				i.kind === 'field'
					? i.field.name
					: `${i.fieldset.name}:${i.fields.map((x) => x.name).join(',')}`
			)
		).toEqual(['a', 'colour:bg,ink', 'type:font', 'z']);
	});

	it('shows a field in an undeclared fieldset on its own rather than losing it', () => {
		const items = layoutFields([f('a', 'missing')], [{ name: 'other', title: 'Other' }]);
		expect(items).toEqual([{ kind: 'field', field: f('a', 'missing') }]);
	});
});

describe('filledCount', () => {
	it('counts set values, not empty strings, nulls or empty lists', () => {
		const fields = [f('a'), f('b'), f('c'), f('d'), f('e')];
		expect(filledCount(fields, { a: '#fff', b: '', c: null, d: [], e: false })).toBe(2);
	});
});

describe('schema validation', () => {
	const doc = (fields: Field[], fieldsets?: SchemaType['fieldsets']): SchemaType =>
		({ type: 'document', name: 'settings', title: 'Settings', fields, fieldsets }) as SchemaType;

	it('accepts declared fieldsets, at the top level and inside objects', () => {
		expect(() =>
			validateSchemaReferences([
				doc(
					[
						f('a', 'advanced'),
						{
							name: 'look',
							type: 'object',
							title: 'Look',
							fieldsets: [{ name: 'colour', title: 'Colour' }],
							fields: [f('bg', 'colour')]
						} as Field
					],
					[{ name: 'advanced', title: 'Advanced' }]
				)
			])
		).not.toThrow();
	});

	it('refuses a field in a fieldset that is not declared', () => {
		expect(() => validateSchemaReferences([doc([f('a', 'advnced')])])).toThrow(
			/unknown fieldset "advnced"/
		);
		expect(() =>
			validateSchemaReferences([
				doc([{ name: 'look', type: 'object', title: 'Look', fields: [f('bg', 'colour')] } as Field])
			])
		).toThrow(/"look" has a field in unknown fieldset "colour"/);
		expect(() =>
			validateSchemaReferences([
				doc([
					{
						name: 'hours',
						type: 'array',
						title: 'Hours',
						of: [{ type: 'object', name: 'row', fields: [f('opens', 'times')] }]
					} as Field
				])
			])
		).toThrow(/item "row" has a field in unknown fieldset "times"/);
	});
});

describe('tags layout', () => {
	const schema = (of: unknown[]): SchemaType => ({
		type: 'document',
		name: 'voice',
		title: 'Voice',
		fields: [
			{ name: 'words', type: 'array', of: of as never, options: { layout: 'tags' } } as Field
		]
	});

	it('accepts an array of strings', () => {
		expect(() => validateSchemaReferences([schema([{ type: 'string' }])])).not.toThrow();
	});

	it('refuses anything else at boot', () => {
		expect(() => validateSchemaReferences([schema([{ type: 'number' }])])).toThrow(/layout "tags"/);
		expect(() =>
			validateSchemaReferences([schema([{ type: 'string' }, { type: 'number' }])])
		).toThrow(/layout "tags"/);
	});
});
