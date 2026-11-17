// Guides an MCP client reads when it's on that job, like skills: the instructions sent
// on connecting list them in a line each, and `get_guide` returns one in full. Everything
// in the instructions fills the model's context on every connection whether it's needed
// or not, so the deep material (how to write a homepage, a restaurant's pages) lives
// here and costs nothing until it's asked for.

import { z } from 'zod';
import type { McpInstructionsContext } from './instructions';

export interface McpGuide {
	/** What `get_guide` is called with: lowercase, like `homepage` or `restaurant`. */
	name: string;
	title: string;
	/** One line saying when to read it, shown in the instructions. */
	description: string;
	/**
	 * Markdown. A function gets the site and caller, so a guide can fit the site's plan
	 * or business; returning null leaves the guide out for that caller.
	 */
	content: string | ((context: McpInstructionsContext) => string | null | Promise<string | null>);
}

const GUIDE_NAME = /^[a-z0-9][a-z0-9-]*$/;

/** Fails boot on a guide `get_guide` couldn't be asked for, or two with one name. */
export function validateMcpGuides(guides: readonly McpGuide[] | undefined): void {
	const seen = new Set<string>();
	for (const guide of guides ?? []) {
		if (!GUIDE_NAME.test(guide.name)) {
			throw new Error(
				`mcp.guides: "${guide.name}" isn't a valid guide name (lowercase letters, digits and dashes).`
			);
		}
		if (seen.has(guide.name)) throw new Error(`mcp.guides: two guides are named "${guide.name}".`);
		seen.add(guide.name);
	}
}

export interface ResolvedMcpGuide {
	name: string;
	title: string;
	description: string;
	text: string;
}

/** The guides this caller gets, with their text, in the order the app listed them. */
export async function resolveMcpGuides(
	guides: readonly McpGuide[] | undefined,
	context: McpInstructionsContext
): Promise<ResolvedMcpGuide[]> {
	const resolved: ResolvedMcpGuide[] = [];
	for (const { name, title, description, content } of guides ?? []) {
		const text = typeof content === 'function' ? await content(context) : content;
		if (text?.trim()) resolved.push({ name, title, description, text: text.trim() });
	}
	return resolved;
}

/** `get_guide`'s answer: the guide's text, or which names exist. */
export function readGuide(
	guides: readonly ResolvedMcpGuide[],
	name: string
): { text: string; isError?: boolean } {
	const guide = guides.find((g) => g.name === name.trim().toLowerCase());
	if (guide) return { text: `# ${guide.title}\n\n${guide.text}` };
	return {
		text: `No guide named "${name}". The guides are: ${guides.map((g) => g.name).join(', ')}.`,
		isError: true
	};
}

/** The instructions' list of guides: enough for a model to know which to read when. */
export function guidesSection(
	guides: ReadonlyArray<{ name: string; description: string }>
): string {
	const lines = guides.map((guide) => `- ${guide.name}: ${guide.description}`);
	return `## Guides

Read the guide for the job before you start it, with get_guide. They hold this site's detailed rules, and the result is better for following them.

${lines.join('\n')}`;
}

export const getGuideInput = { name: z.string().describe('The guide to read, as listed.') };
