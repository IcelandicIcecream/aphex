import { describe, expect, it } from 'vitest';
import {
	describeValue,
	inheritedValue,
	isEmptyValue,
	overriddenFields
} from '../src/lib/schema-utils/inherit';
import { validateSchemaReferences } from '../src/lib/schema-utils/validator';
import type { Field, SchemaType } from '../src/lib/types/schemas';

const STYLES: Record<string, { corners: string }> = {
	soft: { corners: 'soft' },
	bold: { corners: 'pill' }
};

const corners: Field = {
	name: 'corners',
	type: 'string',
	list: [
		{ title: 'Square', value: 'square' },
		{ title: 'Pill', value: 'pill' }
	],
	inherits: {
		from: 'the style',
		value: ({ documentData }) => STYLES[String(documentData.style)]?.corners
	}
};

describe('inheritedValue', () => {
	it('works out the value from the document', () => {
		const doc = { style: 'bold', look: {} };
		expect(inheritedValue(corners, doc.look, doc)).toBe('pill');
	});

	it('is undefined without `inherits`, for an empty result, or when the lookup throws', () => {
		expect(inheritedValue({ name: 'x', type: 'string' }, {}, {})).toBeUndefined();
		expect(inheritedValue(corners, {}, { style: 'missing' })).toBeUndefined();
		const broken: Field = {
			name: 'x',
			type: 'string',
			inherits: {
				from: 'x',
				value: () => {
					throw new Error('no');
				}
			}
		};
		expect(inheritedValue(broken, {}, {})).toBeUndefined();
	});
});

describe('describeValue', () => {
	it('names a choice by its title', () => {
		expect(describeValue(corners, 'pill')).toBe('Pill');
		expect(describeValue({ name: 'c', type: 'string' }, '#ff0000')).toBe('#ff0000');
		expect(describeValue(corners, '')).toBe('');
	});
});

describe('overriddenFields', () => {
	it('lists the fields set by hand over an inherited value', () => {
		const plain: Field = { name: 'note', type: 'string' };
		expect(
			overriddenFields([corners, plain], { corners: 'square', note: 'hi' }).map((f) => f.name)
		).toEqual(['corners']);
		expect(overriddenFields([corners], { corners: '' })).toEqual([]);
	});

	it('treats nothing, null, an empty string and an empty list as empty', () => {
		for (const value of [undefined, null, '', []]) expect(isEmptyValue(value)).toBe(true);
		for (const value of [0, false, 'a', [1]]) expect(isEmptyValue(value)).toBe(false);
	});
});

describe('validation', () => {
	it('refuses `inherits` on an object or an array at boot', () => {
		const schema: SchemaType = {
			type: 'document',
			name: 'site',
			title: 'Site',
			fields: [
				{
					name: 'look',
					type: 'object',
					fields: [],
					inherits: { from: 'x', value: () => ({}) }
				} as Field
			]
		};
		expect(() => validateSchemaReferences([schema])).toThrow(/inherits/);
	});
});
