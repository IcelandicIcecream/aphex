// What an app connected over MCP changes, in the same audit and undo trail as the
// in-admin agent (`cms_agent_change_sets`, the Activity view's agent changes).
//
// The in-admin agent opens one change set per chat turn. MCP has no turns we can see:
// each tool call is its own stateless request, and the conversation lives in the
// client. So a change set here is one app's burst of work on one site: the writes of
// one connection (or API key) until it has been quiet for `QUIET_MS`. Its provider is
// `mcp`, its model the app's name, and its tokens zero, since the client's model and
// usage are never shown to us.
//
// Held in memory, per server process, so two processes would split a burst into two
// change sets; each is still complete and undoable. Best-effort throughout, like the
// agent route's own recording: a failure here never fails the tool call.
import type { ApiKeyAuth } from '../types/auth';
import type { AgentToolResult } from '../types/agent-tools';
import { MCP_PROVIDER } from '../types/agent-change-sets';
import type { CMSInstances } from '../hooks';
import type { LocalAPIContext } from '../local-api/index';
import { recordMutatingOperation } from '../server/api/routes/agent-chat';
import { cmsLogger } from '../utils/logger';

/**
 * How long an app has to stop writing before its next write starts a new change set.
 * About one AI reply: an app makes a request's changes within a minute or two, often
 * with a long pause to write a page between saves, then waits for the person to answer.
 * So Undo takes back the last thing they asked for, like the in-admin agent's turns.
 */
export const QUIET_MS = 3 * 60 * 1000;

interface OpenChangeSet {
	id: Promise<string | null>;
	lastAt: number;
	timer: ReturnType<typeof setTimeout>;
}

const open = new Map<string, OpenChangeSet>();

type Recorder = Pick<CMSInstances, 'databaseAdapter' | 'localAPI'>;

/** One change set per app per site: an API key or a connection is one caller. */
const keyOf = (auth: ApiKeyAuth) => `${auth.organizationId}:${auth.keyId}`;

function close(aphexCMS: Recorder, auth: ApiKeyAuth, entry: OpenChangeSet) {
	clearTimeout(entry.timer);
	void entry.id.then((id) => {
		if (!id) return;
		return aphexCMS.databaseAdapter
			.completeChangeSet(auth.organizationId, id, { status: 'completed' })
			.catch((error) => cmsLogger.error('[mcp] change set not completed:', error));
	});
}

/** The change set this caller's write belongs to: the open one, or a new one after a quiet spell. */
function changeSetFor(
	aphexCMS: Recorder,
	auth: ApiKeyAuth,
	now = Date.now()
): Promise<string | null> {
	const key = keyOf(auth);
	const current = open.get(key);
	if (current && now - current.lastAt < QUIET_MS) {
		current.lastAt = now;
		clearTimeout(current.timer);
		current.timer = setTimeout(() => finish(aphexCMS, auth), QUIET_MS);
		return current.id;
	}
	if (current) {
		open.delete(key);
		close(aphexCMS, auth, current);
	}
	const id = aphexCMS.databaseAdapter
		.createChangeSet({
			organizationId: auth.organizationId,
			// The person a connected app acts for; a plain API key is the organization's.
			createdBy: auth.userId ?? `apikey:${auth.keyId}`,
			summary: `${auth.name}, through MCP`,
			provider: MCP_PROVIDER,
			model: auth.name
		})
		.then((changeSet) => changeSet.id)
		.catch((error) => {
			cmsLogger.error('[mcp] change set not created (continuing without one):', error);
			return null;
		});
	const entry: OpenChangeSet = {
		id,
		lastAt: now,
		timer: setTimeout(() => finish(aphexCMS, auth), QUIET_MS)
	};
	open.set(key, entry);
	// Not created: forget it, so the next write tries again rather than going unrecorded.
	void id.then((made) => {
		if (!made && open.get(key) === entry) {
			clearTimeout(entry.timer);
			open.delete(key);
		}
	});
	return id;
}

function finish(aphexCMS: Recorder, auth: ApiKeyAuth) {
	const key = keyOf(auth);
	const entry = open.get(key);
	if (!entry) return;
	open.delete(key);
	close(aphexCMS, auth, entry);
}

/**
 * Records one mutating tool call an MCP caller made, in its change set. Reads aren't
 * recorded, as in the agent route. Never throws.
 */
export async function recordMcpWrite(
	aphexCMS: CMSInstances,
	context: LocalAPIContext,
	auth: ApiKeyAuth,
	toolName: string,
	args: Record<string, unknown>,
	result: AgentToolResult
): Promise<void> {
	try {
		const changeSetId = await changeSetFor(aphexCMS, auth);
		if (!changeSetId) return;
		await recordMutatingOperation(
			aphexCMS,
			context,
			changeSetId,
			toolName,
			args,
			result.success,
			result.error,
			result.data
		);
	} catch (error) {
		cmsLogger.error('[mcp] write not recorded:', error);
	}
}

/** For tests: close nothing, forget everything. */
export function forgetMcpChangeSets(): void {
	for (const entry of open.values()) clearTimeout(entry.timer);
	open.clear();
}
