#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Swaps package.json paths between src/lib/ and dist/
 * Usage: node swap-package-paths.js <package-json-path> <src|dist> [src-subdir]
 *
 * For svelte-package projects: use 'lib' as src-subdir
 * For regular TypeScript: omit src-subdir
 */
async function swapPackagePaths(packageJsonPath, target, srcSubdir = '') {
	if (target !== 'src' && target !== 'dist') {
		throw new Error('Target must be "src" or "dist"');
	}

	const content = await readFile(packageJsonPath, 'utf-8');
	const pkg = JSON.parse(content);

	const srcPath = srcSubdir ? `./src/${srcSubdir}/` : './src/';
	const from = target === 'src' ? './dist/' : srcPath;
	const to = target === 'src' ? srcPath : './dist/';

	// Helper to replace paths in a value (string or object)
	function replacePaths(value) {
		if (typeof value === 'string') {
			return value.replace(new RegExp(from.replace(/\//g, '\\/'), 'g'), to);
		} else if (typeof value === 'object' && value !== null) {
			const result = Array.isArray(value) ? [] : {};
			for (const [key, val] of Object.entries(value)) {
				result[key] = replacePaths(val);
			}
			return result;
		}
		return value;
	}

	// Swap paths in main, types, svelte fields
	if (pkg.main) pkg.main = replacePaths(pkg.main);
	if (pkg.types) pkg.types = replacePaths(pkg.types);
	if (pkg.svelte) pkg.svelte = replacePaths(pkg.svelte);
	if (pkg.module) pkg.module = replacePaths(pkg.module);

	// Swap paths in exports
	if (pkg.exports) {
		pkg.exports = replacePaths(pkg.exports);
	}

	// Swap paths in files array
	if (pkg.files) {
		pkg.files = pkg.files.map(file => {
			if (file === 'src/lib' || file === 'src/lib/') {
				return target === 'dist' ? 'dist' : 'src/lib';
			}
			if (file === 'dist' || file === 'dist/') {
				return target === 'dist' ? 'dist' : 'src/lib';
			}
			return file;
		});
	}

	// Write back with pretty formatting
	await writeFile(packageJsonPath, JSON.stringify(pkg, null, '\t') + '\n', 'utf-8');
	console.log(`✓ Switched package.json to use ${target}/ paths`);
}

async function main() {
	const packageJsonPath = process.argv[2];
	const target = process.argv[3];
	const srcSubdir = process.argv[4] || '';

	if (!packageJsonPath || !target) {
		console.error('Usage: node swap-package-paths.js <package-json-path> <src|dist> [src-subdir]');
		console.error('Example: node swap-package-paths.js ./package.json src lib');
		process.exit(1);
	}

	await swapPackagePaths(packageJsonPath, target, srcSubdir);
}

main().catch((error) => {
	console.error('Error swapping package paths:', error);
	process.exit(1);
});
