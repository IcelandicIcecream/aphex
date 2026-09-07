#!/usr/bin/env node
/**
 * verify-packed-packages.mjs — check what users actually receive.
 *
 * Why this exists
 * ---------------
 * Every other check in CI resolves `@aphexcms/*` through workspace links, which
 * point at each package's **source**: `exports` say `./src/lib/index.js` while the
 * package sits in the repo, and only `prepack` swaps them to `./dist`. So the
 * repo can be green while the published artifact is unusable, and it has been:
 *
 *   - `cms-core` shipped an import of the *directory* `'../../../images'`, which
 *     `svelte-package` rewrote to `'../../../images.js'` — a file that does not
 *     exist, because the directory is emitted as `images/index.js`. Every consumer
 *     installing from npm failed to build. Nothing in the monorepo noticed, because
 *     Vite does directory resolution and the workspace resolves through `src`.
 *   - `plugin-forms` emitted `dist/lib/index.js` while `prepack` rewrote its exports
 *     to `./dist/index.js`, so every export path in the tarball pointed at a missing
 *     file.
 *
 * Both are the same shape of bug: only true of the built artifact, and invisible
 * until someone installs it. This script packs each publishable package exactly as
 * `changeset publish` would and then interrogates the tarball.
 *
 * What it checks
 * --------------
 *   1. **Export targets exist.** Every file named by `main`, `types`, `svelte`,
 *      `module` and every leaf of `exports` must be present in the tarball.
 *   2. **Relative imports resolve, literally.** Node's ESM resolver does no
 *      extension guessing and no directory resolution, so every relative specifier
 *      in an emitted `.js`/`.d.ts` must name a file that exists, exactly as
 *      written. This is the check that would have caught both bugs above.
 *   3. **Node can import it.** A package that declares a `svelte` export condition
 *      ships components — Node cannot load a `.svelte` file, so those are
 *      bundler-only by construction and are checked statically (1 and 2) but not
 *      imported. Everything else must import cleanly under plain Node.
 *
 * Usage: node scripts/verify-packed-packages.mjs [--keep]
 */

import { execFileSync } from 'node:child_process';
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const KEEP = process.argv.includes('--keep');

const failures = [];
const notes = [];

function fail(pkg, message) {
	failures.push(`${pkg}: ${message}`);
}

function run(cmd, args, cwd) {
	return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Every workspace package that `changeset publish` would push to npm. */
function publishablePackages() {
	const found = [];
	for (const group of ['packages', 'plugins']) {
		const groupDir = join(REPO_ROOT, group);
		if (!existsSync(groupDir)) continue;
		for (const entry of readdirSync(groupDir)) {
			const pkgPath = join(groupDir, entry, 'package.json');
			if (!existsSync(pkgPath)) continue;
			const json = JSON.parse(readFileSync(pkgPath, 'utf8'));
			if (json.private || !json.name) continue;
			found.push({ name: json.name, dir: join(groupDir, entry) });
		}
	}
	return found.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * How a package is meant to be consumed, which decides how strictly it can be
 * checked:
 *   'node'     — plain JS; Node must be able to import it, so relative specifiers
 *                must resolve literally (no extension guessing, no directories).
 *   'bundler'  — ships Svelte components; only ever loaded through Vite.
 *   'bin'      — an executable with no importable entry point.
 */
function classify(json) {
	const shipsComponents =
		JSON.stringify(json.exports ?? {}).includes('"svelte"') || Boolean(json.svelte);
	if (shipsComponents) return 'bundler';
	if (!json.main && !json.exports && json.bin) return 'bin';
	return 'node';
}

/** Collect every string leaf under an `exports` map. */
function exportTargets(exportsField) {
	const targets = [];
	const walk = (node) => {
		if (typeof node === 'string') {
			targets.push(node);
		} else if (node && typeof node === 'object') {
			for (const value of Object.values(node)) walk(value);
		}
	};
	walk(exportsField);
	return targets;
}

function allFiles(dir, out = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) allFiles(path, out);
		else out.push(path);
	}
	return out;
}

/**
 * Remove `//` line comments and block comments. Deliberately crude — it can also
 * blank the inside of a string literal that contains `//`, which for this use
 * (finding import specifiers) only ever removes candidates, never invents them.
 */
function stripComments(source) {
	return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

// Matches the specifier in `from '…'`, `import('…')` and `require('…')`.
const RELATIVE_SPECIFIER = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"](\.[^'"]*)['"]/g;

function checkRelativeImports(pkgName, root, json, { strict }) {
	// Walk the import graph outward from the package's declared entry points rather
	// than scanning every file in the tarball. A consumer can only ever reach what
	// `exports` names and what those files transitively import, so this reports
	// exactly the breakage a consumer would hit — and does not report a file that
	// ships but is unreachable, which is a size problem, not a correctness one.
	const entries = declaredTargets(json)
		.filter((target) => !target.includes('*'))
		.map((target) => join(root, target))
		.filter((path) => existsSync(path));

	const seen = new Set();
	const queue = [...entries];
	let reached = 0;

	while (queue.length > 0) {
		const file = queue.pop();
		if (seen.has(file)) continue;
		seen.add(file);

		const ext = extname(file);
		if (ext !== '.js' && ext !== '.ts') continue;
		if (file.endsWith('.map') || !existsSync(file)) continue;
		reached += 1;

		// Strip comments first. `from './parts.svelte'` appearing inside a comment
		// that *documents* an import pattern is not an import, and matching it
		// reports a missing file that was never referenced.
		const source = stripComments(readFileSync(file, 'utf8'));
		for (const match of source.matchAll(RELATIVE_SPECIFIER)) {
			const specifier = match[1];
			const target = resolve(dirname(file), specifier);

			const candidates = [target];
			if (file.endsWith('.d.ts') && specifier.endsWith('.js')) {
				candidates.push(target.replace(/\.js$/, '.d.ts'));
			}

			const exact = candidates.find((candidate) => existsSync(candidate));
			if (exact) {
				queue.push(exact);
				continue;
			}

			// A bundler-only package is never loaded by Node's resolver, and Vite
			// resolves an extensionless specifier or a directory happily. Accept
			// those there; the specifier still has to name something that exists.
			const loose = [
				`${target}.js`,
				join(target, 'index.js'),
				`${target}.svelte`,
				`${target}.d.ts`
			].find((candidate) => existsSync(candidate));
			if (!strict && loose) {
				queue.push(loose);
				continue;
			}

			const hint = existsSync(`${target}.js`)
				? 'missing .js extension (Node ESM does not guess extensions)'
				: existsSync(join(target, 'index.js'))
					? 'directory import (Node ESM does not resolve /index.js)'
					: 'no such file';
			fail(pkgName, `${relative(root, file)} imports '${specifier}' — ${hint}`);
		}
	}

	// Runtime modules that ship but nothing can reach. Advisory, not a failure — a
	// whole duplicate tree here means the build emits something twice and every
	// consumer downloads it.
	//
	// Skipped for a package with a `./*` wildcard export, where by construction a
	// consumer can reach any file and "unreachable" means nothing. Counts `.js`
	// only: a `.d.ts` is reached through the `types` condition, which this walk
	// does not follow, so including them would report every package as half dead.
	const hasWildcardExport = declaredTargets(json).some((target) => target.includes('*'));
	const shipped = allFiles(root).filter(
		(file) => extname(file) === '.js' && !file.endsWith('.map') && !file.endsWith('.d.ts')
	);
	const unreachable = shipped.filter((file) => !seen.has(file));
	if (!hasWildcardExport && unreachable.length > shipped.length * 0.2) {
		const topLevel = new Set(
			unreachable.map((file) => relative(root, file).split('/').slice(0, 2).join('/'))
		);
		notes.push(
			`${pkgName}: ${unreachable.length}/${shipped.length} shipped modules are unreachable ` +
				`from exports (${[...topLevel].slice(0, 3).join(', ')}${topLevel.size > 3 ? ', …' : ''})`
		);
	}

	return reached;
}

/** `main`/`types`/`svelte`/`module` plus every leaf of `exports`. */
function declaredTargets(json) {
	return [json.main, json.types, json.svelte, json.module, ...exportTargets(json.exports)].filter(
		(value) => typeof value === 'string' && value.startsWith('.')
	);
}

function checkExportTargets(pkgName, root, json) {
	for (const target of new Set(declaredTargets(json))) {
		// Wildcard subpaths (`./*`) can't be checked as literal files.
		if (target.includes('*')) continue;
		const path = join(root, target);
		if (!existsSync(path) || !statSync(path).isFile()) {
			fail(pkgName, `export target "${target}" is not a file in the tarball`);
		}
	}
}

function main() {
	const packages = publishablePackages();
	console.log(`▸ building ${packages.length} publishable packages`);
	run('pnpm', ['build'], REPO_ROOT);

	const workDir = mkdtempSync(join(tmpdir(), 'aphex-packcheck-'));
	console.log(`▸ working in ${workDir}`);

	const tarballs = new Map();

	for (const pkg of packages) {
		// `pnpm pack` fires prepack/postpack, so the tarball carries dist paths —
		// which is the whole point of packing rather than reading package.json.
		const output = run('pnpm', ['pack', '--pack-destination', workDir], pkg.dir);
		const tarball = output
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.endsWith('.tgz'))
			.pop();
		if (!tarball || !existsSync(tarball)) {
			fail(pkg.name, 'pnpm pack produced no tarball');
			continue;
		}
		tarballs.set(pkg.name, tarball);

		const extractDir = join(workDir, `x-${pkg.name.replace(/[@/]/g, '_')}`);
		run('mkdir', ['-p', extractDir], workDir);
		run('tar', ['-xzf', tarball, '-C', extractDir], workDir);
		const root = join(extractDir, 'package');

		const json = JSON.parse(readFileSync(root + '/package.json', 'utf8'));
		const kind = classify(json);
		checkExportTargets(pkg.name, root, json);
		checkRelativeImports(pkg.name, root, json, { strict: kind === 'node' });

		// A bin-only package exposes no importable entry by design; check that the
		// executable it points at actually shipped, which is the equivalent mistake.
		if (kind === 'bin') {
			for (const target of Object.values(json.bin ?? {})) {
				if (!existsSync(join(root, target))) {
					fail(pkg.name, `bin target "${target}" is not in the tarball`);
				}
			}
		}

		pkg.kind = kind;
		if (kind !== 'node') {
			notes.push(
				`${pkg.name}: static checks only (${
					kind === 'bin'
						? 'executable, no importable entry'
						: 'ships Svelte components, bundler-only'
				})`
			);
		}
	}

	// Import the plain-JS packages from a directory that is not a workspace member,
	// with every @aphexcms/* dep overridden to the tarball we just built — otherwise
	// pnpm resolves them to the *published* versions and this proves nothing.
	const importable = packages.filter((pkg) => pkg.kind === 'node');

	if (importable.length > 0) {
		const appDir = join(workDir, 'importcheck');
		const overrides = Object.fromEntries(
			[...tarballs].map(([name, path]) => [name, `file:${path}`])
		);
		run('mkdir', ['-p', appDir], workDir);
		// Peers are the consumer's job to install, so a scratch app that omits them
		// fails with "Cannot find package 'graphql'" and blames the wrong thing.
		// Collect every peer the packed packages declare, minus the @aphexcms/* ones
		// already coming from tarballs.
		const peers = {};
		for (const pkg of packages) {
			const json = JSON.parse(readFileSync(join(pkg.dir, 'package.json'), 'utf8'));
			for (const [name, range] of Object.entries(json.peerDependencies ?? {})) {
				if (name.startsWith('@aphexcms/')) continue;
				peers[name] = String(range).startsWith('workspace:') ? 'latest' : range;
			}
		}

		const manifest = {
			name: 'aphex-import-check',
			private: true,
			type: 'module',
			version: '1.0.0',
			// EVERY packed package, not just the importable ones. A dependency left
			// out here is fetched from the *registry* instead, and then this script
			// silently tests the last published version rather than the working tree
			// — which is exactly how a first run "found" an already-fixed bug.
			dependencies: {
				...peers,
				...Object.fromEntries([...tarballs].map(([name, path]) => [name, `file:${path}`]))
			},
			pnpm: { overrides }
		};
		writeFileSync(join(appDir, 'package.json'), JSON.stringify(manifest, null, 2));

		console.log(`▸ installing ${importable.length} tarballs outside the workspace`);
		try {
			run('pnpm', ['install', '--ignore-workspace', '--no-frozen-lockfile'], appDir);
		} catch (error) {
			fail('(install)', error.stdout || error.message);
		}

		for (const pkg of importable) {
			try {
				run(
					'node',
					['--input-type=module', '-e', `await import(${JSON.stringify(pkg.name)});`],
					appDir
				);
			} catch (error) {
				const detail = (error.stderr || error.message).split('\n').slice(0, 6).join('\n');
				fail(pkg.name, `cannot be imported by Node from a packed install:\n${detail}`);
			}
		}
	}

	if (!KEEP) rmSync(workDir, { recursive: true, force: true });

	for (const note of notes) console.log(`  · ${note}`);

	if (failures.length > 0) {
		console.error(`\n✗ ${failures.length} packaging problem(s):\n`);
		for (const failure of failures) console.error(`  - ${failure}`);
		process.exit(1);
	}

	console.log(`\n✓ ${packages.length} packages pack, resolve and import cleanly`);
}

main();
