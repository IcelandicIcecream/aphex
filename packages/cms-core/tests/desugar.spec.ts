// `desugarFieldType` — the machinery behind `aphex/schema/transform` parts that
// desugar a custom field keyword (`{ type: 'color' }`) into a real field.
//
// The contract under test is *transparency*: a transform may define the expansion's
// shape, but must not silently change or drop anything the author declared. Each case
// below corresponds to a bug that shipped — fields rebuilt from a hand-picked subset
// lost `access` (turning a restricted field unrestricted), lost `validation`, and
// collapsed multiple groups; a later refactor dropped builder-derived widget options
// and the identity of unnamed array members.
//
// Uses a local builder rather than importing a real plugin: the plugins depend on
// cms-core, so testing through them here would invert the dependency.
import { describe, it, expect } from 'vitest';
import { desugarFieldType } from '../src/lib/schema-utils/desugar';
import type { Field, SchemaType } from '../src/lib/types/schemas';

/** Stand-in for `@aphexcms/plugin-color-picker`'s `color()`: owns shape only. */
const buildColor = (f: Field): Field =>
	({
		name: f.name,
		type: 'object',
		title: f.title ?? f.name,
		input: 'color',
		inputOptions: { alpha: (f as unknown as { alpha?: boolean }).alpha === true },
		fields: [{ name: 'hex', type: 'string', title: 'Hex' }]
	}) as unknown as Field;

const expand = (fields: unknown[]): any[] => {
	const schemas = [{ type: 'document', name: 'd', title: 'D', fields }] as unknown as SchemaType[];
	const out = desugarFieldType(schemas, {
		type: 'color',
		sugarKeys: ['alpha'],
		build: buildColor
	});
	return (out[0] as any).fields;
};

describe('desugarFieldType', () => {
	it('preserves access, validation and every group', () => {
		const [f] = expand([
			{
				name: 'brand',
				type: 'color',
				title: 'Brand',
				access: { read: ['admin'] },
				validation: (r: any) => r.required(),
				group: ['design', 'general']
			}
		]);

		expect(f.type).toBe('object');
		// The whole point: a restricted field must not come out unrestricted.
		expect(f.access).toEqual({ read: ['admin'] });
		expect(typeof f.validation).toBe('function');
		// ...and a multi-group field must not collapse to its first group.
		expect(f.group).toEqual(['design', 'general']);
	});

	it('carries through properties the builder never heard of', () => {
		// A transform must stay transparent to BaseField properties added later.
		const [f] = expand([{ name: 'brand', type: 'color', title: 'B', somethingNew: 42 }]);
		expect(f.somethingNew).toBe(42);
	});

	it('applies the builder shape and drops the sugar keyword', () => {
		const [f] = expand([{ name: 'brand', type: 'color', title: 'B', alpha: true }]);
		expect(f.type).toBe('object');
		expect(f.input).toBe('color');
		expect(f.fields.map((s: any) => s.name)).toEqual(['hex']);
		// `alpha` is sugar — it becomes inputOptions.alpha and must not survive.
		expect('alpha' in f).toBe(false);
	});

	it('merges builder-derived widget options with authored ones', () => {
		const [f] = expand([
			{
				name: 'brand',
				type: 'color',
				title: 'B',
				alpha: true,
				inputOptions: { swatches: ['#f00'] }
			}
		]);
		// Replacing rather than merging would silently discard `alpha`.
		expect(f.inputOptions).toEqual({ alpha: true, swatches: ['#f00'] });
	});

	it('lets authored options win key-by-key', () => {
		const [f] = expand([
			{ name: 'brand', type: 'color', title: 'B', alpha: true, inputOptions: { alpha: false } }
		]);
		expect(f.inputOptions).toEqual({ alpha: false });
	});

	it('lets an author override the default widget', () => {
		const [f] = expand([{ name: 'brand', type: 'color', title: 'B', input: 'my-picker' }]);
		expect(f.input).toBe('my-picker');
	});

	it('expands an unnamed array member without losing its identity', () => {
		const [palette] = expand([
			{ name: 'palette', type: 'array', title: 'P', of: [{ type: 'color' }] }
		]);
		const member = palette.of[0];

		expect(member.type).toBe('object');
		// A member names a type and carries no `name`; it must fall back to the sugar
		// keyword rather than becoming an anonymous object.
		expect(member.name).toBe('color');
		expect(member.input).toBe('color');
	});

	it('recurses into nested object fields', () => {
		const [wrapper] = expand([
			{
				name: 'theme',
				type: 'object',
				title: 'Theme',
				fields: [{ name: 'brand', type: 'color', title: 'B', access: { read: ['admin'] } }]
			}
		]);

		expect(wrapper.fields[0].type).toBe('object');
		expect(wrapper.fields[0].access).toEqual({ read: ['admin'] });
	});

	it('leaves unrelated fields untouched', () => {
		expect(expand([{ name: 'title', type: 'string', title: 'Title' }])[0]).toEqual({
			name: 'title',
			type: 'string',
			title: 'Title'
		});
	});
});
