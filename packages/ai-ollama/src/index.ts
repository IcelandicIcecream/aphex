import { Ollama, type Message, type Tool } from 'ollama';
import type {
	AIProviderAdapter,
	AIChatRequest,
	AIStreamEvent,
	AIMessage,
	AIToolSpec,
	AIToolCall
} from '@aphexcms/cms-core/server';

export interface OllamaAdapterConfig {
	/** Defaults to Ollama's standard local port. */
	host?: string;
}

function toOllamaMessages(messages: AIMessage[]): Message[] {
	return messages.map((m) => {
		if (m.role === 'tool') {
			// Ollama has no distinct tool-result role — the content goes back as a plain
			// message; there's no tool_call_id linkage in its wire format.
			return { role: 'tool', content: m.content };
		}
		if (m.role === 'assistant' && m.toolCalls?.length) {
			return {
				role: 'assistant',
				content: m.content,
				tool_calls: m.toolCalls.map((tc) => ({
					function: { name: tc.name, arguments: tc.arguments }
				}))
			};
		}
		return { role: m.role, content: m.content };
	});
}

function toOllamaTool(tool: AIToolSpec): Tool {
	return {
		type: 'function',
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters as Tool['function']['parameters']
		}
	};
}

function mapDoneReason(reason: string | undefined): 'stop' | 'tool_calls' | 'length' | 'error' {
	switch (reason) {
		case 'length':
			return 'length';
		default:
			return 'stop';
	}
}

export class OllamaProviderAdapter implements AIProviderAdapter {
	readonly name = 'ollama';
	private client: Ollama;

	constructor(config: OllamaAdapterConfig = {}) {
		this.client = new Ollama(config.host ? { host: config.host } : undefined);
	}

	async *chatStream(request: AIChatRequest): AsyncIterable<AIStreamEvent> {
		let finishReason: 'stop' | 'tool_calls' | 'length' | 'error' = 'stop';
		let sawToolCalls = false;

		try {
			const response = await this.client.chat({
				model: request.model,
				messages: toOllamaMessages(request.messages),
				...(request.tools?.length ? { tools: request.tools.map(toOllamaTool) } : {}),
				stream: true
			});

			// Ollama's abort signal is a controller passed at the client level, not a
			// per-request option — bridge the caller's AbortSignal to it.
			request.signal?.addEventListener('abort', () => this.client.abort());

			for await (const chunk of response) {
				if (chunk.message?.content) {
					yield { type: 'text', delta: chunk.message.content };
				}

				// Unlike OpenAI, Ollama's local-model tool calls arrive fully formed (arguments
				// already a parsed object, not a streamed partial-JSON string), so each one is
				// emitted directly rather than buffered across chunks.
				if (chunk.message?.tool_calls?.length) {
					sawToolCalls = true;
					for (const tc of chunk.message.tool_calls) {
						const toolCall: AIToolCall = {
							id: crypto.randomUUID(),
							name: tc.function.name,
							arguments: tc.function.arguments as Record<string, unknown>
						};
						yield { type: 'toolCall', toolCall };
					}
				}

				if (chunk.done) {
					finishReason = sawToolCalls ? 'tool_calls' : mapDoneReason(chunk.done_reason);
					yield {
						type: 'usage',
						promptTokens: chunk.prompt_eval_count ?? 0,
						completionTokens: chunk.eval_count ?? 0
					};
				}
			}

			yield { type: 'done', finishReason };
		} catch (err) {
			yield { type: 'error', message: err instanceof Error ? err.message : String(err) };
			yield { type: 'done', finishReason: 'error' };
		}
	}
}

export function createOllamaAdapter(config: OllamaAdapterConfig = {}): AIProviderAdapter {
	return new OllamaProviderAdapter(config);
}

export type {
	AIProviderAdapter,
	AIChatRequest,
	AIStreamEvent,
	AIMessage,
	AIToolSpec,
	AIToolCall
} from '@aphexcms/cms-core/server';
