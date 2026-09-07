// Adapter health, for the probe an orchestrator points at.
//
// Deliberately returns a plain result rather than a `Response`: the app owns the
// HTTP shape (status code, headers, whatever else it wants to report), and this
// owns the question of what "healthy" means. That also keeps it usable outside a
// request — a worker loop or a CLI can ask the same question.
//
// The three decisions worth not re-deriving per app:
//
//   1. A check that *throws* is unhealthy, not a 500. Adapters reject on a dead
//      socket or expired bucket credentials, and a probe that propagates the
//      rejection reports "the app is broken" when the truthful answer is "a
//      dependency is down". Every check is settled, never awaited bare.
//   2. A check that *hangs* is unhealthy too, and this is the one hand-written
//      probes miss. `isHealthy()` on a wedged connection can hang indefinitely;
//      without a bound the probe hangs with it and the platform learns nothing
//      until its own timeout fires. Each check races a timer.
//   3. The result stays coarse. Whatever an app returns from here is public and
//      unauthenticated — booleans, no driver strings, no connection URLs.

import type { CMSInstances } from '../hooks';

/** Default bound on each individual check. Comfortably inside a typical 10s probe timeout. */
const DEFAULT_TIMEOUT_MS = 5_000;

export interface HealthResult {
	/** True only when every checked dependency is healthy. What a load balancer reads. */
	ok: boolean;
	/** Database adapter reachable and answering. */
	db: boolean;
	/** Storage adapter reachable and answering. */
	storage: boolean;
}

export interface HealthOptions {
	/**
	 * Per-check bound in milliseconds. A check that exceeds it counts as unhealthy.
	 * Keep it below the platform's probe timeout, or the platform gives up first and
	 * the bound never does anything. Default 5000.
	 */
	timeoutMs?: number;
}

/**
 * Resolve to `false` rather than reject or hang.
 *
 * The timer is cleared on settle so a fast check doesn't hold a pending timeout —
 * which would keep the event loop busy for the remainder of the window on every
 * probe, and probes are frequent.
 */
async function settle(check: () => Promise<boolean>, timeoutMs: number): Promise<boolean> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const timeout = new Promise<false>((resolve) => {
			timer = setTimeout(() => resolve(false), timeoutMs);
		});
		// `check()` is invoked inside the try so a synchronous throw is caught too —
		// an adapter that blows up before returning a promise is just as unhealthy.
		return (await Promise.race([check(), timeout])) === true;
	} catch {
		return false;
	} finally {
		if (timer) clearTimeout(timer);
	}
}

/**
 * Check every adapter the CMS depends on to serve a request.
 *
 * Checks run concurrently, so the call takes as long as the slowest one rather
 * than their sum, and is bounded by `timeoutMs` either way.
 *
 * ```ts
 * // src/routes/healthz/+server.ts
 * import { json } from '@sveltejs/kit';
 * import { checkHealth } from '@aphexcms/cms-core/server';
 *
 * export const GET = async ({ locals }) => {
 *   const health = await checkHealth(locals.aphexCMS);
 *   return json(health, { status: health.ok ? 200 : 503 });
 * };
 * ```
 *
 * 503, not 500, on failure: the process is alive but not ready to serve, which is
 * what tells an orchestrator to stop routing traffic here without recycling the
 * container.
 */
export async function checkHealth(
	cms: Pick<CMSInstances, 'databaseAdapter' | 'storageAdapter'>,
	options: HealthOptions = {}
): Promise<HealthResult> {
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

	const [db, storage] = await Promise.all([
		settle(() => cms.databaseAdapter.isHealthy(), timeoutMs),
		settle(() => cms.storageAdapter.isHealthy(), timeoutMs)
	]);

	return { ok: db && storage, db, storage };
}
