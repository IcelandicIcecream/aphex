import OpenAI from 'openai';
import type {
	AIProviderAdapter,
	AIChatRequest,
	AIStreamEvent,
	AIMessage,
	AIToolSpec,
	AIToolCall
} from '@aphexcms/cms-core/server';

export interface OpenAIAdapterConfig {
	apiKey: string;
	/** Override for OpenAI-compatible endpoints other than api.openai.com (see `createOpenRouterAdapter`/`createOllamaCompatAdapter` below). */
	baseURL?: string;
	defaultHeaders?: Record<string, string>;
}

function toOpenAIMessages(messages: AIMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
	return messages.map((m) => {
		if (m.role === 'tool') {
			return {
				role: 'tool',
				tool_call_id: m.toolCallId ?? '',
				content: m.content
			};
		}
		if (m.role === 'assistant' && m.toolCalls?.length) {
			return {
				role: 'assistant',
				content: m.content || null,
				tool_calls: m.toolCalls.map((tc) => ({
					id: tc.id,
					type: 'function' as const,
					function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
				}))
			};
		}
		return { role: m.role as 'system' | 'user' | 'assistant', content: m.content };
	});
}

function toOpenAITool(tool: AIToolSpec): OpenAI.Chat.ChatCompletionTool {
	return {
		type: 'function',
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters
		}
	};
}

function mapFinishReason(
	reason: string | null | undefined
): 'stop' | 'tool_calls' | 'length' | 'error' {
	switch (reason) {
		case 'tool_calls':
			return 'tool_calls';
		case 'length':
			return 'length';
		default:
			return 'stop';
	}
}

/** Accumulates streamed tool-call deltas by index — OpenAI streams a tool call's name and
 *  JSON arguments incrementally across many chunks, keyed by position in the array rather
 *  than by id (the id itself may only arrive on the first delta for that index). */
interface ToolCallBuffer {
	id: string;
	name: string;
	args: string;
}

export class OpenAIProviderAdapter implements AIProviderAdapter {
	readonly name: string;
	private client: OpenAI;

	constructor(config: OpenAIAdapterConfig, name = 'openai') {
		this.client = new OpenAI({
			apiKey: config.apiKey,
			baseURL: config.baseURL,
			defaultHeaders: config.defaultHeaders
		});
		this.name = name;
	}

	async *chatStream(request: AIChatRequest): AsyncIterable<AIStreamEvent> {
		const buffers = new Map<number, ToolCallBuffer>();
		let finishReason: 'stop' | 'tool_calls' | 'length' | 'error' = 'stop';

		try {
			const stream = await this.client.chat.completions.create(
				{
					model: request.model,
					messages: toOpenAIMessages(request.messages),
					...(request.tools?.length ? { tools: request.tools.map(toOpenAITool) } : {}),
					...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
					stream: true,
					stream_options: { include_usage: true }
				},
				{ signal: request.signal }
			);

			for await (const chunk of stream) {
				const choice = chunk.choices?.[0];
				const delta = choice?.delta;

				if (delta?.content) {
					yield { type: 'text', delta: delta.content };
				}

				if (delta?.tool_calls) {
					for (const tc of delta.tool_calls) {
						const existing = buffers.get(tc.index) ?? { id: '', name: '', args: '' };
						if (tc.id) existing.id = tc.id;
						if (tc.function?.name) existing.name += tc.function.name;
						if (tc.function?.arguments) existing.args += tc.function.arguments;
						buffers.set(tc.index, existing);
					}
				}

				if (choice?.finish_reason) {
					finishReason = mapFinishReason(choice.finish_reason);
				}

				if (chunk.usage) {
					yield {
						type: 'usage',
						promptTokens: chunk.usage.prompt_tokens,
						completionTokens: chunk.usage.completion_tokens
					};
				}
			}

			for (const buf of buffers.values()) {
				// A malformed/incomplete argument buffer (e.g. the stream was cut short) yields
				// an empty object rather than throwing here — the tool executor's own zod
				// validation is what should surface a rejected-args error to the model.
				let args: Record<string, unknown> = {};
				try {
					args = buf.args ? JSON.parse(buf.args) : {};
				} catch {
					// leave empty
				}
				const toolCall: AIToolCall = { id: buf.id, name: buf.name, arguments: args };
				yield { type: 'toolCall', toolCall };
			}

			yield { type: 'done', finishReason };
		} catch (err) {
			yield { type: 'error', message: err instanceof Error ? err.message : String(err) };
			yield { type: 'done', finishReason: 'error' };
		}
	}
}

export function createOpenAIAdapter(config: OpenAIAdapterConfig): AIProviderAdapter {
	return new OpenAIProviderAdapter(config, 'openai');
}

/**
 * OpenRouter speaks the same OpenAI-compatible chat-completions + function-calling wire
 * format — only the base URL (and OpenRouter's optional attribution headers) differ, so
 * this is a config shorthand rather than a separate adapter package.
 */
export function createOpenRouterAdapter(config: {
	apiKey: string;
	/** Sent as `HTTP-Referer` — OpenRouter uses it for attribution on their leaderboards. */
	siteUrl?: string;
	/** Sent as `X-Title` — shown alongside your app's usage on OpenRouter's dashboard. */
	siteName?: string;
}): AIProviderAdapter {
	return new OpenAIProviderAdapter(
		{
			apiKey: config.apiKey,
			baseURL: 'https://openrouter.ai/api/v1',
			defaultHeaders: {
				...(config.siteUrl ? { 'HTTP-Referer': config.siteUrl } : {}),
				...(config.siteName ? { 'X-Title': config.siteName } : {})
			}
		},
		'openrouter'
	);
}

export type {
	AIProviderAdapter,
	AIChatRequest,
	AIStreamEvent,
	AIMessage,
	AIToolSpec,
	AIToolCall
} from '@aphexcms/cms-core/server';
