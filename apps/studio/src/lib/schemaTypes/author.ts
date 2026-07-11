import type { SchemaType } from '@aphexcms/cms-core';
import { UserRound } from '@lucide/svelte';
import { seoField } from '../plugins/seo/schema.js';

const author: SchemaType = {
	type: 'document',
	name: 'author',
	title: 'Author',
	description: 'A byline — the person a post is attributed to',
	icon: UserRound,
	groups: [
		{ name: 'profile', title: 'Profile', default: true },
		{ name: 'settings', title: 'Settings' }
	],
	preview: {
		select: {
			title: 'name',
			subtitle: 'role',
			media: 'avatar'
		}
	},
	previewUrl: (doc) => {
		const slug = doc.slug as string | undefined;
		return slug ? `/author/${slug}?aphex-preview=1` : null;
	},
	fields: [
		{
			name: 'name',
			type: 'string',
			title: 'Name',
			group: 'profile',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'slug',
			type: 'slug',
			title: 'Slug',
			source: 'name',
			group: 'settings',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'role',
			type: 'string',
			title: 'Role',
			description: 'e.g. Founder & Writer',
			group: 'profile'
		},
		{
			name: 'avatar',
			type: 'image',
			title: 'Avatar',
			description: 'Square profile photo',
			group: 'profile'
		},
		{
			name: 'bio',
			type: 'text',
			title: 'Bio',
			rows: 3,
			description: 'A short introduction shown on the author page',
			group: 'profile'
		},
		{
			name: 'links',
			type: 'array',
			title: 'Links',
			description: 'Social profiles and personal sites',
			group: 'profile',
			of: [
				{
					type: 'object',
					name: 'link',
					title: 'Link',
					fields: [
						{
							name: 'label',
							type: 'string',
							title: 'Label',
							description: 'e.g. Twitter, GitHub, Website'
						},
						{ name: 'url', type: 'url', title: 'URL' }
					]
				}
			]
		},
		{
			name: 'userId',
			type: 'string',
			title: 'Linked account (advanced)',
			description:
				'Optional. The CMS account this author writes as. Used to sync the byline and gate editing. Most editors can leave this blank.',
			group: 'settings'
		},
		seoField('settings')
	]
};

export default author;
