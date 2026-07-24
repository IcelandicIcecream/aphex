import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { AphexEnv } from '../index';
import { agentChatRequest } from '../../../api/schemas/agent-chat';
import { authToContext } from '../../../local-api/auth-helpers';
import { resolveAgentTools } from '../../../mcp/tools';
import { runAgentTurn } from '../../../ai/run-agent-turn';
import { cmsLogger } from '../../../utils/logger';

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
 */
agentChatRouter.post('/chat', async (c) => {
	const { aphexCMS, auth } = c.var;
	const { aiProvider, agentModel } = aphexCMS.config;

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
	const tools = resolveAgentTools({ aphexCMS, context });
	const abortController = new AbortController();

	return streamSSE(c, async (stream) => {
		c.req.raw.signal.addEventListener('abort', () => abortController.abort());
		try {
			for await (const event of runAgentTurn({
				aiProvider,
				model: parsed.data.model ?? agentModel,
				messages: parsed.data.messages,
				tools,
				toolContext: { aphexCMS, context },
				signal: abortController.signal
			})) {
				await stream.writeSSE({ data: JSON.stringify(event) });
			}
		} catch (err) {
			cmsLogger.error('[agent-chat] turn failed:', err);
			await stream.writeSSE({
				data: JSON.stringify({
					type: 'error',
					message: err instanceof Error ? err.message : 'Unknown error'
				})
			});
		}
	});
});
