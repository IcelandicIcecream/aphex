// Bundle-size guard for the studio client build.
//
// Fails CI if any single client chunk exceeds MAX_CHUNK_GZIP_KB. SvelteKit emits
// content-hashed chunk names, so we can't budget by filename — but the size of
// the biggest chunk is a stable, meaningful signal: it goes monolithic the moment
// something heavy (the document editor, the field registry, TipTap) gets pulled
// into a widely-shared chunk. That's exactly the regression the /client, /client/ui
// and lazy-editor splits were done to prevent.
//
// Raise the limit only deliberately — it means you accept a heavier shared chunk.
//
// Run after a studio build: `node scripts/check-bundle-budget.mjs`

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const CHUNK_DIR = 'apps/studio/.svelte-kit/output/client/_app/immutable/chunks';
const MAX_CHUNK_GZIP_KB = 200;

if (!existsSync(CHUNK_DIR)) {
	console.error(`✗ ${CHUNK_DIR} not found — build studio first (pnpm build).`);
	process.exit(1);
}

const chunks = readdirSync(CHUNK_DIR)
	.filter((f) => f.endsWith('.js'))
	.map((f) => {
		const path = join(CHUNK_DIR, f);
		return { name: f, gzipKb: gzipSync(readFileSync(path)).length / 1024, rawKb: statSync(path).size / 1024 };
	})
	.sort((a, b) => b.gzipKb - a.gzipKb);

const biggest = chunks[0];
const over = biggest.gzipKb > MAX_CHUNK_GZIP_KB;

console.log(`Largest client chunks (gzip):`);
for (const c of chunks.slice(0, 5)) {
	console.log(`  ${c.gzipKb.toFixed(1).padStart(7)} kB  ${c.name}`);
}
console.log(`\nBudget: ${MAX_CHUNK_GZIP_KB} kB gzip / chunk`);

if (over) {
	console.error(
		`\n✗ ${biggest.name} is ${biggest.gzipKb.toFixed(1)} kB gzip — over the ${MAX_CHUNK_GZIP_KB} kB budget.\n` +
			`  Something heavy likely landed in a shared chunk. Check for a static import of\n` +
			`  DocumentEditor / a *Field component / TipTap into a widely-used module, or raise\n` +
			`  the budget in scripts/check-bundle-budget.mjs if the growth is intended.`
	);
	process.exit(1);
}

console.log(`\n✓ Largest chunk ${biggest.gzipKb.toFixed(1)} kB is within budget.`);
