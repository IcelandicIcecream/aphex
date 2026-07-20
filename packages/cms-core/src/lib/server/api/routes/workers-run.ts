import { Hono } from 'hono';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { AphexEnv } from '../index';
import { runJobsBatch } from '../../../jobs/index';

/**
 * Constant-time compare of the presented bearer token against the configured secret.
 * Length is compared first (and short-circuits), which leaks only the secret's length —
 * acceptable, and unavoidable without hashing both sides.
 */
function secretMatches(presented: string, expected: string): boolean {
	const a = Buffer.from(presented);
	const b = Buffer.from(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

export const workersRunRouter = new Hono<AphexEnv>();

/**
 * POST /api/internal/workers/run — drive one bounded batch of due jobs and return counts.
 *
 * Machine-to-machine: authorized by a shared secret (`Authorization: Bearer <secret>`),
 * NOT the user capability system — platform cron (hosted) or a self-hosted worker loop
 * calls it on a cadence. Disabled (404) unless `jobs.workerSecret` is configured, so it
 * never exists as an unauthenticated surface by default. Bounded per call (batchSize), so
 * a single invocation can't run unboundedly; the caller's cadence sets throughput.
 */
workersRunRouter.post('/run', async (c) => {
	const secret = c.var.aphexCMS.config.jobs?.workerSecret;

	// Not configured → the endpoint doesn't exist. Don't advertise it or hint at auth.
	if (!secret) return c.json({ success: false, error: 'Not found' }, 404);

	const header = c.req.header('authorization') ?? '';
	const presented = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
	if (!presented || !secretMatches(presented, secret)) {
		return c.json({ success: false, error: 'Unauthorized' }, 401);
	}

	// Shared seam: builds the handler map (built-in + app-registered) and runs one batch.
	// The embedded poll loop calls the same helper, so the two modes can't drift.
	const result = await runJobsBatch(c.var.aphexCMS, { workerId: `endpoint-${randomUUID()}` });

	return c.json({ success: true, result });
});
