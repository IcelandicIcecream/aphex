#!/usr/bin/env node
/**
 * check-plugin-versions.mjs — the version a plugin reports must be the version it is.
 *
 * Each plugin passes a literal to `definePlugin({ name, version })`, and that value
 * is what the admin's plugin list, the part resolver and any diagnostics show. It is
 * written by hand, while the real version is bumped by changesets in package.json —
 * so the two drift the first time a plugin is released, silently and permanently.
 *
 * Why a guard rather than deriving it from package.json at runtime: the publish flow
 * swaps every package between a `src/lib/*` and a `dist/*` layout, so the relative
 * path to the manifest is different in the two, and `import.meta.url` is not a
 * filesystem path once Vite has bundled the plugin into an app. Both of the obvious
 * "derive it" implementations are therefore wrong in one of the two layouts. Checking
 * the literal costs nothing and fails loudly at the only moment that matters — before
 * the release that would introduce the drift.
 *
 * Usage: node scripts/check-plugin-versions.mjs
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const PLUGINS_DIR = join(REPO_ROOT, 'plugins');

const problems = [];
let checked = 0;

for (const entry of readdirSync(PLUGINS_DIR)) {
	const pkgPath = join(PLUGINS_DIR, entry, 'package.json');
	const indexPath = join(PLUGINS_DIR, entry, 'src/lib/index.ts');
	if (!existsSync(pkgPath) || !existsSync(indexPath)) continue;

	const { name, version } = JSON.parse(readFileSync(pkgPath, 'utf8'));
	const source = readFileSync(indexPath, 'utf8');

	// The `version:` passed to definePlugin. Matches both the inline-name form
	// (`{ name: '@aphexcms/plugin-seo', version: '0.1.0' }`) and the constant form
	// (`{ name: PLUGIN_ID, version: '0.1.0' }`).
	const match = source.match(/definePlugin\(\{[^}]*?version:\s*['"]([^'"]+)['"]/s);
	if (!match) {
		problems.push(`${name}: no literal version found in src/lib/index.ts`);
		continue;
	}

	checked += 1;
	if (match[1] !== version) {
		problems.push(
			`${name}: definePlugin reports ${match[1]} but package.json says ${version} — ` +
				`update the literal in plugins/${entry}/src/lib/index.ts`
		);
	}
}

if (problems.length > 0) {
	console.error('✗ plugin version mismatch:\n');
	for (const problem of problems) console.error(`  - ${problem}`);
	console.error('\nThe reported version is what the admin UI and diagnostics show.');
	process.exit(1);
}

console.log(`✓ ${checked} plugin(s) report their real package version`);
