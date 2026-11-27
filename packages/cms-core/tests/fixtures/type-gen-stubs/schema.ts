// A schema that uses icons as values, as a site's does: a Lucide icon by name,
// and a call that wraps a component (a layout drawing for a `cards` list).
import { Newspaper } from '@lucide/svelte';
import Drawing from './Drawing.svelte';

const picture = (body: string) => (anchor: unknown, props: object) =>
	(Drawing as unknown as (a: unknown, p: object) => unknown)(anchor, { ...props, body });
const drawings: Record<string, string> = { grid: '<rect/>' };

export const schemaTypes = [
	{
		type: 'document',
		name: 'post',
		title: 'Post',
		icon: Newspaper,
		fields: [
			{
				name: 'layout',
				type: 'string',
				title: 'Layout',
				list: [
					{ title: 'Grid', value: 'grid', icon: picture(drawings.grid) },
					{ title: 'List', value: 'list', icon: drawings.list ? picture(drawings.list) : undefined }
				],
				options: { layout: 'cards' }
			}
		]
	}
];
