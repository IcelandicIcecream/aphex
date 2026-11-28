import type { McpPrompt } from '@aphexcms/cms-core/server';

/**
 * Ready-made requests an AI client offers its user (Claude lists them in its "+"
 * menu). Each becomes a message the user sends. Some clients never show prompts, so
 * anything an AI must know goes in the instructions or a guide, never only here.
 */
export const sitePrompts: McpPrompt[] = [
	{
		name: 'make-my-site',
		title: 'Make my site',
		description: 'Build the whole website from what you know about the business.',
		arguments: [
			{ name: 'website', description: 'Your current website or social page, if you have one' },
			{ name: 'notes', description: 'What you do, who for, and what visitors should do' }
		],
		text: (args, { organization }) =>
			[
				`Make the website for ${organization.name} with the Aphex connector. Read its make-my-site guide first and follow it to the end.`,
				args.website ? `Our current website is ${args.website}.` : '',
				args.notes ? `About us: ${args.notes}` : ''
			]
				.filter(Boolean)
				.join(' ')
	},
	{
		name: 'write-a-post',
		title: 'Write a blog post',
		description: 'Draft a blog post on a topic.',
		arguments: [{ name: 'topic', description: 'What the post is about', required: true }],
		text: (args) =>
			`Write a blog post about ${args.topic} with the Aphex connector. Read its blog and copywriting guides first, and save it as a draft.`
	}
];
