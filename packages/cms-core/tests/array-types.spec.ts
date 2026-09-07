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
});
