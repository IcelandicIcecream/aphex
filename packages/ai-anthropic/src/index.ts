import Anthropic from '@anthropic-ai/sdk';
import type {
	AIProviderAdapter,
	AIChatRequest,
	AIFinishReason,
	AIStreamEvent,
	AIMessage,
	AIToolSpec,
	AIToolCall
} from '@aphexcms/cms-core/server';

type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface AnthropicAdapterConfig {
	apiKey: string;
	baseURL?: string;
	/**
	 * How hard the model works on each response: depth of reasoning and token spend.
	 * Leave it out for the model's own default.
	 */
	effort?: Effort;
	/**
	 * Models to retry on, in order, when the requested one declines a request for
	 * policy reasons, e.g. `['claude-opus-4-8']` behind `claude-opus-5-5`. The retry
	 * happens inside the same call. Leave it out to stop on a refusal instead.
	 */
	fallbackModels?: string[];
}

/**
 * Anthropic requires `max_tokens`. Current models reason before answering and that
 * counts towards it, so a small cap cuts responses off mid-thought. Streaming means
 * a large cap can't hit a request timeout.
 */
const DEFAULT_MAX_TOKENS = 64_000;

const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

/** What an assistant message's `providerState` holds when this adapter wrote it. */
interface AnthropicState {
	provider: 'anthropic';
	/** The response's content blocks, exactly as returned, to resend unchanged. */
	content: Anthropic.Beta.BetaContentBlockParam[];
}

/**
 * Blocks a response may carry that are safe to resend. The model's reasoning
 * (`thinking`, `redacted_thinking`) must be resent unchanged with its tool calls, or
 * the next request fails; a `fallback` block marks where a fallback model took over.
 */
const REPLAYABLE = new Set(['text', 'thinking', 'redacted_thinking', 'tool_use', 'fallback']);

function stateFrom(content: Anthropic.Beta.BetaContentBlock[]): AnthropicState | undefined {
	if (!content.every((block) => REPLAYABLE.has(block.type))) return undefined;
	return { provider: 'anthropic', content: content as Anthropic.Beta.BetaContentBlockParam[] };
}

/**
 * The stored blocks for an assistant message, if they're this adapter's and match the
 * message. `providerState` round-trips through the browser, so it's checked: only
 * known block types, and the same tool calls, in the same order, as the message says.
 */
export function replayableContent(
	message: AIMessage
): Anthropic.Beta.BetaContentBlockParam[] | undefined {
	const state = message.providerState as Partial<AnthropicState> | undefined;
	if (!state || state.provider !== 'anthropic' || !Array.isArray(state.content)) return undefined;
	const blocks = state.content as Array<{ type?: unknown; id?: unknown }>;
	if (!blocks.every((block) => block && REPLAYABLE.has(String(block.type)))) return undefined;
	const storedCalls = blocks.filter((block) => block.type === 'tool_use').map((block) => block.id);
	const calls = (message.toolCalls ?? []).map((call) => call.id);
	if (storedCalls.length !== calls.length || storedCalls.some((id, i) => id !== calls[i])) {
		return undefined;
	}
	return state.content;
}

/**
 * Anthropic has no `system` role message (it's a separate top-level param) and no `tool`
 * role: a tool result is a `tool_result` block in a user message. One round's results
 * go back in one user message, as the API expects.
 */
export function toAnthropicMessages(messages: AIMessage[]): {
	system: string | undefined;
	messages: Anthropic.Beta.BetaMessageParam[];
} {
	const systemParts: string[] = [];
	const out: Anthropic.Beta.BetaMessageParam[] = [];

	for (const m of messages) {
		if (m.role === 'system') {
			systemParts.push(m.content);
			continue;
		}
		if (m.role === 'tool') {
			const result: Anthropic.Beta.BetaToolResultBlockParam = {
				type: 'tool_result',
				tool_use_id: m.toolCallId ?? '',
				content: m.content
			};
			const previous = out.at(-1);
			const previousIsResults =
				previous?.role === 'user' &&
				Array.isArray(previous.content) &&
				previous.content.every((block) => block.type === 'tool_result');
			if (previousIsResults)
				(previous.content as Anthropic.Beta.BetaContentBlockParam[]).push(result);
			else out.push({ role: 'user', content: [result] });
			continue;
		}
		if (m.role === 'assistant') {
			const stored = replayableContent(m);
			if (stored) {
				out.push({ role: 'assistant', content: stored });
				continue;
			}
			if (m.toolCalls?.length) {
				const content: Anthropic.Beta.BetaContentBlockParam[] = [];
				if (m.content) content.push({ type: 'text', text: m.content });
				for (const tc of m.toolCalls) {
					content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments });
				}
				out.push({ role: 'assistant', content });
				continue;
			}
		}
		out.push({ role: m.role, content: m.content });
	}

	return { system: systemParts.length ? systemParts.join('\n\n') : undefined, messages: out };
}

function toAnthropicTool(tool: AIToolSpec): Anthropic.Beta.BetaTool {
	return {
		name: tool.name,
		description: tool.description,
		input_schema: tool.parameters as Anthropic.Beta.BetaTool.InputSchema,
		// Large inputs (a whole page of blocks) stream as they're written instead of
		// arriving in one burst. The API stops checking them against the schema, so the
		// caller validates every call before running it (runAgentTurn does, with zod).
		eager_input_streaming: true
	};
}

export function mapStopReason(reason: string | null | undefined): AIFinishReason {
	switch (reason) {
		case 'tool_use':
			return 'tool_calls';
		case 'max_tokens':
		case 'model_context_window_exceeded':
			return 'length';
		case 'refusal':
			return 'refusal';
		default:
			return 'stop';
	}
}

/** Accumulates a tool_use block's streamed `input_json_delta` chunks by content-block index. */
interface ToolUseBuffer {
	id: string;
	name: string;
	json: string;
}

export class AnthropicProviderAdapter implements AIProviderAdapter {
	readonly name = 'anthropic';
	private client: Anthropic;

	constructor(private config: AnthropicAdapterConfig) {
		this.client = new Anthropic({ apiKey: config.apiKey, baseURL: config.baseURL });
	}

	async *chatStream(request: AIChatRequest): AsyncIterable<AIStreamEvent> {
		const { system, messages } = toAnthropicMessages(request.messages);
		const toolBuffers = new Map<number, ToolUseBuffer>();
		let finishReason: AIFinishReason = 'stop';
		const fallbacks = this.config.fallbackModels ?? [];

		try {
			const stream = this.client.beta.messages.stream(
				{
					model: request.model,
					system,
					messages,
					...(request.tools?.length ? { tools: request.tools.map(toAnthropicTool) } : {}),
					max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
					// Caches the longest unchanged prefix (tools, system prompt, history), so
					// each round trip of a tool loop pays for its new part only.
					cache_control: { type: 'ephemeral' },
					...(this.config.effort ? { output_config: { effort: this.config.effort } } : {}),
					...(fallbacks.length
						? { betas: [FALLBACK_BETA], fallbacks: fallbacks.map((model) => ({ model })) }
						: {})
				},
				{ signal: request.signal }
			);

			for await (const event of stream) {
				switch (event.type) {
					case 'content_block_start': {
						if (event.content_block.type === 'tool_use') {
							toolBuffers.set(event.index, {
								id: event.content_block.id,
								name: event.content_block.name,
								json: ''
							});
						}
						break;
					}
					case 'content_block_delta': {
						if (event.delta.type === 'text_delta') {
							yield { type: 'text', delta: event.delta.text };
						} else if (event.delta.type === 'input_json_delta') {
							const buf = toolBuffers.get(event.index);
							if (buf) buf.json += event.delta.partial_json;
						}
						break;
					}
					case 'content_block_stop': {
						const buf = toolBuffers.get(event.index);
						if (buf) {
							// Incomplete or malformed JSON (possible with eager input streaming) yields
							// an empty object rather than throwing here: the caller's schema check is
							// what reports the rejected arguments back to the model.
							let args: Record<string, unknown> = {};
							try {
								args = buf.json ? JSON.parse(buf.json) : {};
							} catch {
								// leave empty
							}
							const toolCall: AIToolCall = { id: buf.id, name: buf.name, arguments: args };
							yield { type: 'toolCall', toolCall };
							toolBuffers.delete(event.index);
						}
						break;
					}
					case 'message_delta': {
						finishReason = mapStopReason(event.delta.stop_reason);
						break;
					}
					default:
						break;
				}
			}

			// `finalMessage()` is the one point with complete token counts and content.
			const finalMessage = await stream.finalMessage();
			finishReason = mapStopReason(finalMessage.stop_reason);
			const state = stateFrom(finalMessage.content);
			if (state) yield { type: 'providerState', state };
			yield {
				type: 'usage',
				promptTokens:
					finalMessage.usage.input_tokens +
					(finalMessage.usage.cache_read_input_tokens ?? 0) +
					(finalMessage.usage.cache_creation_input_tokens ?? 0),
				completionTokens: finalMessage.usage.output_tokens
			};

			yield { type: 'done', finishReason };
		} catch (err) {
			yield { type: 'error', message: err instanceof Error ? err.message : String(err) };
			yield { type: 'done', finishReason: 'error' };
		}
	}
}

export function createAnthropicAdapter(config: AnthropicAdapterConfig): AIProviderAdapter {
	return new AnthropicProviderAdapter(config);
}

export type {
	AIProviderAdapter,
	AIChatRequest,
	AIFinishReason,
	AIStreamEvent,
	AIMessage,
	AIToolSpec,
	AIToolCall
} from '@aphexcms/cms-core/server';
