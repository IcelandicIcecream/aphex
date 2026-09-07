#!/usr/bin/env node
/**
 * check-doc-source-links.mjs — every `<Src path="...">` in the docs must point at a real file.
 *
 * The docs site links source paths to GitHub via the `<Src>` component
 * (docs/aphex-docs/src/components/source-link.tsx). That component is deliberately a
 * pure link with no filesystem check of its own: `docs/aphex-docs/` is mirrored to a
 * standalone repo and built there (.github/workflows/sync-docs.yml), where `packages/`
 * doesn't exist. So the build can't tell a live path from one that was renamed six
 * months ago — it just emits a link that 404s for the reader.
 *
 * The monorepo is the one place that can tell, which is what this does. A file move
 * that orphans a docs link fails CI here instead of rotting quietly in production.
 *
 * Usage: node scripts/check-doc-source-links.mjs
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const DOCS_DIR = join(REPO_ROOT, 'docs/aphex-docs/content/docs');

/** Matches `<Src ... />` and grabs its `path` / optional `lines` attributes in either order. */
const SRC_TAG = /<Src\s+[^>]*?\/?>/g;
const PATH_ATTR = /\bpath=["']([^"']+)["']/;
const LINES_ATTR = /\blines=["'](\d+)(?:-(\d+))?["']/;

function mdxFiles(dir) {
	const out = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) out.push(...mdxFiles(full));
		else if (entry.endsWith('.mdx')) out.push(full);
	}
	return out;
}

const problems = [];
let checked = 0;

for (const file of mdxFiles(DOCS_DIR)) {
	const source = readFileSync(file, 'utf8');
	const where = relative(REPO_ROOT, file);

	for (const [tag] of source.matchAll(SRC_TAG)) {
		const pathMatch = tag.match(PATH_ATTR);
		if (!pathMatch) {
			problems.push(`${where}: <Src> with no \`path\` attribute — ${tag}`);
			continue;
		}

		const target = pathMatch[1].replace(/^\/+/, '');
		checked++;

		if (!existsSync(join(REPO_ROOT, target))) {
			problems.push(`${where}: \`${target}\` does not exist`);
			continue;
		}

		// A `lines` deep-link past the end of the file is the same class of rot as a
		// moved file — the link resolves, but lands nowhere useful.
		const linesMatch = tag.match(LINES_ATTR);
		if (linesMatch && statSync(join(REPO_ROOT, target)).isFile()) {
			const end = Number(linesMatch[2] ?? linesMatch[1]);
			const total = readFileSync(join(REPO_ROOT, target), 'utf8').split('\n').length;
			if (end > total) {
				problems.push(
					`${where}: \`${target}\` is ${total} lines but the link points at line ${end}`
				);
			}
		}
	}
}

if (problems.length > 0) {
	console.error('✗ broken docs source links:\n');
	for (const problem of problems) console.error(`  - ${problem}`);
	console.error(
		'\nUpdate the `<Src path="...">` in the docs to the file\'s new home, or drop the reference.'
	);
	process.exit(1);
}

console.log(`✓ ${checked} docs source link(s) point at real files`);
