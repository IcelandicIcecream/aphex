import { describe, expect, it } from 'vitest';
import type { Field } from '../types/schemas';
import { initialValueProblems, newArrayItem, withFreshKeys } from './item-initial-value';

let n = 0;
const key = () => `k${(n += 1)}`;

const fields: Field[] = [
	{
		name: 'variant',
		type: 'string',
		title: 'Layout',
		initialValue: 'below',
		list: [
			{ title: 'Beside', value: 'beside' },
			{ title: 'Below', value: 'below' }
		]
	},
	{ name: 'heading', type: 'string', title: 'Heading' },
	{ name: 'shown', type: 'boolean', title: 'Shown' },
	{
		name: 'items',
		type: 'array',
		title: 'Items',
		of: [{ type: 'object', name: 'item', fields: [{ name: 'q', type: 'string', title: 'Q' }] }]
	}
] as Field[];

describe('newArrayItem', () => {
	it('fills each field from its initialValue or an empty default, as before', async () => {
		const item = await newArrayItem('faq', { fields }, key);
		expect(item).toMatchObject({
			_type: 'faq',
			variant: 'below',
			heading: '',
			shown: false,
			items: []
		});
		expect(item._key).toBeTypeOf('string');
	});

	it("puts the type's own initialValue on top", async () => {
		const item = await newArrayItem(
			'faq',
			{ fields, initialValue: { variant: 'beside', heading: 'Questions' } },
			key
		);
		expect(item).toMatchObject({ variant: 'beside', heading: 'Questions', shown: false });
	});

	it('runs a function initialValue, sync or async, on the type and on a field', async () => {
		const withFunctions = [
			{ ...fields[1]!, initialValue: async () => 'From a field' },
			fields[2]!
		] as Field[];
		const item = await newArrayItem(
			'faq',
			{ fields: withFunctions, initialValue: () => ({ shown: true }) },
			key
		);
		expect(item).toMatchObject({ heading: 'From a field', shown: true });
	});

	it('keeps its own _type, and gives nested items fresh keys each time', async () => {
		const type = {
			fields,
			initialValue: { _type: 'other', items: [{ _type: 'item', _key: 'fixed', q: 'A question' }] }
		};
		const a = await newArrayItem('faq', type, key);
		const b = await newArrayItem('faq', type, key);
		expect(a._type).toBe('faq');
		const keyOf = (item: Record<string, unknown>) => (item.items as { _key: string }[])[0]!._key;
		expect(keyOf(a)).not.toBe('fixed');
		expect(keyOf(a)).not.toBe(keyOf(b));
		expect((a.items as { q: string }[])[0]!.q).toBe('A question');
	});

	it('never changes the starting value it was given', async () => {
		const start = { items: [{ _type: 'item', _key: 'fixed', q: 'A' }] };
		await newArrayItem('faq', { fields, initialValue: start }, key);
		expect(start.items[0]!._key).toBe('fixed');
	});
});

describe('withFreshKeys', () => {
	it('rekeys objects in arrays at any depth, and leaves strings in arrays alone', () => {
		const out = withFreshKeys(
			{ a: [{ _key: 'x', b: [{ _key: 'y' }] }], tags: ['one', 'two'] },
			key
		);
		expect(out.a[0]!._key).not.toBe('x');
		expect(out.a[0]!.b[0]!._key).not.toBe('y');
		expect(out.tags).toEqual(['one', 'two']);
	});
});

describe('initialValueProblems', () => {
	it('finds nothing wrong with a good starting value, or a function', () => {
		expect(
			initialValueProblems({
				fields,
				initialValue: { variant: 'beside', heading: 'Hi', _type: 'faq' }
			})
		).toEqual([]);
		expect(initialValueProblems({ fields, initialValue: () => ({ nope: 1 }) })).toEqual([]);
	});

	it('names a key that is not a field, and a choice the field does not offer', () => {
		const problems = initialValueProblems({
			fields,
			initialValue: { subheading: 'x', variant: 'sideways' }
		});
		expect(problems).toHaveLength(2);
		expect(problems[0]).toContain('"subheading"');
		expect(problems[1]).toContain('"sideways"');
	});
});
