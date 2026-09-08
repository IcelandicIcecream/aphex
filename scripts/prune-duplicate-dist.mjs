#!/usr/bin/env node
/**
 * Collapse the duplicate `dist/lib` tree that a src-rooted `tsc` leaves behind.
 *
 * `cms-core` builds twice on purpose:
 *
 *   svelte-package   src/lib/**  ->  dist/**          (flat; this is what `exports` points at)
 *   tsc              src/**      ->  dist/lib/**      (rootDir: src, so the `lib/` segment is kept)
 *                                    dist/cli/**       <- the only part anyone needs
 *
 * `tsc` is in the build for `dist/cli` — svelte-package only ever sees `src/lib`,
 * so without it the `aphex` binary has nothing to run. But rootDir preservation
 * means the same run also emits a second, complete copy of the library under
 * `dist/lib`, and `files: ["dist"]` ships it: ~5MB of JS, maps and declarations
 * that no export in the package resolves to.
 *
 * It isn't inert, though, which is why it can't simply be deleted. `dist/cli`
 * imports its siblings — `../lib/type-gen.js` and, transitively, a dozen more —
 * because in *source* those are `../lib/*` and tsc emits paths as written. So
 * this rewrites the CLI's `../lib/x` specifiers to the flat `../x` that
 * svelte-package produced from the identical source, and only then removes the
 * tree. Same modules, one copy.
 *
 * Refuses to prune if any rewritten target is missing, rather than shipping a
 * CLI whose imports resolve to nothing — a failure that would only surface for
 * a user running `aphex` from an installed package.
 *
 * Usage: node scripts/prune-duplicate-dist.mjs <package-dir>
 */
import { readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';

const pkgDir = process.argv[2];
if (!pkgDir) {
	console.error('Usage: node scripts/prune-duplicate-dist.mjs <package-dir>');
	process.exit(1);
}

const dist = resolve(pkgDir, 'dist');
const libDir = join(dist, 'lib');
const cliDir = join(dist, 'cli');

if (!existsSync(libDir)) {
	console.log('prune-duplicate-dist: no dist/lib — nothing to do');
	process.exit(0);
}
if (!existsSync(cliDir)) {
	console.error('prune-duplicate-dist: dist/cli is missing — did the build run?');
	process.exit(1);
}

async function walk(dir, out = []) {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const p = join(dir, entry.name);
		if (entry.isDirectory()) await walk(p, out);
		else if (/\.(js|d\.ts|map)$/.test(entry.name)) out.push(p);
	}
	return out;
}

// `../lib/x` and `../../lib/x` alike: any relative specifier whose path walks up
// out of dist/cli and back down into lib/.
const SPECIFIER = /(['"])((?:\.\.\/)+)lib\/([^'"]+)\1/g;

const files = await walk(cliDir);
const missing = [];
let rewritten = 0;

for (const file of files) {
	const before = await readFile(file, 'utf-8');
	const after = before.replace(SPECIFIER, (match, quote, up, rest) => {
		// Dropping the `lib/` segment *is* the rewrite: `dist/cli/../lib/x.js`
		// becomes `dist/cli/../x.js`, which is where svelte-package put it.
		const flat = resolve(dirname(file), up, rest);
		if (!existsSync(flat)) {
			missing.push(`${relative(dist, file)} -> ${rest}`);
			return match;
		}
		return `${quote}${up}${rest}${quote}`;
	});
	if (after !== before) {
		await writeFile(file, after, 'utf-8');
		rewritten++;
	}
}

if (missing.length > 0) {
	console.error(
		'prune-duplicate-dist: refusing to prune — these CLI imports have no flat equivalent:'
	);
	for (const m of missing) console.error(`  ${m}`);
	process.exit(1);
}

await rm(libDir, { recursive: true, force: true });
console.log(`✓ prune-duplicate-dist: rewrote ${rewritten} CLI file(s), removed dist/lib`);
