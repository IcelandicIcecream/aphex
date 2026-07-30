import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import type { AphexEnv } from '../index';
import { agentChatRequest } from '../../../api/schemas/agent-chat';
import { recordWorkspaceOperationRequest } from '../../../api/schemas/agent-operations';
import { authToContext } from '../../../local-api/auth-helpers';
import { resolveAgentTools, type ContentAgentTool } from '../../../mcp/tools';
import { runAgentTurn } from '../../../ai/run-agent-turn';
import { DEFAULT_AGENT_SYSTEM_PROMPT } from '../../../ai/default-system-prompt';
import { cmsLogger } from '../../../utils/logger';
import type { CMSInstances } from '../../../hooks';
import type { LocalAPIContext } from '../../../local-api/index';

const SUMMARY_MAX_LENGTH = 200;

// A mutating tool's `data` is `unknown` at this boundary (AgentToolResult.data) — every tool
// returns a different shape (list_collections -> {collections}, upload_asset -> {asset, ...},
// document tools -> {document, validation}), and this route dispatches by name against
// whatever's registered, including plugin-contributed tools it's never seen at compile time.
// There's no static type to give it, so the id is pulled out via a runtime-validated parse
// (the same idiom `run-agent-turn.ts` already uses for tool arguments) rather than an `as`
// cast asserting a shape without checking it.
const toolResultWithDocumentId = z.object({ document: z.object({ id: z.string() }) });

/** `create_document` has no `id` argument (nothing to reference before it exists) — its new
 * id only shows up in the result. Falls back to that when the args don't have one, so a
 * create is still attributable to a document instead of being silently dropped. */
function resolveDocumentId(args: Record<string, unknown>, data: unknown): string | null {
	if (typeof args.id === 'string') return args.id;
	const parsed = toolResultWithDocumentId.safeParse(data);
	return parsed.success ? parsed.data.document.id : null;
}

/**
 * Best-effort audit record for one mutating tool call — looks up the two most recent
 * document-version rows to capture `versionBefore`/`versionAfter` (the version an undo would
 * restore to, and the one this write produced), then records the operation. Never throws: a
 * failure to record the audit trail must never break the actual tool call or the SSE stream.
 * Exported for unit testing — not part of the route's own public surface.
 */
export async function recordMutatingOperation(
	aphexCMS: CMSInstances,
	context: LocalAPIContext,
	changeSetId: string,
	toolName: string,
	args: Record<string, unknown>,
	success: boolean,
	error: string | undefined,
	data: unknown
): Promise<void> {
	const collection = typeof args.collection === 'string' ? args.collection : null;
	// `resolveDocumentId` checks `args.id` first, so a failed update_document/publish_document
	// (which does have `args.id`) is still attributable — it only falls through to parsing
	// `data` for the rare case for `create_document`, whose result won't parse on failure anyway.
	const documentId = resolveDocumentId(args, data);
	if (!collection || !documentId) return;

	try {
		const { databaseAdapter, localAPI } = aphexCMS;
		const { versions } = await localAPI.versionService.listVersions(
			databaseAdapter,
			context.organizationId,
			documentId,
			{ limit: 2 }
		);
		const [versionAfter, versionBefore] = versions;

		await databaseAdapter.recordOperation({
			changeSetId,
			organizationId: context.organizationId,
			collection,
			documentId,
			toolName,
			arguments: args,
			success,
			error,
			versionBefore: versionBefore?.versionNumber ?? null,
			versionAfter: versionAfter?.versionNumber ?? null
		});
	} catch (err) {
		cmsLogger.error('[agent-chat] failed to record agent operation (continuing):', err);
	}
}

export const agentChatRouter: Hono<AphexEnv> = new Hono<AphexEnv>();

/**
 * POST /api/agent/chat — the in-admin agent's streaming chat endpoint (Milestone 2 item 5
 * of references/content-copilot-phase-1-plan.md). Stateless per call: the browser sends
 * the full running conversation each time (conversation persistence is a separate,
 * not-yet-built piece — see the plan). Requires an authenticated session; individual tool
 * calls are separately capability-gated by `resolveAgentTools`/each tool's own checks —
 * this endpoint is a dumb transport over the same tool-execution service MCP uses, not an
 * additional authorization layer.
 *
 * 404s (rather than 401) when no `aiProvider` is configured, so the route doesn't exist as
 * a surface at all on an instance that hasn't opted in — same "don't advertise an unset
 * feature" posture as `workers-run.ts`'s worker secret gate.
 *
 * Also records an audit/undo trail (`cms_agent_change_sets`/`cms_agent_operations`): a
 * change-set row is created eagerly for every turn (so token usage is captured even for a
 * pure Q&A turn with no mutations), and every mutating tool call gets an operation row. All
 * of this recording is best-effort — see `recordMutatingOperation` above and the try/catch
 * around change-set creation/completion below — a failure here must never break the chat.
 */
agentChatRouter.post('/chat', async (c) => {
	const { aphexCMS, auth } = c.var;
	const { aiProvider, agentModel } = aphexCMS.config;
	const { databaseAdapter } = aphexCMS;

	if (!aiProvider) return c.json({ success: false, error: 'Not found' }, 404);
	if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);
	if (!agentModel) {
		return c.json(
			{ success: false, error: 'Server misconfigured: no agentModel configured for aiProvider' },
			501
		);
	}

	const body = await c.req.json().catch(() => null);
	const parsed = agentChatRequest.safeParse(body);
	if (!parsed.success) {
		return c.json({ success: false, error: 'Invalid request', issues: parsed.error.issues }, 400);
	}

	const context = authToContext(auth);
	const tools = resolveAgentTools(
		{ aphexCMS, context },
		{ documentContext: parsed.data.documentContext }
	);
	const toolsByName = new Map<string, ContentAgentTool>(tools.map((t) => [t.definition.name, t]));
	const model = parsed.data.model ?? agentModel;
	const abortController = new AbortController();

	// A turn paused for a workspace tool resumes as a brand-new HTTP request (see
	// `types/agent-stream.ts`) — the client echoes back the change-set id from the leg that
	// paused so every leg of one logical turn records against the same row, instead of a
	// fresh `cms_agent_change_sets` row per leg.
	let changeSetId: string | null = parsed.data.changeSetId ?? null;
	if (!changeSetId) {
		try {
			const firstUserMessage = parsed.data.messages.find((m) => m.role === 'user')?.content ?? '';
			const changeSet = await databaseAdapter.createChangeSet({
				organizationId: context.organizationId,
				createdBy: context.user?.id ?? null,
				summary: firstUserMessage.slice(0, SUMMARY_MAX_LENGTH) || null,
				provider: aiProvider.name,
				model
			});
			changeSetId = changeSet.id;
		} catch (err) {
			cmsLogger.error('[agent-chat] failed to create change-set (continuing without one):', err);
		}
	}

	return streamSSE(c, async (stream) => {
		c.req.raw.signal.addEventListener('abort', () => abortController.abort());
		let promptTokens = parsed.data.priorUsage?.promptTokens ?? 0;
		let completionTokens = parsed.data.priorUsage?.completionTokens ?? 0;
		let turnFailed = false;
		let turnPaused = false;
		// toolCall args aren't repeated on the matching toolResult event, so stash them here
		// to correlate the two when it's time to record a mutating operation.
		const argsByToolCallId = new Map<string, Record<string, unknown>>();

		try {
			for await (const event of runAgentTurn({
				aiProvider,
				model,
				messages: parsed.data.messages,
				tools,
				toolContext: { aphexCMS, context },
				systemPrompt: aphexCMS.config.agentSystemPrompt ?? DEFAULT_AGENT_SYSTEM_PROMPT,
				signal: abortController.signal
			})) {
				if (event.type === 'usage') {
					promptTokens += event.promptTokens;
					completionTokens += event.completionTokens;
				} else if (event.type === 'toolCall') {
					argsByToolCallId.set(event.toolCallId, event.arguments);
				} else if (event.type === 'toolResult' && changeSetId) {
					const tool = toolsByName.get(event.name);
					const args = argsByToolCallId.get(event.toolCallId);
					if (tool?.definition.mutates && args) {
						await recordMutatingOperation(
							aphexCMS,
							context,
							changeSetId,
							event.name,
							args,
							event.success,
							event.error,
							event.data
						);
					}
				} else if (event.type === 'error') {
					turnFailed = true;
				}

				if (event.type === 'done') {
					event.changeSetId = changeSetId;
					if (event.finishReason === 'awaiting_workspace_tool') turnPaused = true;
				}

				await stream.writeSSE({ data: JSON.stringify(event) });
			}
		} catch (err) {
			turnFailed = true;
			cmsLogger.error('[agent-chat] turn failed:', err);
			await stream.writeSSE({
				data: JSON.stringify({
					type: 'error',
					message: err instanceof Error ? err.message : 'Unknown error'
				})
			});
		} finally {
			// A paused leg isn't the end of the turn — the client resumes with the same
			// changeSetId, and only the truly-terminal leg should mark the change-set complete.
			if (changeSetId && !turnPaused) {
				try {
					await databaseAdapter.completeChangeSet(context.organizationId, changeSetId, {
						status: turnFailed ? 'failed' : 'completed',
						promptTokens,
						completionTokens
					});
				} catch (err) {
					cmsLogger.error('[agent-chat] failed to complete change-set (continuing):', err);
				}
			}
		}
	});
});

/**
 * POST /api/agent/operations — records an audit/undo row for a tool the *client* executed
 * against a live `DocumentWorkspace` (the `content_patch_fields`/`content_save_draft` bridge
 * tools — see `ai/content-workspace-tools.ts`). `agent-chat.ts`'s own `recordMutatingOperation`
 * call above only sees tool results resolved server-side inside `runAgentTurn`'s loop, so a
 * workspace tool's result — resolved client-side after a paused turn — needs this separate
 * path to reach the same `cms_agent_change_sets`/`cms_agent_operations` tables. Same
 * session-authenticated posture as `/chat`; not itself a mutation of document data (the
 * client already made that call directly via the normal document API), purely bookkeeping.
 */
agentChatRouter.post('/operations', async (c) => {
	const { aphexCMS, auth } = c.var;
	if (!aphexCMS.config.aiProvider) return c.json({ success: false, error: 'Not found' }, 404);
	if (!auth) return c.json({ success: false, error: 'Unauthorized' }, 401);

	const body = await c.req.json().catch(() => null);
	const parsed = recordWorkspaceOperationRequest.safeParse(body);
	if (!parsed.success) {
		return c.json({ success: false, error: 'Invalid request', issues: parsed.error.issues }, 400);
	}

	const context = authToContext(auth);
	await recordMutatingOperation(
		aphexCMS,
		context,
		parsed.data.changeSetId,
		parsed.data.toolName,
		{ collection: parsed.data.collection, id: parsed.data.id, ...parsed.data.arguments },
		parsed.data.success,
		parsed.data.error,
		parsed.data.data
	);

	return c.json({ success: true });
});
