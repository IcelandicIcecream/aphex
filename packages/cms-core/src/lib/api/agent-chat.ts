// Agent chat API client — the two HTTP calls AgentChat.svelte's send() loop makes, pulled out
// of the component per the same convention as api/documents.ts/api/assets.ts.
import { apiClient } from './client';
import type { ApiResponse } from './types';
import type { AgentChatRequest } from './schemas/agent-chat';
import type { RecordWorkspaceOperationRequest } from './schemas/agent-operations';
import type { AgentStreamEvent } from '../types/agent-stream';

function parseSSEFrame(frame: string): AgentStreamEvent | null {
	const payload = frame
		.split(/\r?\n/)
		.filter((line) => line.startsWith('data:'))
		.map((line) => line.slice(5).trimStart())
		.join('\n');
	if (!payload) return null;
	return JSON.parse(payload) as AgentStreamEvent;
}

/**
 * Streams one leg of an agent turn. Not built on `apiClient` — that always `await`s and parses
 * a JSON body, which is structurally incompatible with a chunked SSE response; this is the one
 * agent-chat call that needs the raw `fetch` + `ReadableStream`. `signal` is caller-supplied
 * (not `apiClient`'s own internal 10s timeout) so the chat panel's Stop button can abort
 * mid-stream regardless of how long a turn runs.
 *
 * A turn that pauses for a workspace tool (`finishReason: 'awaiting_workspace_tool'`) ends this
 * generator normally — resolving the pause and resuming is the caller's job (`AgentChat.svelte`
 * re-calls this with the same `changeSetId` echoed back), not something this function loops on
 * itself.
 */
export async function* streamAgentChat(
	body: AgentChatRequest,
	signal?: AbortSignal
): AsyncGenerator<AgentStreamEvent> {
	const response = await fetch('/api/agent/chat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
		signal
	});

	if (!response.ok || !response.body) {
		const errorBody = await response.json().catch(() => null);
		throw new Error(errorBody?.error ?? `Request failed (${response.status})`);
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	for (;;) {
		const { done, value } = await reader.read();
		buffer += decoder.decode(value, { stream: !done });
		const frames = buffer.split(/\r?\n\r?\n/);
		buffer = frames.pop() ?? '';
		if (done && buffer.trim()) frames.push(buffer);

		for (const frame of frames) {
			const event = parseSSEFrame(frame);
			if (event) yield event;
		}
		if (done) break;
	}
}

/**
 * Records an audit row for a workspace-bridge tool (`content_patch_fields`/`content_save_draft`)
 * the client resolved locally against a live `DocumentWorkspace` — see
 * `server/api/routes/agent-chat.ts`'s `POST /operations`. Plain JSON request/response, so unlike
 * `streamAgentChat` above, this one goes through the shared `apiClient`.
 */
export function recordWorkspaceOperation(
	body: RecordWorkspaceOperationRequest
): Promise<ApiResponse<{ success: true }>> {
	return apiClient.post<{ success: true }>('/agent/operations', body);
}
