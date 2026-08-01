/**
 * Integration coverage for `POST /api/agent/operations` (server/api/routes/agent-chat.ts) —
 * the endpoint `AgentChat.svelte` calls to record an audit row for a workspace-bridge tool
 * (`content_patch_fields`/`content_save_draft`) it resolved locally against a live
 * `DocumentWorkspace`, since the SSE loop in `/chat` never sees those results itself.
 *
 * Exercises the real Hono route (via `createAphexApi()` + `.route()`, the same bridge
 * production wiring uses) against fake `CMSInstances`/`Auth`, not just the exported
 * `recordMutatingOperation` helper directly (already covered by
 * agent-chat-recording.test.ts) — so the auth/404 gates and request parsing are verified too.
 *
 * Lives in tests/ (not src/) so the package build never compiles it into dist.
 * Run: pnpm -F @aphexcms/cms-core test
 */
import { describe, it, expect, vi } from 'vitest';
import { createAphexApi } from '../src/lib/server/api/index';
import { agentChatRouter } from '../src/lib/server/api/routes/agent-chat';
import type { CMSInstances } from '../src/lib/hooks';
import type { Auth } from '../src/lib/types/auth';

function fakeCMS(
	overrides: {
		recordOperation?: ReturnType<typeof vi.fn>;
		listVersions?: ReturnType<typeof vi.fn>;
		aiProvider?: unknown;
	} = {}
) {
	const recordOperation = overrides.recordOperation ?? vi.fn().mockResolvedValue({});
	const listVersions =
		overrides.listVersions ??
		vi.fn().mockResolvedValue({ versions: [{ versionNumber: 2 }, { versionNumber: 1 }], total: 2 });

	return {
		config: { aiProvider: 'aiProvider' in overrides ? overrides.aiProvider : { name: 'fake' } },
		databaseAdapter: { recordOperation },
		localAPI: { versionService: { listVersions } }
	} as unknown as CMSInstances;
}

function fakeSessionAuth(): Auth {
	return {
		type: 'session',
		organizationId: 'org-1',
		user: { id: 'user-1', email: 'a@b.com', name: 'A' }
	} as unknown as Auth;
}

function buildApp() {
	const app = createAphexApi();
	app.route('/agent', agentChatRouter);
	return app;
}

function operationsRequest(body: Record<string, unknown>) {
	return new Request('http://localhost/api/agent/operations', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

const validBody = {
	changeSetId: 'cs-1',
	toolName: 'content_save_draft',
	collection: 'post',
	id: 'doc-1',
	success: true,
	arguments: {},
	data: { revision: 2 }
};

describe('POST /api/agent/operations', () => {
	it('401s without an authenticated session', async () => {
		const app = buildApp();
		const res = await app.fetch(operationsRequest(validBody), { aphexCMS: fakeCMS(), auth: null });
		expect(res.status).toBe(401);
	});

	it('404s when no aiProvider is configured — same "unset feature" posture as /chat', async () => {
		const app = buildApp();
		const res = await app.fetch(operationsRequest(validBody), {
			aphexCMS: fakeCMS({ aiProvider: undefined }),
			auth: fakeSessionAuth()
		});
		expect(res.status).toBe(404);
	});

	it('400s on an invalid body', async () => {
		const app = buildApp();
		const res = await app.fetch(operationsRequest({ toolName: 'content_save_draft' }), {
			aphexCMS: fakeCMS(),
			auth: fakeSessionAuth()
		});
		expect(res.status).toBe(400);
	});

	it('records an operation against the given change-set via recordMutatingOperation', async () => {
		const app = buildApp();
		const recordOperation = vi.fn().mockResolvedValue({});
		const res = await app.fetch(operationsRequest(validBody), {
			aphexCMS: fakeCMS({ recordOperation }),
			auth: fakeSessionAuth()
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(recordOperation).toHaveBeenCalledWith(
			expect.objectContaining({
				changeSetId: 'cs-1',
				organizationId: 'org-1',
				collection: 'post',
				documentId: 'doc-1',
				toolName: 'content_save_draft',
				success: true
			})
		);
	});
});
