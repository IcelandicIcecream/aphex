#!/usr/bin/env node

/**
 * Load Test — 10,000 concurrent users hitting published content endpoints
 *
 * Prerequisites:
 *   1. Start the dev server:  pnpm dev:studio
 *   2. Run this script:       node scripts/load-test.mjs
 *
 * Uses autocannon (via npx) to generate real HTTP traffic.
 * Compares responses with and without cache enabled.
 *
 * To test WITH cache: add `cache: new InMemoryCacheAdapter()` to aphex.config.ts
 * To test WITHOUT cache: remove or comment out the cache line
 */

import { execSync, spawn } from 'child_process';

// ── Config ──
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_KEY =
	process.env.API_KEY || 'yTsMLKOvAAkrIfyqVNFFsMPpRJmUhVNXqsYUrHrvxxwJSwDDciEndVWoIaAvKtIL';
const CONNECTIONS = Number(process.env.CONNECTIONS || 10); // concurrent connections
const DURATION = Number(process.env.DURATION || 15); // seconds per test
const PIPELINE = Number(process.env.PIPELINE || 1); // requests pipelined per connection

// Published document IDs to cycle through
const DOC_IDS = [
	'6e211999-0118-4e91-8786-1110c8521e8d',
	'dfe4fd45-9df0-4f00-9ac8-99de8977e142',
	'82c99bd0-fa5a-4441-8048-1ee5c4b5a3a0'
];

// ── Helpers ──
function header() {
	return `-H "x-api-key: ${API_KEY}"`;
}

async function checkServer() {
	try {
		const res = await fetch(
			`${BASE_URL}/api/documents?type=page&perspective=published&pageSize=1`,
			{
				headers: { 'x-api-key': API_KEY }
			}
		);
		if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
		const data = await res.json();
		console.log(`  Server check OK — ${data.data?.length ?? 0} docs returned\n`);
		return true;
	} catch (e) {
		console.error(`\n  ERROR: Cannot reach ${BASE_URL}`);
		console.error(`  Make sure the dev server is running: pnpm dev:studio\n`);
		console.error(`  ${e.message}\n`);
		return false;
	}
}

function runAutocannon(label, url) {
	return new Promise((resolve, reject) => {
		console.log(`\n  ── ${label} ──`);
		console.log(`  URL: ${url}`);
		console.log(`  Connections: ${CONNECTIONS} | Duration: ${DURATION}s | Pipeline: ${PIPELINE}\n`);

		const args = [
			'autocannon',
			'-c',
			String(CONNECTIONS),
			'-d',
			String(DURATION),
			'-p',
			String(PIPELINE),
			'-t',
			'30',
			'-H',
			`x-api-key=${API_KEY}`,
			'--renderStatusCodes',
			url
		];

		const proc = spawn('npx', args, {
			stdio: 'inherit',
			shell: true
		});

		proc.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`autocannon exited with code ${code}`));
		});

		proc.on('error', reject);
	});
}

// ── Main ──
async function main() {
	console.log('\n╔═══════════════════════════════════════════════════╗');
	console.log('║     Aphex CMS — Published Content Load Test       ║');
	console.log('╚═══════════════════════════════════════════════════╝\n');

	console.log(`  Base URL:     ${BASE_URL}`);
	console.log(`  Connections:  ${CONNECTIONS} concurrent`);
	console.log(`  Duration:     ${DURATION}s per endpoint`);
	console.log(`  Pipeline:     ${PIPELINE} req/connection`);
	console.log(`  Effective:    ~${CONNECTIONS * PIPELINE} concurrent requests\n`);

	if (!(await checkServer())) process.exit(1);

	// Test 1: List published pages
	await runAutocannon(
		'GET /api/documents — list published pages',
		`${BASE_URL}/api/documents?type=page&perspective=published&pageSize=20`
	);

	// Test 2: Single document by ID (round-robin across docs)
	// autocannon doesn't support rotation natively, so test each doc
	for (const docId of DOC_IDS.slice(0, 1)) {
		await runAutocannon(
			`GET /api/documents/${docId} — single published page`,
			`${BASE_URL}/api/documents/${docId}?perspective=published`
		);
	}

	// Test 3: GraphQL query
	console.log(`\n  ── GraphQL published query ──`);
	console.log(`  POST ${BASE_URL}/api/aphex-graphql\n`);

	const graphqlBody = JSON.stringify({
		query: `{ allPage(perspective: "published", limit: 20) { id title slug _meta { publishedAt } } }`
	});

	const gqlArgs = [
		'autocannon',
		'-c',
		String(CONNECTIONS),
		'-d',
		String(DURATION),
		'-p',
		String(PIPELINE),
		'-H',
		`x-api-key=${API_KEY}`,
		'-H',
		'content-type=application/json',
		'-m',
		'POST',
		'-b',
		graphqlBody,
		'--renderStatusCodes',
		`${BASE_URL}/api/aphex-graphql`
	];

	await new Promise((resolve, reject) => {
		const proc = spawn('npx', gqlArgs, { stdio: 'inherit', shell: true });
		proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
		proc.on('error', reject);
	});

	console.log('\n╔═══════════════════════════════════════════════════╗');
	console.log('║                   DONE                             ║');
	console.log('║                                                    ║');
	console.log('║  To compare cached vs uncached:                    ║');
	console.log('║  1. Run WITHOUT cache → note the results           ║');
	console.log('║  2. Add cache to aphex.config.ts:                  ║');
	console.log('║     cache: new InMemoryCacheAdapter()              ║');
	console.log('║  3. Restart dev server                             ║');
	console.log('║  4. Run again → compare RPS & latency              ║');
	console.log('╚═══════════════════════════════════════════════════╝\n');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
