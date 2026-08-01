import Anthropic from '@anthropic-ai/sdk';
import type {
	AIProviderAdapter,
	AIChatRequest,
	AIStreamEvent,
	AIMessage,
	AIToolSpec,
	AIToolCall
} from '@aphexcms/cms-core/server';

export interface AnthropicAdapterConfig {
	apiKey: string;
	baseURL?: string;
}

/** Anthropic's default when a caller omits `maxTokens` — the param is required by the API,
 *  unlike OpenAI where it's optional. */
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Anthropic has no `system` role message — it's a separate top-level param — and no `tool`
 * role either: a tool result is a `user` message with a `tool_result` content block. Splits
 * `messages` into that shape.
 */
function toAnthropicMessages(messages: AIMessage[]): {
	system: string | undefined;
	messages: Anthropic.MessageParam[];
} {
	const systemParts: string[] = [];
	const out: Anthropic.MessageParam[] = [];

	for (const m of messages) {
		if (m.role === 'system') {
			systemParts.push(m.content);
			continue;
		}
		if (m.role === 'tool') {
			out.push({
				role: 'user',
				content: [{ type: 'tool_result', tool_use_id: m.toolCallId ?? '', content: m.content }]
			});
			continue;
		}
		if (m.role === 'assistant' && m.toolCalls?.length) {
			const content: Anthropic.ContentBlockParam[] = [];
			if (m.content) content.push({ type: 'text', text: m.content });
			for (const tc of m.toolCalls) {
				content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments });
			}
			out.push({ role: 'assistant', content });
			continue;
		}
		out.push({ role: m.role, content: m.content });
	}

	return { system: systemParts.length ? systemParts.join('\n\n') : undefined, messages: out };
}

function toAnthropicTool(tool: AIToolSpec): Anthropic.Tool {
	return {
		name: tool.name,
		description: tool.description,
		input_schema: tool.parameters as Anthropic.Tool.InputSchema
	};
}

function mapStopReason(
	reason: string | null | undefined
): 'stop' | 'tool_calls' | 'length' | 'error' {
	switch (reason) {
		case 'tool_use':
			return 'tool_calls';
		case 'max_tokens':
			return 'length';
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

	constructor(config: AnthropicAdapterConfig) {
		this.client = new Anthropic({ apiKey: config.apiKey, baseURL: config.baseURL });
	}

	async *chatStream(request: AIChatRequest): AsyncIterable<AIStreamEvent> {
		const { system, messages } = toAnthropicMessages(request.messages);
		const toolBuffers = new Map<number, ToolUseBuffer>();
		let finishReason: 'stop' | 'tool_calls' | 'length' | 'error' = 'stop';

		try {
			const stream = this.client.messages.stream(
				{
					model: request.model,
					system,
					messages,
					...(request.tools?.length ? { tools: request.tools.map(toAnthropicTool) } : {}),
					max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS
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
							// A malformed/incomplete JSON buffer yields an empty object rather than
							// throwing here — the tool executor's own zod validation is what should
							// surface a rejected-args error to the model.
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

			// `finalMessage()` is the one point with correct, complete input+output token counts —
			// message_delta events only carry an incremental output_tokens count as it streams.
			const finalMessage = await stream.finalMessage();
			yield {
				type: 'usage',
				promptTokens: finalMessage.usage.input_tokens,
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
	AIStreamEvent,
	AIMessage,
	AIToolSpec,
	AIToolCall
} from '@aphexcms/cms-core/server';
