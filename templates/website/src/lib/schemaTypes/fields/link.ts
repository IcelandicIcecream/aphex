import type { Field } from '@aphexcms/cms-core';

/**
 * The `link` field — one shape used everywhere a link is authored.
 *
 * This is the template's single most reused piece of schema: header nav, footer
 * nav, hero buttons and the CTA block all store the same object, so
 * `resolveHref()` (`$lib/utils/link.ts`) is the only place that ever has to know
 * how a link becomes a URL.
 *
 * A link is either **internal** (a reference to a `page` or `post`, so the URL
 * follows the document if its slug changes) or **external** (a literal URL).
 * `linkType` picks between them.
 *
 * `reference` and `url` toggle with `linkType` via `hidden`, so an editor only ever
 * sees the one that applies. `enabledBy` extends that: where the link is optional
 * and gated behind a checkbox (a content column's "Add a link"), pass the flag's
 * name and every link field hides until it's ticked.
 */

export interface LinkFieldOptions {
	/** Field name. Defaults to `link`. */
	name?: string;
	title?: string;
	/** Show the `appearance` picker (default/outline button styling). */
	appearances?: boolean;
	/** Drop the visible `label` — for places where the label comes from elsewhere. */
	disableLabel?: boolean;
	group?: string;
}

/**
 * Extra hide condition applied to every link field.
 *
 * Where a link is optional and gated by a sibling boolean, the checkbox should
 * actually *do* something in the editor rather than only being read by the
 * renderer — otherwise "Add a link" is unticked and five link controls still sit
 * underneath it.
 */
function gate(enabledBy: string | undefined, own: (sibling: Record<string, unknown>) => boolean) {
	return ({ siblingData }: { siblingData: Record<string, unknown> }) =>
		(enabledBy ? siblingData[enabledBy] !== true : false) || own(siblingData);
}

export function linkField(options: LinkFieldOptions = {}): Field {
	const {
		name = 'link',
		title = 'Link',
		appearances = false,
		disableLabel = false,
		group
	} = options;

	return {
		name,
		type: 'object',
		title,
		...(group ? { group } : {}),
		fields: linkFields({ appearances, disableLabel })
	};
}

/** The link object's own fields, for embedding directly in an array item. */
export function linkFields({
	appearances = false,
	disableLabel = false,
	enabledBy
}: {
	appearances?: boolean;
	disableLabel?: boolean;
	/**
	 * Name of a sibling boolean that turns the whole link on. When set, every field
	 * below hides until that flag is ticked.
	 */
	enabledBy?: string;
} = {}): Field[] {
	const fields: Field[] = [
		{
			// `linkType`, not `type`: `type` is a reserved document column in Aphex,
			// and a schema that shadows one is rejected at startup.
			name: 'linkType',
			type: 'string',
			title: 'Link type',
			initialValue: 'reference',
			list: [
				{ title: 'Internal link', value: 'reference' },
				{ title: 'Custom URL', value: 'custom' }
			],
			options: { layout: 'tabs' },
			...(enabledBy ? { hidden: gate(enabledBy, () => false) } : {})
		}
	];

	if (!disableLabel) {
		fields.push({
			// Deliberately NOT required. These fields are spread into places where
			// the link itself is optional — a content column that has `enableLink`
			// off, an array row an editor has just added and not filled in yet — and
			// a required label there fails the whole document's validation over a
			// link nobody asked for. `resolveLabel()` falls back to the referenced
			// document's own title, so an empty label is usually the right default
			// rather than an omission.
			name: 'label',
			type: 'string',
			title: 'Label',
			description: 'The text people click. Defaults to the linked document’s title.',
			...(enabledBy ? { hidden: gate(enabledBy, () => false) } : {})
		});
	}

	fields.push(
		{
			name: 'reference',
			type: 'reference',
			title: 'Document to link to',
			to: [{ type: 'page' }, { type: 'post' }],
			// Only shown for an internal link. `siblingData`, not `documentData`:
			// these fields are spread into array rows (nav items, CTA buttons), and
			// each row has to answer for itself rather than follow the first one.
			hidden: gate(enabledBy, (siblingData) => siblingData.linkType !== 'reference')
		},
		{
			// `string`, not `url`: the `url` field type requires an absolute URL, and
			// half the custom links on a site are site-relative paths — `/posts`,
			// `/search`, `#pricing`. Payload's link field uses a plain text field for
			// the same reason. Validation still rejects the obviously wrong shapes.
			name: 'url',
			type: 'string',
			title: 'Custom URL',
			description: 'An absolute URL (https://…), a site path (/posts), or an anchor (#section).',
			placeholder: '/posts',
			hidden: gate(enabledBy, (siblingData) => siblingData.linkType !== 'custom'),
			validation: (Rule) =>
				Rule.custom((value) => {
					if (typeof value !== 'string' || value.trim() === '') return true;
					const url = value.trim();
					if (/^(https?:\/\/|mailto:|tel:)/.test(url)) return true;
					if (url.startsWith('/') || url.startsWith('#')) return true;
					return 'Use an absolute URL (https://…), a site path (/about) or an anchor (#section)';
				})
		},
		{
			name: 'newTab',
			type: 'boolean',
			title: 'Open in new tab',
			...(enabledBy ? { hidden: gate(enabledBy, () => false) } : {})
		}
	);

	if (appearances) {
		fields.push({
			name: 'appearance',
			type: 'string',
			title: 'Appearance',
			description: 'How the link is rendered.',
			initialValue: 'default',
			list: [
				{ title: 'Button', value: 'default' },
				{ title: 'Outline', value: 'outline' },
				{ title: 'Plain link', value: 'link' }
			],
			options: { layout: 'dropdown' },
			...(enabledBy ? { hidden: gate(enabledBy, () => false) } : {})
		});
	}

	return fields;
}

/**
 * An array of links — the hero's buttons, the CTA's buttons, a nav's items.
 *
 * The link's fields are inlined into the array item rather than nested under a
 * `link` key: one less level to click through in the editor, and one less level
 * to reach through when rendering.
 */
export function linkGroupField(
	options: {
		name?: string;
		title?: string;
		description?: string;
		appearances?: boolean;
		group?: string;
	} = {}
): Field {
	const { name = 'links', title = 'Links', description, appearances = true, group } = options;

	return {
		name,
		type: 'array',
		title,
		...(description ? { description } : {}),
		...(group ? { group } : {}),
		of: [
			{
				type: 'object',
				name: 'linkItem',
				title: 'Link',
				fields: linkFields({ appearances }),
				preview: { select: { title: 'label', subtitle: 'url' } }
			}
		]
	};
}
