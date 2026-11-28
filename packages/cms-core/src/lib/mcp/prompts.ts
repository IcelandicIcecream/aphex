// Prompts an MCP client offers its user as ready-made requests: Claude lists them in its
// "+" menu, so "Make my site" is one click instead of a paragraph to type. Each is a
// message the user sends as their own, filled from a few arguments the client asks for.
// Clients disagree on prompts (some never show them), so a prompt only starts a job:
// anything an agent must know belongs in the instructions or a guide, which every
// client reads.

import { z } from 'zod';
import type { McpInstructionsContext } from './instructions';

export interface McpPromptArgument {
	/** The argument's name: lowercase, like `website`. */
	name: string;
	/** Shown to the user when the client asks for it. */
	description: string;
	required?: boolean;
}

export interface McpPrompt {
	/** Lowercase letters, digits and dashes, like `make-my-site`. */
	name: string;
	title: string;
	/** One line saying what it does, shown beside it in the client. */
	description: string;
	arguments?: readonly McpPromptArgument[];
	/**
	 * The message the user sends, from the arguments they gave (missing optional ones are
	 * absent) and the site and caller. Return null to leave the prompt out for this caller.
	 */
	text: (
		args: Record<string, string | undefined>,
		context: McpInstructionsContext
	) => string | null | Promise<string | null>;
}

const NAME = /^[a-z0-9][a-z0-9-]*$/;
const ARGUMENT = /^[a-z][a-z0-9_]*$/;

/** Fails boot on a prompt a client couldn't ask for, or two with one name. */
export function validateMcpPrompts(prompts: readonly McpPrompt[] | undefined): void {
	const seen = new Set<string>();
	for (const prompt of prompts ?? []) {
		if (!NAME.test(prompt.name)) {
			throw new Error(
				`mcp.prompts: "${prompt.name}" isn't a valid prompt name (lowercase letters, digits and dashes).`
			);
		}
		if (seen.has(prompt.name))
			throw new Error(`mcp.prompts: two prompts are named "${prompt.name}".`);
		seen.add(prompt.name);
		for (const argument of prompt.arguments ?? []) {
			if (!ARGUMENT.test(argument.name)) {
				throw new Error(
					`mcp.prompts: "${prompt.name}" has an argument named "${argument.name}" (use lowercase letters, digits and underscores).`
				);
			}
		}
	}
}

/** A prompt's arguments as the SDK takes them: every one a string, optional unless required. */
export function promptArgsShape(prompt: McpPrompt): Record<string, z.ZodType<string | undefined>> {
	const shape: Record<string, z.ZodType<string | undefined>> = {};
	for (const argument of prompt.arguments ?? []) {
		const field = z.string().describe(argument.description);
		shape[argument.name] = argument.required ? field : field.optional();
	}
	return shape;
}
