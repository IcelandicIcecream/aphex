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
	]
};

/** Code block — a language label and a code body. */
export const codeBlock: TypeReference = {
	type: 'codeBlock',
	title: 'Code Block',
	fields: [
		{ name: 'language', type: 'string', title: 'Language' },
		{ name: 'code', type: 'text', title: 'Code' }
	]
};
