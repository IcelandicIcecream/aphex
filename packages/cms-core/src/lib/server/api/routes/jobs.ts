import { Hono } from 'hono';
import { z } from 'zod';
import { authToContext } from '../../../local-api/auth-helpers';
import { hasCapability } from '../../../types/capabilities';
import type { Auth } from '../../../types/auth';
import { jobActionRequestSchema } from '../../../api/schemas/jobs';
import { cmsLogger } from '../../../utils/logger';
import type { AphexEnv } from '../index';
import { withCreatedByNames } from './resolve-created-by';
import { withOrganizationNames } from './resolve-organization-names';

// Read-only history / observability for the durable spine, plus the two operator actions
// that make a dead letter recoverable. Reads are gated on `document.read`: the operational
// log of publish work is visible to anyone who can read content. Mutations are gated on
// `org.settings` — see `requireJobControl`.
// Mirrors JobStatus (types/events) as a zod enum — the API contract's source of truth.
const jobStatus = z.enum(['pending', 'leased', 'completed', 'failed', 'cancelled']);

/**
 * `?scope=all` widens a history read from the active organization to the whole instance.
 * Super admins only — it's the one place the admin UI crosses a tenant boundary.
 */
const historyScope = z.enum(['organization', 'all']);

const listJobsQuery = z.object({
	status: jobStatus.optional(),
	type: z.string().optional(),
	scope: historyScope.optional(),
	limit: z.coerce.number().int().min(1).max(200).optional(),
	offset: z.coerce.number().int().min(0).optional()
});

const listEventsQuery = z.object({
	type: z.string().optional(),
	scope: historyScope.optional(),
	limit: z.coerce.number().int().min(1).max(200).optional(),
	offset: z.coerce.number().int().min(0).optional()
});

const healthQuery = z.object({ scope: historyScope.optional() });

/** Map an adapter Page into the ApiResponse `pagination` shape the client expects. */
function toPagination(page: { total: number; limit: number; offset: number }) {
	const pageSize = page.limit || 1;
	return {
		total: page.total,
		page: Math.floor(page.offset / pageSize) + 1,
		pageSize,
		totalPages: Math.max(1, Math.ceil(page.total / pageSize)),
		hasNextPage: page.offset + page.limit < page.total,
		hasPrevPage: page.offset > 0
	};
}

function isSuperAdmin(auth: Auth): boolean {
	return auth.type === 'session' && auth.user.role === 'super_admin';
}

function requireHistoryAccess(c: import('hono').Context<AphexEnv>) {
	const auth = c.var.auth;
	if (!auth || auth.type === 'partial_session') {
		return { error: c.json({ success: false, error: 'Authentication required' }, 401) };
	}
	if (!hasCapability(auth, 'document.read')) {
		return { error: c.json({ success: false, error: 'Insufficient permissions' }, 403) };
	}
	return { auth, organizationId: authToContext(auth).organizationId };
}

/**
 * Gate for retry/cancel — `org.settings`, which only `admin` and `owner` hold.
 *
 * Requeueing a job *runs* it, and a job can be anything: a scheduled publish, a GDPR
 * erasure, a plugin's webhook delivery. There's no single content capability that covers
 * that surface, so the gate is the operational one. It's not a widening: both roles that
 * hold `org.settings` already hold every document and asset capability, so retrying can't
 * let anyone cause an effect they couldn't cause directly.
 */
function requireJobControl(c: import('hono').Context<AphexEnv>) {
	const auth = c.var.auth;
	if (!auth || auth.type === 'partial_session') {
		return { error: c.json({ success: false, error: 'Authentication required' }, 401) };
	}
	if (!hasCapability(auth, 'org.settings')) {
		return { error: c.json({ success: false, error: 'Insufficient permissions' }, 403) };
	}
	return { auth, organizationId: authToContext(auth).organizationId };
}

/**
 * Which organization a read covers: the caller's, or every one of them.
 *
 * `undefined` means instance-wide to the adapter, which bypasses RLS — so this returns it
 * only for a super admin who explicitly asked. Anyone else asking for `scope=all` is quietly
 * scoped back to their own org rather than refused: the parameter is a view preference, and
 * failing the whole page over it would be a worse experience than showing what they can see.
 */
function readScope(
	auth: Auth,
	organizationId: string,
	scope: 'organization' | 'all' | undefined
): string | undefined {
	return scope === 'all' && isSuperAdmin(auth) ? undefined : organizationId;
}

/**
 * Resolve which organization an action targets, and prove the caller may act there.
 *
 * A body `organizationId` is only honored for a super admin acting from the instance-wide
 * view. For everyone else it must match the active organization — a mismatch is a 403, not a
 * silent fallback, because a body that names another tenant is either a bug or an attempt.
 */
function resolveActionOrganization(
	c: import('hono').Context<AphexEnv>,
	auth: Auth,
	activeOrganizationId: string,
	requested: string | undefined
): { organizationId: string } | { error: Response } {
	if (!requested || requested === activeOrganizationId) {
		return { organizationId: activeOrganizationId };
	}
	if (!isSuperAdmin(auth)) {
		return {
			error: c.json(
				{ success: false, error: 'Cannot act on jobs outside your active organization' },
				403
			)
		};
	}
	return { organizationId: requested };
}

export const jobsRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/jobs', async (c) => {
		try {
			const gate = requireHistoryAccess(c);
			if ('error' in gate) return gate.error;

			const parsed = listJobsQuery.safeParse(c.req.query());
			if (!parsed.success) {
				return c.json({ success: false, error: 'Invalid query', issues: parsed.error.issues }, 400);
			}
			const { status, type, scope, limit, offset } = parsed.data;
			const organizationId = readScope(gate.auth, gate.organizationId, scope);

			const { databaseAdapter } = c.var.aphexCMS;
			const page = await databaseAdapter.listJobs({ organizationId, status, type, limit, offset });
			// Only the instance-wide view needs org names; org-scoped rows are all the same org.
			const items = organizationId
				? page.items
				: await withOrganizationNames(page.items, databaseAdapter);
			return c.json({ success: true, data: items, pagination: toPagination(page) });
		} catch (error) {
			cmsLogger.error('Failed to list jobs:', error);
			return c.json({ success: false, error: 'Failed to list jobs' }, 500);
		}
	})
	.get('/jobs/health', async (c) => {
		try {
			const gate = requireHistoryAccess(c);
			if ('error' in gate) return gate.error;

			const parsed = healthQuery.safeParse(c.req.query());
			if (!parsed.success) {
				return c.json({ success: false, error: 'Invalid query', issues: parsed.error.issues }, 400);
			}
			const organizationId = readScope(gate.auth, gate.organizationId, parsed.data.scope);

			const { databaseAdapter } = c.var.aphexCMS;
			const health = await databaseAdapter.outboxHealth({ organizationId });
			return c.json({ success: true, data: health });
		} catch (error) {
			cmsLogger.error('Failed to read outbox health:', error);
			return c.json({ success: false, error: 'Failed to read outbox health' }, 500);
		}
	})
	.post('/jobs/:id/retry', async (c) => {
		try {
			const gate = requireJobControl(c);
			if ('error' in gate) return gate.error;

			const body = await c.req.json().catch(() => ({}));
			const parsed = jobActionRequestSchema.safeParse(body);
			if (!parsed.success) {
				return c.json(
					{ success: false, error: 'Invalid request', issues: parsed.error.issues },
					400
				);
			}
			const target = resolveActionOrganization(
				c,
				gate.auth,
				gate.organizationId,
				parsed.data.organizationId
			);
			if ('error' in target) return target.error;

			const id = c.req.param('id');
			const { databaseAdapter } = c.var.aphexCMS;
			const job = await databaseAdapter.requeueJob(target.organizationId, id, {
				runAt: new Date()
			});

			if (!job) {
				// The guard matched nothing: either the job isn't there, or it's in a state that
				// can't be requeued. Read it back so the message says which — "already running"
				// and "no such job" call for completely different reactions from an operator.
				const existing = await databaseAdapter.getJob(target.organizationId, id);
				if (!existing) return c.json({ success: false, error: 'Job not found' }, 404);
				return c.json(
					{
						success: false,
						error: `Only failed or cancelled jobs can be retried — this one is ${existing.status}.`
					},
					409
				);
			}

			cmsLogger.info(
				`[jobs] Job ${id} (${job.type}) requeued by ${gate.auth.type === 'session' ? gate.auth.user.id : 'api key'}`
			);
			return c.json({ success: true, data: job });
		} catch (error) {
			cmsLogger.error('Failed to retry job:', error);
			return c.json({ success: false, error: 'Failed to retry job' }, 500);
		}
	})
	.post('/jobs/:id/cancel', async (c) => {
		try {
			const gate = requireJobControl(c);
			if ('error' in gate) return gate.error;

			const body = await c.req.json().catch(() => ({}));
			const parsed = jobActionRequestSchema.safeParse(body);
			if (!parsed.success) {
				return c.json(
					{ success: false, error: 'Invalid request', issues: parsed.error.issues },
					400
				);
			}
			const target = resolveActionOrganization(
				c,
				gate.auth,
				gate.organizationId,
				parsed.data.organizationId
			);
			if ('error' in target) return target.error;

			const id = c.req.param('id');
			const { databaseAdapter } = c.var.aphexCMS;
			const existing = await databaseAdapter.getJob(target.organizationId, id);
			if (!existing) return c.json({ success: false, error: 'Job not found' }, 404);

			// `cancelJob` itself is unguarded — the scheduled-publish flow calls it on jobs it
			// knows are pending. Here the state has to be checked first: cancelling a `leased`
			// job would only look like it worked, because the worker holding it settles the row
			// afterwards and overwrites the status.
			if (existing.status !== 'pending' && existing.status !== 'failed') {
				return c.json(
					{
						success: false,
						error: `Only pending or failed jobs can be cancelled — this one is ${existing.status}.`
					},
					409
				);
			}

			await databaseAdapter.cancelJob(target.organizationId, id);
			const job = await databaseAdapter.getJob(target.organizationId, id);
			cmsLogger.info(
				`[jobs] Job ${id} (${existing.type}) cancelled by ${gate.auth.type === 'session' ? gate.auth.user.id : 'api key'}`
			);
			return c.json({ success: true, data: job });
		} catch (error) {
			cmsLogger.error('Failed to cancel job:', error);
			return c.json({ success: false, error: 'Failed to cancel job' }, 500);
		}
	})
	.get('/events', async (c) => {
		try {
			const gate = requireHistoryAccess(c);
			if ('error' in gate) return gate.error;

			const parsed = listEventsQuery.safeParse(c.req.query());
			if (!parsed.success) {
				return c.json({ success: false, error: 'Invalid query', issues: parsed.error.issues }, 400);
			}
			const { type, scope, limit, offset } = parsed.data;
			const organizationId = readScope(gate.auth, gate.organizationId, scope);

			const { databaseAdapter, auth } = c.var.aphexCMS;
			const page = await databaseAdapter.listEvents({ organizationId, type, limit, offset });
			const named = await withCreatedByNames(page.items, auth);
			const items = organizationId ? named : await withOrganizationNames(named, databaseAdapter);
			return c.json({ success: true, data: items, pagination: toPagination(page) });
		} catch (error) {
			cmsLogger.error('Failed to list events:', error);
			return c.json({ success: false, error: 'Failed to list events' }, 500);
		}
	});
