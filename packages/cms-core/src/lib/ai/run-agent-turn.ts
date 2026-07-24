// ai/run-agent-turn.ts
//
// The tool-calling loop that drives one agent turn to completion — the "runtime" half of sitting on top of the
// `AIProviderAdapter` port and the `ContentAgentTool` list `resolveAgentTools` (mcp/tools.ts)
// already resolves for MCP. Transport-agnostic: this function has no knowledge of HTTP/SSE —
// a route handler consumes the `AgentStreamEvent`s it yields and maps them onto the wire.

import { z } from 'zod';
import type {
	AIProviderAdapter,
	AIMessage,
	AIToolCall,
	AIToolSpec
} from './interfaces/ai-provider';
import type { AgentStreamEvent } from '../types/agent-stream';
import type { ContentAgentTool } from '../mcp/tools';
import type { AgentToolExecutionContext } from '../types/agent-tools';
import { hasCapability } from '../types/capabilities';

export interface RunAgentTurnOptions {
	aiProvider: AIProviderAdapter;
	model: string;
	messages: AIMessage[];
	/** The caller's resolved tool list — see `resolveAgentTools` in `mcp/tools.ts`. */
	tools: ContentAgentTool[];
	toolContext: AgentToolExecutionContext;
	maxTokens?: number;
	/** Safety cap on tool-calling round trips before the turn is force-stopped as an error. */
	maxToolRoundtrips?: number;
	signal?: AbortSignal;
}

const DEFAULT_MAX_TOOL_ROUNDTRIPS = 8;

function toToolSpec(tool: ContentAgentTool): AIToolSpec {
	return {
		name: tool.definition.name,
		description: tool.definition.description,
		parameters: z.toJSONSchema(tool.definition.inputSchema) as Record<string, unknown>
	};
}

/**
 * Streams one agent turn: sends `messages` to the model, executes any tool calls it
 * requests against `tools`, feeds the results back as `tool` messages, and repeats until
 * the model stops calling tools (or `maxToolRoundtrips` is hit — surfaced as an error
 * rather than looping forever against a model that won't stop calling tools).
 */
export async function* runAgentTurn(opts: RunAgentTurnOptions): AsyncIterable<AgentStreamEvent> {
	const messages = [...opts.messages];
	const toolsByName = new Map(opts.tools.map((t) => [t.definition.name, t]));
	const toolSpecs = opts.tools.map(toToolSpec);
	const maxRoundtrips = opts.maxToolRoundtrips ?? DEFAULT_MAX_TOOL_ROUNDTRIPS;
	let roundtrips = 0;

	for (;;) {
		let assistantText = '';
		const pendingToolCalls: AIToolCall[] = [];
		let finishReason: 'stop' | 'tool_calls' | 'length' | 'error' = 'stop';
		let erroredOut = false;

		for await (const event of opts.aiProvider.chatStream({
			model: opts.model,
			messages,
			tools: toolSpecs,
			maxTokens: opts.maxTokens,
			signal: opts.signal
		})) {
			switch (event.type) {
				case 'text':
					assistantText += event.delta;
					yield event;
					break;
				case 'toolCall':
					pendingToolCalls.push(event.toolCall);
					yield {
						type: 'toolCall',
						toolCallId: event.toolCall.id,
						name: event.toolCall.name,
						arguments: event.toolCall.arguments
					};
					break;
				case 'usage':
					yield event;
					break;
				case 'error':
					yield event;
					erroredOut = true;
					break;
				case 'done':
					finishReason = event.finishReason;
					break;
			}
		}

		if (erroredOut) {
			yield { type: 'done', finishReason: 'error' };
			return;
		}

		if (finishReason !== 'tool_calls' || pendingToolCalls.length === 0) {
			yield { type: 'done', finishReason };
			return;
		}

		if (++roundtrips > maxRoundtrips) {
			yield { type: 'error', message: `Stopped after ${maxRoundtrips} tool-calling round trips.` };
			yield { type: 'done', finishReason: 'error' };
			return;
		}

		messages.push({ role: 'assistant', content: assistantText, toolCalls: pendingToolCalls });

		for (const call of pendingToolCalls) {
			const tool = toolsByName.get(call.name);
			let success: boolean;
			let data: unknown;
			let error: string | undefined;

			if (!tool) {
				success = false;
				error = `Unknown tool: ${call.name}`;
			} else {
				// Defense in depth: `tools` is expected to already be filtered to this caller's
				// capabilities (see `resolveAgentTools`), but a tool must reject direct invocation
				// too — never rely on the advertisement filter alone (AgentToolDefinition's own
				// doc comment on `requiredCapabilities` is explicit about this).
				const requiredCaps = tool.definition.requiredCapabilities ?? [];
				const auth = opts.toolContext.context.auth;
				const authorized =
					requiredCaps.length === 0 ||
					(auth != null && requiredCaps.every((c) => hasCapability(auth, c)));

				if (!authorized) {
					success = false;
					error = `Forbidden: requires ${requiredCaps.join(', ')}`;
				} else {
					const parsed = tool.definition.inputSchema.safeParse(call.arguments);
					if (!parsed.success) {
						success = false;
						error = `Invalid arguments: ${parsed.error.message}`;
					} else {
						try {
							const result = await tool.execute(parsed.data, opts.toolContext);
							success = result.success;
							data = result.success ? result.data : undefined;
							error = result.success ? undefined : result.error;
						} catch (err) {
							success = false;
							error = err instanceof Error ? err.message : String(err);
						}
					}
				}
			}

			yield { type: 'toolResult', toolCallId: call.id, name: call.name, success, data, error };

			messages.push({
				role: 'tool',
				toolCallId: call.id,
				content: JSON.stringify(success ? (data ?? null) : { error })
			});
		}
	}
}
