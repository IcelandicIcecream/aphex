#!/usr/bin/env node
/**
 * Rewrites a template's `workspace:*` deps to the real published versions
 * (`^x.y.z`), reading each version from the workspace package that provides it.
 *
 * A template only resolves `workspace:*` while it sits inside the monorepo.
 * Anything that consumes it standalone — the mirror repos, a Docker build whose
 * context is just the template folder — has to pin real versions first, or pnpm
 * fails with ERR_PNPM_WORKSPACE_PKG_NOT_FOUND.
 *
 * Usage: node scripts/resolve-workspace-deps.mjs templates/blog
 */
import fs from 'fs';
import path from 'path';

const templateDir = process.argv[2];
if (!templateDir) {
	console.error('Usage: node scripts/resolve-workspace-deps.mjs <template-dir>');
	process.exit(1);
}

// Every published workspace package, by name → version.
const versions = {};
for (const root of ['packages', 'plugins']) {
	if (!fs.existsSync(root)) continue;
	for (const dir of fs.readdirSync(root)) {
		const p = path.join(root, dir, 'package.json');
		if (!fs.existsSync(p)) continue;
		const j = JSON.parse(fs.readFileSync(p, 'utf8'));
		if (j.name && j.version) versions[j.name] = j.version;
	}
}

const pkgPath = path.join(templateDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

let changed = false;
for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
	const deps = pkg[field];
	if (!deps) continue;
	for (const [name, spec] of Object.entries(deps)) {
		if (typeof spec !== 'string' || !spec.startsWith('workspace:')) continue;
		const v = versions[name];
		if (!v) {
			console.error(`No workspace package provides ${name}`);
			process.exit(1);
		}
		deps[name] = `^${v}`;
		console.log(`  ${name}: workspace:* → ^${v}`);
		changed = true;
	}
}

if (changed) {
	fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n');
} else {
	console.log('  no workspace:* deps to resolve');
}
