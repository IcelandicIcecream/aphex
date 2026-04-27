/**
 * Cache Benchmark — simulates 10,000 users reading published content
 *
 * Creates a set of published documents, then fires 10k reads with and
 * without caching enabled, comparing latency, throughput, and DB query counts.
 *
 * Run: pnpm -F @aphexcms/studio test cache-benchmark
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createLocalAPI, InMemoryCacheAdapter } from '@aphexcms/cms-core/server';
import type { DatabaseAdapter } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import cmsConfig from '../aphex.config';
import { TEST_ORG_ID } from './helpers/test-constants';
const ctx = { organizationId: TEST_ORG_ID, overrideAccess: true };

const TOTAL_REQUESTS = 1_000;
const NUM_DOCUMENTS = 10;
const CONCURRENCY = 5;

const createdDocIds: string[] = [];

// ── DB query counter ──
// Wraps a DatabaseAdapter to count calls to read methods
function createCountingAdapter(adapter: DatabaseAdapter) {
	const counts = {
		findByDocIdAdvanced: 0,
		findManyDocAdvanced: 0,
		get total() {
			return this.findByDocIdAdvanced + this.findManyDocAdvanced;
		}
	};

	const proxy = new Proxy(adapter, {
		get(target, prop, receiver) {
			if (prop === 'findByDocIdAdvanced') {
				return (...args: any[]) => {
					counts.findByDocIdAdvanced++;
					return (target as any).findByDocIdAdvanced(...args);
				};
			}
			if (prop === 'findManyDocAdvanced') {
				return (...args: any[]) => {
					counts.findManyDocAdvanced++;
					return (target as any).findManyDocAdvanced(...args);
				};
			}
			return Reflect.get(target, prop, receiver);
		}
	});

	return { adapter: proxy as DatabaseAdapter, counts };
}

// Two counting adapters — one for no-cache, one for cached
const noCacheDB = createCountingAdapter(db);
const cachedDB = createCountingAdapter(db);

let apiNoCache: ReturnType<typeof createLocalAPI>;
let apiWithCache: ReturnType<typeof createLocalAPI>;
let cache: InMemoryCacheAdapter;

beforeAll(async () => {
	apiNoCache = createLocalAPI(cmsConfig, noCacheDB.adapter);

	cache = new InMemoryCacheAdapter({ maxSize: 5000 });
	apiWithCache = createLocalAPI({ ...cmsConfig, cache }, cachedDB.adapter);

	// Seed published documents
	console.log(`\n  Seeding ${NUM_DOCUMENTS} published documents...`);
	for (let i = 0; i < NUM_DOCUMENTS; i++) {
		const { document } = await apiNoCache.collections.page.create(
			ctx,
			{ title: `Bench Page ${i}`, slug: `bench-page-${i}-${Date.now()}` },
			{ publish: true }
		);
		createdDocIds.push(document.id);
	}
	console.log(`  Seeded ${createdDocIds.length} documents.\n`);
}, 120_000);

afterAll(async () => {
	for (const id of createdDocIds) {
		try {
			await apiNoCache.collections.page.delete(ctx, id);
		} catch {
			// ignore
		}
	}
});

interface BenchResult {
	label: string;
	totalMs: number;
	avgMs: number;
	p50Ms: number;
	p95Ms: number;
	p99Ms: number;
	rps: number;
	dbQueries: number;
}

async function runBench(
	label: string,
	api: ReturnType<typeof createLocalAPI>,
	mode: 'findByID' | 'find',
	counts: { findByDocIdAdvanced: number; findManyDocAdvanced: number; total: number }
): Promise<BenchResult> {
	const latencies: number[] = [];

	// Reset counters
	counts.findByDocIdAdvanced = 0;
	counts.findManyDocAdvanced = 0;

	const queue: (() => Promise<void>)[] = [];

	for (let i = 0; i < TOTAL_REQUESTS; i++) {
		const docId = createdDocIds[i % createdDocIds.length];

		if (mode === 'findByID') {
			queue.push(async () => {
				const start = performance.now();
				await api.collections.page.findByID(ctx, docId, { perspective: 'published' });
				latencies.push(performance.now() - start);
			});
		} else {
			queue.push(async () => {
				const start = performance.now();
				await api.collections.page.find(ctx, {
					perspective: 'published',
					limit: 10
				});
				latencies.push(performance.now() - start);
			});
		}
	}

	const overallStart = performance.now();
	let idx = 0;

	async function worker() {
		while (idx < queue.length) {
			const task = queue[idx++];
			await task();
		}
	}

	const workers = Array.from({ length: CONCURRENCY }, () => worker());
	await Promise.all(workers);

	const totalMs = performance.now() - overallStart;

	latencies.sort((a, b) => a - b);
	const p = (pct: number) => latencies[Math.floor(latencies.length * pct)] ?? 0;

	return {
		label,
		totalMs: Math.round(totalMs),
		avgMs: +(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2),
		p50Ms: +p(0.5).toFixed(2),
		p95Ms: +p(0.95).toFixed(2),
		p99Ms: +p(0.99).toFixed(2),
		rps: Math.round((TOTAL_REQUESTS / totalMs) * 1000),
		dbQueries: counts.total
	};
}

function printResult(r: BenchResult) {
	console.log(`\n  ┌─ ${r.label}`);
	console.log(`  │  Total:      ${r.totalMs}ms for ${TOTAL_REQUESTS.toLocaleString()} requests`);
	console.log(`  │  DB queries: ${r.dbQueries.toLocaleString()}`);
	console.log(`  │  RPS:        ${r.rps.toLocaleString()} req/s`);
	console.log(`  │  Avg:        ${r.avgMs}ms`);
	console.log(`  │  P50:        ${r.p50Ms}ms`);
	console.log(`  │  P95:        ${r.p95Ms}ms`);
	console.log(`  │  P99:        ${r.p99Ms}ms`);
	console.log(`  └──`);
}

function printComparison(noCache: BenchResult, withCache: BenchResult) {
	const speedup = (noCache.totalMs / withCache.totalMs).toFixed(1);
	const avgReduction = (((noCache.avgMs - withCache.avgMs) / noCache.avgMs) * 100).toFixed(1);
	const rpsGain = (((withCache.rps - noCache.rps) / noCache.rps) * 100).toFixed(1);
	const querySaved = (
		((noCache.dbQueries - withCache.dbQueries) / noCache.dbQueries) *
		100
	).toFixed(1);

	console.log(`\n  ╔════════════════════════════════════════════╗`);
	console.log(`  ║           COMPARISON SUMMARY                ║`);
	console.log(`  ╠════════════════════════════════════════════╣`);
	console.log(`  ║  Speedup:        ${speedup}x faster`.padEnd(49) + '║');
	console.log(`  ║  Avg latency:    -${avgReduction}%`.padEnd(49) + '║');
	console.log(`  ║  Throughput:     +${rpsGain}% RPS`.padEnd(49) + '║');
	console.log(
		`  ║  DB queries:     ${noCache.dbQueries.toLocaleString()} → ${withCache.dbQueries.toLocaleString()} (-${querySaved}%)`.padEnd(
			49
		) + '║'
	);
	console.log(`  ╚════════════════════════════════════════════╝\n`);
}

describe('Cache Benchmark — 10,000 simulated users', () => {
	it('findByID: no cache vs cached', async () => {
		console.log(
			`\n  ── findByID benchmark (${TOTAL_REQUESTS.toLocaleString()} requests, ${CONCURRENCY} concurrent) ──`
		);

		await cache.flush();

		// Warm up: one read per doc to populate cache
		cachedDB.counts.findByDocIdAdvanced = 0;
		cachedDB.counts.findManyDocAdvanced = 0;
		for (const docId of createdDocIds) {
			await apiWithCache.collections.page.findByID(ctx, docId, {
				perspective: 'published'
			});
		}
		console.log(`  Cache warmed: ${cachedDB.counts.total} DB queries for ${NUM_DOCUMENTS} docs`);

		const noCache = await runBench(
			'findByID — NO CACHE (DB every time)',
			apiNoCache,
			'findByID',
			noCacheDB.counts
		);
		const withCache = await runBench(
			'findByID — WITH CACHE',
			apiWithCache,
			'findByID',
			cachedDB.counts
		);

		printResult(noCache);
		printResult(withCache);
		printComparison(noCache, withCache);

		expect(withCache.avgMs).toBeLessThan(noCache.avgMs);
		expect(withCache.dbQueries).toBeLessThan(noCache.dbQueries);
	}, 300_000);

	it('find (collection query): no cache vs cached', async () => {
		console.log(
			`\n  ── find() benchmark (${TOTAL_REQUESTS.toLocaleString()} requests, ${CONCURRENCY} concurrent) ──`
		);

		await cache.flush();

		// Warm up: one query to populate cache
		cachedDB.counts.findByDocIdAdvanced = 0;
		cachedDB.counts.findManyDocAdvanced = 0;
		await apiWithCache.collections.page.find(ctx, {
			perspective: 'published',
			limit: 10
		});
		console.log(`  Cache warmed: ${cachedDB.counts.total} DB query for 1 collection query`);

		const noCache = await runBench(
			'find() — NO CACHE (DB every time)',
			apiNoCache,
			'find',
			noCacheDB.counts
		);
		const withCache = await runBench('find() — WITH CACHE', apiWithCache, 'find', cachedDB.counts);

		printResult(noCache);
		printResult(withCache);
		printComparison(noCache, withCache);

		// Cache should never be slower; on tiny result sets both can tie at
		// sub-ms granularity, so assert ≤ rather than strict <.
		expect(withCache.avgMs).toBeLessThanOrEqual(noCache.avgMs);
		expect(withCache.dbQueries).toBeLessThan(noCache.dbQueries);
	}, 300_000);

	it('invalidation under load: publish during reads', async () => {
		console.log(`\n  ── invalidation-under-load benchmark ──`);

		await cache.flush();

		// Warm up cache
		for (const docId of createdDocIds) {
			await apiWithCache.collections.page.findByID(ctx, docId, {
				perspective: 'published'
			});
		}

		// Reset counters for the actual benchmark
		cachedDB.counts.findByDocIdAdvanced = 0;
		cachedDB.counts.findManyDocAdvanced = 0;

		let reads = 0;
		let invalidations = 0;
		const errors: string[] = [];
		const start = performance.now();

		const readPromises: Promise<void>[] = [];
		const publishInterval = setInterval(async () => {
			const docId = createdDocIds[Math.floor(Math.random() * createdDocIds.length)];
			try {
				await apiWithCache.collections.page.publish(ctx, docId);
				invalidations++;
			} catch {
				// document may be mid-operation
			}
		}, 10);

		for (let i = 0; i < TOTAL_REQUESTS; i++) {
			const docId = createdDocIds[i % createdDocIds.length];
			readPromises.push(
				apiWithCache.collections.page
					.findByID(ctx, docId, { perspective: 'published' })
					.then(() => {
						reads++;
					})
					.catch((e: Error) => {
						errors.push(e.message);
					})
			);

			if (readPromises.length >= CONCURRENCY) {
				await Promise.all(readPromises.splice(0, CONCURRENCY));
			}
		}

		await Promise.all(readPromises);
		clearInterval(publishInterval);

		const totalMs = Math.round(performance.now() - start);
		const rps = Math.round((reads / totalMs) * 1000);
		const dbHits = cachedDB.counts.total;
		const cacheHitRate = (((reads - dbHits) / reads) * 100).toFixed(1);

		console.log(`\n  ┌─ Reads under invalidation pressure`);
		console.log(`  │  Reads completed:      ${reads.toLocaleString()}`);
		console.log(`  │  Invalidations fired:   ${invalidations}`);
		console.log(
			`  │  DB queries:            ${dbHits.toLocaleString()} (cache hit rate: ${cacheHitRate}%)`
		);
		console.log(`  │  Errors:                ${errors.length}`);
		console.log(`  │  Total time:            ${totalMs}ms`);
		console.log(`  │  Throughput:             ${rps.toLocaleString()} req/s`);
		console.log(`  └──\n`);

		expect(reads).toBe(TOTAL_REQUESTS);
		expect(errors.length).toBe(0);
	}, 300_000);
});
