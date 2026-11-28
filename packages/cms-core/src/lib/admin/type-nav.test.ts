import { describe, expect, it } from 'vitest';
import { withTypeGroups } from './type-nav';

const types = [
	{
		id: 'types:Content',
		label: 'Content',
		items: [{ href: '/admin?docType=page', label: 'Pages' }]
	},
	{
		id: 'types:Website',
		label: 'Website',
		items: [{ href: '/admin?docType=siteSettings', label: 'Site settings' }]
	}
];

describe('withTypeGroups', () => {
	it('puts the type groups where the app left a `types` slot', () => {
		const groups = withTypeGroups(
			[{ id: 'home', items: [] }, { id: 'types' }, { id: 'system', items: [] }],
			types
		);
		expect(groups.map((group) => group.id)).toEqual([
			'home',
			'types:Content',
			'types:Website',
			'system'
		]);
	});

	it('merges a type group into the app group with its id, types first', () => {
		const groups = withTypeGroups(
			[
				{ id: 'home', items: [] },
				{ id: 'types' },
				{ id: 'types:Website', items: [{ href: '/admin?view=media', label: 'Media' }] }
			],
			types
		);
		expect(groups.map((group) => group.id)).toEqual(['home', 'types:Content', 'types:Website']);
		const website = groups.find((group) => group.id === 'types:Website')!;
		expect(website.label).toBe('Website');
		expect(website.items?.map((item) => item.label)).toEqual(['Site settings', 'Media']);
	});
});
