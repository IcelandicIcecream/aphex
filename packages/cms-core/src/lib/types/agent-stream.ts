// types/agent-stream.ts
//
// Browser-facing stream contract for an agent turn — what an SSE/NDJSON chat
// endpoint actually sends over the wire. Deliberately close to `AIProviderAdapter`'s `AIStreamEvent`
// (ai/interfaces/ai-provider.ts) since most events pass through unchanged — this type
// adds the one thing the provider boundary doesn't have: the *result* of a tool call
// the runtime executed, which the browser needs to render (and which the model needs
// fed back as a `tool` message for the next round trip).
//
// Client-safe: no DB handles, no provider SDKs, just the wire shape.

/** One event in an agent turn's response stream. */
export type AgentStreamEvent =
	| { type: 'text'; delta: string }
	| { type: 'toolCall'; toolCallId: string; name: string; arguments: Record<string, unknown> }
	| {
			type: 'toolResult';
			toolCallId: string;
			name: string;
			success: boolean;
			data?: unknown;
			/** Present when `success` is false — a message safe to show the model/user. */
			error?: string;
	  }
	| { type: 'usage'; promptTokens: number; completionTokens: number }
	| { type: 'error'; message: string }
	| { type: 'done'; finishReason: 'stop' | 'tool_calls' | 'length' | 'error' };
