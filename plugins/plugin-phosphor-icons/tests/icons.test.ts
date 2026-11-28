import { describe, expect, it } from 'vitest';
import type { SchemaType } from '@aphexcms/cms-core';
import { resolveIcon, searchIcons } from '../src/lib/lookup';
import { expandIconTypes } from '../src/lib/schema';
import { ICON_INPUT } from '../src/lib/constants';

describe('searchIcons', () => {
	it('puts the exact name first, then names that start with it', async () => {
		const found = await searchIcons('coffee');
		expect(found[0]).toBe('coffee');
		expect(found).toContain('coffee-bean');
	});

	it('finds icons by meaning', async () => {
		expect(await searchIcons('cafe')).toContain('coffee');
	});

	it('needs every word', async () => {
		const found = await searchIcons('map pin');
		expect(found[0]).toBe('map-pin');
		expect(await searchIcons('zzzz nothing')).toEqual([]);
	});
});

describe('resolveIcon', () => {
	it('draws a name in a weight, two-tone with its shade', async () => {
		const regular = await resolveIcon({ name: 'coffee' });
		expect(regular?.weight).toBe('regular');
		expect(regular?.path).toMatch(/^M/);
		expect(regular?.shade).toBeUndefined();
		const duotone = await resolveIcon({ name: 'Coffee ', weight: 'duotone' });
		expect(duotone?.name).toBe('coffee');
		expect(duotone?.shade).toMatch(/^M/);
	});

	it('replaces a drawing that does not match its name', async () => {
		const value = await resolveIcon({ name: 'coffee', path: 'M0,0Z' });
		expect(value?.path).not.toBe('M0,0Z');
	});

	it('knows no made-up names', async () => {
		expect(await resolveIcon({ name: 'not-an-icon' })).toBeNull();
	});
});

describe('expandIconTypes', () => {
	const schemas = (): SchemaType[] => [
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
							type: 'object',
							name: 'feature',
							fields: [{ name: 'icon', type: 'icon', title: 'Icon', weight: 'bold' }]
						},
						{ type: 'card' }
					]
				}
			]
		},
		{
			type: 'object',
			name: 'card',
			title: 'Card',
			fields: [{ name: 'badge', type: 'icon', title: 'Badge' }]
		},
		{
			type: 'document',
			name: 'post',
			title: 'Post',
			fields: [{ name: 'title', type: 'string', title: 'Title' }]
		}
	];

	it('makes the field an object for the picker, keeping what was written', () => {
		const [page] = expandIconTypes(schemas());
		const blocks = page.fields[1];
		if (blocks.type !== 'array') throw new Error('expected an array');
		const icon = blocks.of[0].fields?.[0];
		expect(icon?.type).toBe('object');
		expect(icon?.input).toBe(ICON_INPUT);
		expect(icon?.title).toBe('Icon');
		expect(icon?.inputOptions).toEqual({ weight: 'bold' });
		expect(icon?.stega).toBe(false);
		expect(icon && 'weight' in icon).toBe(false);
	});

	it('hooks only document types holding icons, once however often it runs', () => {
		const once = expandIconTypes(schemas());
		const twice = expandIconTypes(once);
		expect(twice[0].hooks?.beforeValidate).toHaveLength(1);
		expect(twice[2].hooks).toBeUndefined();
	});

	it('fills drawings in on save, in inline and named members', async () => {
		const [page] = expandIconTypes(schemas());
		const hook = page.hooks?.beforeValidate?.[0];
		if (!hook) throw new Error('expected a hook');
		const data = await hook({
			operation: 'create',
			context: { organizationId: 'org' },
			data: {
				title: 'Home',
				blocks: [
					{ _key: 'a', _type: 'feature', icon: { name: 'coffee', weight: 'fill' } },
					{ _key: 'b', _type: 'card', badge: { name: 'star' } },
					{ _key: 'c', _type: 'feature', icon: { name: 'made-up' } }
				]
			}
		});
		const blocks = data.blocks;
		if (!Array.isArray(blocks)) throw new Error('expected blocks');
		expect(blocks[0].icon.path).toMatch(/^M/);
		expect(blocks[0].icon.weight).toBe('fill');
		expect(blocks[1].badge).toMatchObject({ name: 'star', weight: 'regular' });
		expect(blocks[2].icon).toEqual({ name: 'made-up' });
		expect(data.title).toBe('Home');
	});
});
