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
	model: z.string().optional(),
	/** Present when the caller has a live document editor tab open — gates the
	 * `content_patch_fields`/`content_save_draft` workspace-bridge tools into the resolved
	 * tool list (see `mcp/tools.ts`'s `resolveAgentTools`). */
	documentContext: z.object({ collection: z.string(), id: z.string() }).optional(),
	/** Echoes back the change-set row created on the first leg of a turn that got paused for
	 * a workspace tool, so a resume request records against the same row instead of creating
	 * a new one per leg. */
	changeSetId: z.string().optional(),
	/** Token usage accumulated across a paused turn's earlier legs, summed with this leg's
	 * usage when the change-set is finally completed. */
	priorUsage: z.object({ promptTokens: z.number(), completionTokens: z.number() }).optional()
});

export type AgentChatRequest = z.infer<typeof agentChatRequest>;
