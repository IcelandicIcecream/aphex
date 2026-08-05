import { defineType } from '@aphexcms/cms-core';

/**
 * Fixture for `hooks.beforeValidate`, written with `defineType` so the hook's
 * `data` argument is typed by self-reflection from the field list below.
 *
 * Exercises the three things a transform hook is for: deriving a value from
 * another field, normalising input, and stamping a default — and nothing else.
 * Hooks transform; they never reject (that's `validation`) and never react
 * (that's an event consumer).
 */
const hookedDoc = defineType({
	name: 'hookedDoc',
	title: 'Hooked Doc',
	type: 'document',
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title',
			validation: (Rule) => Rule.required()
		},
		// Derived from `title` when absent, so a create that omits it still
		// satisfies the required rule below — proving hooks run *before* validation.
		{
			name: 'slug',
			type: 'slug',
			title: 'Slug',
			validation: (Rule) => Rule.required()
		},
		{ name: 'shoutTitle', type: 'string', title: 'Shout Title' },
		{ name: 'stampedAt', type: 'string', title: 'Stamped At' }
	],
	hooks: {
		beforeValidate: [
			// Derive: fill the required slug from the title.
			async ({ data }) => {
				if (data.slug) return data;
				const derived = (data.title ?? '')
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-|-$/g, '');
				return { ...data, slug: derived };
			},
			// Normalise: a second hook, to prove they chain in order and each sees
			// the previous one's output.
			async ({ data }) => ({
				...data,
				shoutTitle: (data.title ?? '').toUpperCase()
			}),
			// Default: stamp a fixed marker (fixed, not `Date.now()`, so assertions
			// stay deterministic).
			async ({ data }) => ({ ...data, stampedAt: data.stampedAt ?? 'stamped' })
		]
	}
});

export default hookedDoc;
