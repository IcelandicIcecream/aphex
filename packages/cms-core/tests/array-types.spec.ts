import { describe, expect, it } from 'vitest';
import { getArrayTypes } from '../src/lib/schema-utils/utils';
import type { TypeReference } from '../src/lib/types/schemas';

describe('getArrayTypes', () => {
	it('preserves inline type icons and previews for the array add menu', () => {
		const icon = (() => null) as unknown as NonNullable<TypeReference['icon']>;
		const preview = { select: { title: 'label' } };

		const [type] = getArrayTypes([], {
			of: [
				{
					type: 'formEmail',
					title: 'Email',
					fields: [{ name: 'label', type: 'string', title: 'Label' }],
					icon,
					preview
				}
			]
		});

		expect(type).toMatchObject({ name: 'formEmail', title: 'Email', icon, preview });
	});

	it('carries descriptions for the insert menu, a reference overriding its schema', () => {
		const schemas = [
			{
				type: 'object' as const,
				name: 'hero',
				title: 'Hero',
				description: 'From the schema',
				fields: []
			},
			{
				type: 'object' as const,
				name: 'faq',
				title: 'FAQ',
				description: 'From the schema',
				fields: []
			}
		];
		const types = getArrayTypes(schemas, {
			of: [
				{ type: 'hero', description: 'For this array' },
				{ type: 'faq' },
				{ type: 'note', name: 'note', description: 'Inline', fields: [] }
			]
		});
		expect(types.map((t) => t.description)).toEqual([
			'For this array',
			'From the schema',
			'Inline'
		]);
		expect(schemas[0]!.description).toBe('From the schema');
	});
});
