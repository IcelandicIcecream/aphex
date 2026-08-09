// Request contracts for the job queue's operator actions (POST /api/jobs/:id/retry|cancel).
// Single source of truth: the route validates with these, the client infers its input types
// from them. The read endpoints (GET /jobs, /events, /jobs/health) keep their query schemas
// in the route handler — per convention, GET-only shapes don't earn a shared module.
import { z } from 'zod';

/**
 * Body for both operator actions on a job.
 *
 * `organizationId` exists solely for the instance-wide view: a super admin looking at every
 * tenant's queue needs to act on a job that isn't in their *active* org, and the id alone
 * doesn't say where it lives. Omit it and the action targets the caller's active organization
 * — which is the only thing a non-super-admin may ever do (the route rejects a mismatch with
 * 403 rather than trusting the body).
 */
export const jobActionRequestSchema = z.object({
	organizationId: z.string().min(1).optional()
});

export type JobActionRequest = z.infer<typeof jobActionRequestSchema>;
