import type { TypeReference } from '@aphexcms/cms-core';

/**
 * Shared block-level types for Portable Text (`array` `of` entries).
 *
 * These were previously copy-pasted into every document type's block content,
 * which let them drift (e.g. one `callout` got a `tone` dropdown, the others
 * stayed a plain input). Define each block once here and spread it into a
 * document's `of: [...]` so a change lands everywhere at once.
 */

/** Callout / admonition block — a toned box with body text. */
export const callout: TypeReference = {
	type: 'callout',
	title: 'Callout',
	fields: [
		{
			name: 'tone',
			type: 'string',
			title: 'Tone',
			description: 'info, warning, or error',
			options: { layout: 'dropdown' },
			list: [
				{ title: 'Info', value: 'info' },
				{ title: 'Warning', value: 'warning' },
				{ title: 'Error', value: 'error' }
			]
		},
		{ name: 'text', type: 'text', title: 'Text' }
	],
	preview: { select: { subtitle: 'text' } }
};

/** Code block — a language label and a code body. */
export const codeBlock: TypeReference = {
	type: 'codeBlock',
	title: 'Code Block',
	fields: [
		{ name: 'language', type: 'string', title: 'Language' },
		{ name: 'code', type: 'text', title: 'Code' }
	],
	preview: { select: { subtitle: 'language' } }
};

/**
 * Embed — any provider's `<iframe>` snippet (YouTube, Vimeo, Spotify, Maps, CodePen…).
 *
 * We take the *embed code* rather than a plain URL on purpose: the snippet's `src` is
 * already an embeddable URL, so this works for every provider with no per-provider
 * logic and no oEmbed round-trip. The renderer never injects the pasted HTML — it
 * extracts the `src` and emits its own iframe (see components/render/Embed.svelte).
 */
export const embed: TypeReference = {
	type: 'embed',
	title: 'Embed',
	fields: [
		{
			name: 'embedCode',
			type: 'text',
			title: 'Embed code',
			description:
				'Paste the <iframe> snippet from the provider (YouTube → Share → Embed). A direct embed URL also works.',
			validation: (Rule) => Rule.required()
		},
		{ name: 'caption', type: 'string', title: 'Caption' }
	],
	preview: { select: { subtitle: 'caption' } }
};

/** Divider — a section break. */
export const divider: TypeReference = {
	type: 'divider',
	title: 'Divider',
	fields: [
		{
			name: 'style',
			type: 'string',
			title: 'Style',
			options: { layout: 'dropdown' },
			list: [
				{ title: 'Line', value: 'line' },
				{ title: 'Dots', value: 'dots' }
			],
			initialValue: 'line'
		}
	],
	preview: { select: { subtitle: 'style' } }
};

/** Button — a call-to-action link. */
export const button: TypeReference = {
	type: 'button',
	title: 'Button',
	fields: [
		{
			name: 'label',
			type: 'string',
			title: 'Label',
			validation: (Rule) => Rule.required()
		},
		{ name: 'url', type: 'url', title: 'URL', validation: (Rule) => Rule.required() },
		{
			name: 'style',
			type: 'string',
			title: 'Style',
			options: { layout: 'dropdown' },
			list: [
				{ title: 'Primary', value: 'primary' },
				{ title: 'Secondary', value: 'secondary' }
			],
			initialValue: 'primary'
		},
		{
			name: 'align',
			type: 'string',
			title: 'Alignment',
			options: { layout: 'tabs' },
			list: [
				{ title: 'Left', value: 'left' },
				{ title: 'Center', value: 'center' },
				{ title: 'Right', value: 'right' }
			],
			initialValue: 'center'
		}
	],
	preview: { select: { title: 'label', subtitle: 'url' } }
};

/** Gallery — a grid of images. */
export const gallery: TypeReference = {
	type: 'gallery',
	title: 'Gallery',
	fields: [
		{
			name: 'images',
			type: 'array',
			title: 'Images',
			of: [{ type: 'image' }],
			validation: (Rule) => Rule.required()
		},
		{ name: 'caption', type: 'string', title: 'Caption' }
	],
	preview: { select: { subtitle: 'caption' } }
};

/** Toggle — a collapsible heading + body (renders as a native <details>/<summary>). */
export const toggle: TypeReference = {
	type: 'toggle',
	title: 'Toggle',
	fields: [
		{
			name: 'heading',
			type: 'string',
			title: 'Heading',
			description: 'The always-visible line people click to expand',
			validation: (Rule) => Rule.required()
		},
		{ name: 'content', type: 'text', title: 'Content', rows: 4 }
	],
	preview: { select: { title: 'heading', subtitle: 'content' } }
};
