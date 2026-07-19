import { Hono } from 'hono';
import { z } from 'zod';
import { authToContext } from '../../../local-api/auth-helpers';
import { hasCapability } from '../../../types/capabilities';
import { cmsLogger } from '../../../utils/logger';
import type { AphexEnv } from '../index';

// Read-only history / observability for the durable spine. Gated on `document.read`:
// the operational log of publish work is visible to anyone who can read content.
// Mirrors JobStatus (types/events) as a zod enum — the API contract's source of truth.
const jobStatus = z.enum(['pending', 'leased', 'completed', 'failed', 'cancelled']);

const listJobsQuery = z.object({
	status: jobStatus.optional(),
	type: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(200).optional(),
	offset: z.coerce.number().int().min(0).optional()
});

const listEventsQuery = z.object({
	type: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(200).optional(),
	offset: z.coerce.number().int().min(0).optional()
});

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

function requireHistoryAccess(c: import('hono').Context<AphexEnv>) {
	const auth = c.var.auth;
	if (!auth || auth.type === 'partial_session') {
		return { error: c.json({ success: false, error: 'Authentication required' }, 401) };
	}
	if (!hasCapability(auth, 'document.read')) {
		return { error: c.json({ success: false, error: 'Insufficient permissions' }, 403) };
	}
	return { organizationId: authToContext(auth).organizationId };
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
			const { status, type, limit, offset } = parsed.data;

			const { databaseAdapter } = c.var.aphexCMS;
			const page = await databaseAdapter.listJobs({
				organizationId: gate.organizationId,
				status,
				type,
				limit,
				offset
			});
			return c.json({ success: true, data: page.items, pagination: toPagination(page) });
		} catch (error) {
			cmsLogger.error('Failed to list jobs:', error);
			return c.json({ success: false, error: 'Failed to list jobs' }, 500);
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
			const { type, limit, offset } = parsed.data;

			const { databaseAdapter } = c.var.aphexCMS;
			const page = await databaseAdapter.listEvents({
				organizationId: gate.organizationId,
				type,
				limit,
				offset
			});
			return c.json({ success: true, data: page.items, pagination: toPagination(page) });
		} catch (error) {
			cmsLogger.error('Failed to list events:', error);
			return c.json({ success: false, error: 'Failed to list events' }, 500);
		}
	});
