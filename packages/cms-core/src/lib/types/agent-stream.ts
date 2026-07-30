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

import type { AIMessage } from '../ai/interfaces/ai-provider';

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
	| {
			type: 'done';
			/**
			 * `'awaiting_workspace_tool'` means the model requested one or more
			 * `execution: 'workspace'` tool calls this round — those can only be executed by
			 * the browser (they touch a live, possibly-unsaved editor draft), so the server
			 * stopped short of resolving them. `pendingWorkspaceCalls` lists exactly which
			 * ones need a result before the turn can continue; the caller resolves them
			 * locally, appends `tool` messages, and re-POSTs to resume — see
			 * `server/api/routes/agent-chat.ts` and `AgentChat.svelte`.
			 */
			finishReason: 'stop' | 'tool_calls' | 'length' | 'error' | 'awaiting_workspace_tool';
			/**
			 * The complete running conversation, including every intermediate
			 * `assistant`(toolCalls)/`tool` message this turn produced — not just the final
			 * user-visible text. `/api/agent/chat` is stateless per call, so the caller is
			 * expected to resend this wholesale as `messages` on the next turn rather than
			 * reconstructing it client-side (easy to get subtly wrong — see the history bug
			 * this replaced).
			 */
			messages: AIMessage[];
			/** Only present when `finishReason === 'awaiting_workspace_tool'`. */
			pendingWorkspaceCalls?: {
				toolCallId: string;
				name: string;
				arguments: Record<string, unknown>;
			}[];
			/**
			 * Stamped by `agent-chat.ts` (not `runAgentTurn`, which has no DB access) on every
			 * `done` event so a resume request can echo it back and the audit trail's
			 * `cms_agent_change_sets` row stays the same across a paused turn's multiple legs.
			 */
			changeSetId?: string | null;
	  };
