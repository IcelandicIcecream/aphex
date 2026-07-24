import { z } from 'zod';

// The wire shape of one `AIMessage` the browser sends up — a subset of the full
// `AIMessage` interface (ai/interfaces/ai-provider.ts) validated at the HTTP boundary.
// `role: 'tool'`/assistant `toolCalls` round-trip through here because the browser is
// expected to replay the running conversation (including prior tool turns) on each
// request — this endpoint is stateless per call, not a persisted session (conversation
// persistence is a separate, not-yet-built piece).
export const agentChatMessageSchema = z.object({
	role: z.enum(['system', 'user', 'assistant', 'tool']),
	content: z.string(),
	toolCalls: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				arguments: z.record(z.string(), z.unknown())
			})
		)
		.optional(),
	toolCallId: z.string().optional()
});

export const agentChatRequest = z.object({
	messages: z.array(agentChatMessageSchema).min(1),
	/** Optional override of the instance's configured default model. */
	model: z.string().optional()
});

export type AgentChatRequest = z.infer<typeof agentChatRequest>;
