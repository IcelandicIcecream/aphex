#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const monorepoRoot = join(__dirname, '../../..');
const rootTemplatesDir = join(monorepoRoot, 'templates');
const packagesDir = join(monorepoRoot, 'packages');
const packageTemplatesDir = join(__dirname, '../templates');

console.log('Copying templates...');

if (!existsSync(rootTemplatesDir)) {
	console.error('Templates directory not found at:', rootTemplatesDir);
	process.exit(1);
}

// Clean and create templates directory
if (existsSync(packageTemplatesDir)) {
	console.log('Cleaning existing templates directory...');
	rmSync(packageTemplatesDir, { recursive: true });
}

mkdirSync(packageTemplatesDir, { recursive: true });

// Copy templates, excluding build artifacts and dependencies
cpSync(rootTemplatesDir, packageTemplatesDir, {
	recursive: true,
	filter: (src) => {
		const excludePatterns = [
			'node_modules',
			'.vite',
			'.svelte-kit',
			'.turbo',
			'dist',
			'build',
			'.DS_Store',
			'.env'
		];
		if (src.endsWith('.env.example')) return true;
		return !excludePatterns.some((pattern) => src.includes(`/${pattern}`));
	}
});

// Resolve workspace:* references in copied template package.json files
function getPackageVersion(packageName) {
	if (!existsSync(packagesDir)) return null;
	for (const dir of readdirSync(packagesDir)) {
		const pkgJsonPath = join(packagesDir, dir, 'package.json');
		if (existsSync(pkgJsonPath)) {
			const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
			if (pkgJson.name === packageName) {
				return pkgJson.version;
			}
		}
	}
	return null;
}

for (const templateDir of readdirSync(packageTemplatesDir)) {
	const pkgJsonPath = join(packageTemplatesDir, templateDir, 'package.json');
	if (!existsSync(pkgJsonPath)) continue;

	const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
	let modified = false;

	for (const depType of ['dependencies', 'devDependencies']) {
		const deps = pkgJson[depType];
		if (!deps) continue;
		for (const [name, version] of Object.entries(deps)) {
			if (typeof version === 'string' && version.startsWith('workspace:')) {
				const resolved = getPackageVersion(name);
				if (resolved) {
					deps[name] = `^${resolved}`;
					modified = true;
					console.log(`  Resolved ${name}: workspace:* → ^${resolved}`);
				} else {
					console.warn(`  Warning: could not resolve version for ${name}`);
				}
			}
		}
	}

	if (modified) {
		writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, '\t') + '\n');
	}
}

console.log('Templates copied successfully!');
