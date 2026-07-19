/**
 * Self-hosted job worker.
 *
 * The job runner lives behind the protected endpoint `POST /api/internal/workers/run`
 * (see aphex.config.ts `jobs.workerSecret`). In a hosted setup a platform cron pokes
 * that endpoint on a schedule. Self-hosters who want a dedicated worker process instead
 * run THIS: a tiny loop that POSTs the same endpoint every `interval`. One execution
 * path, two ways to drive it — no re-bootstrapping the SvelteKit app outside Vite.
 *
 *   APHEX_WORKER_SECRET   (required) shared secret; must match aphex.config.ts
 *   APHEX_WORKER_URL      endpoint URL. Default http://localhost:5173/api/internal/workers/run
 *   APHEX_WORKER_INTERVAL_MS  poll interval. Default 5000
 *
 * Run with:  pnpm -F @aphexcms/studio worker   (needs the app server running)
 */
const secret = process.env.APHEX_WORKER_SECRET;
const url = process.env.APHEX_WORKER_URL ?? 'http://localhost:5173/api/internal/workers/run';
const intervalMs = Number(process.env.APHEX_WORKER_INTERVAL_MS ?? '5000');

if (!secret) {
	console.error(
		'[worker] APHEX_WORKER_SECRET is required (must match aphex.config.ts jobs.workerSecret).'
	);
	process.exit(1);
}

let running = true;
let stopping = false;

async function tick(): Promise<void> {
	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: { authorization: `Bearer ${secret}` }
		});
		if (!res.ok) {
			// 404 = endpoint disabled (no secret configured server-side); 401 = secret mismatch.
			console.error(`[worker] run failed: ${res.status} ${res.statusText}`);
			return;
		}
		const body = (await res.json()) as {
			result?: {
				claimed: number;
				completed: number;
				retried: number;
				failed: number;
				relay?: { relayed: number; enqueued: number };
			};
		};
		const r = body.result;
		// Only log when there was work — a quiet worker shouldn't spam the console. Count both
		// halves of a tick: the relay fan-out (events → delivery jobs) and the job execution.
		const relayed = r?.relay?.relayed ?? 0;
		if (r && (r.claimed > 0 || relayed > 0)) {
			const relay = r.relay ? ` relayed=${r.relay.relayed} enqueued=${r.relay.enqueued}` : '';
			console.log(
				`[worker]${relay} claimed=${r.claimed} completed=${r.completed} retried=${r.retried} failed=${r.failed}`
			);
		}
	} catch (err) {
		// Server not up yet / network blip — log and keep looping.
		console.error('[worker] tick error:', err instanceof Error ? err.message : err);
	}
}

async function loop(): Promise<void> {
	console.log(`[worker] polling ${url} every ${intervalMs}ms`);
	while (running) {
		await tick();
		if (!running) break;
		await new Promise((r) => setTimeout(r, intervalMs));
	}
	console.log('[worker] stopped.');
}

function shutdown(signal: string): void {
	if (stopping) return;
	stopping = true;
	console.log(`[worker] ${signal} received, finishing current tick…`);
	running = false;
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

void loop();
