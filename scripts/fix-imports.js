#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Recursively get all files in a directory
 */
async function getFiles(dir, files = []) {
	const entries = await readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			await getFiles(path, files);
		} else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.d.ts'))) {
			files.push(path);
		}
	}

	return files;
}

/**
 * Fix imports in a file by adding .js extensions to relative imports and dayjs plugin imports
 */
async function fixImportsInFile(filePath) {
	let content = await readFile(filePath, 'utf-8');
	let modified = false;

	// Regex patterns for import/export statements
	const patterns = [
		// import ... from './path'
		/from\s+['"](\.[^'"]+)['"]/g,
		// export ... from './path'
		/export\s+.*\s+from\s+['"](\.[^'"]+)['"]/g,
		// import('./path')
		/import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g,
		// require('./path')
		/require\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g
	];

	for (const pattern of patterns) {
		content = content.replace(pattern, (match, importPath) => {
			// Skip if already has an extension
			if (
				importPath.endsWith('.js') ||
				importPath.endsWith('.json') ||
				importPath.endsWith('.svelte')
			) {
				return match;
			}

			// Add .js extension
			const newImportPath = importPath + '.js';
			const newMatch = match.replace(importPath, newImportPath);
			modified = true;
			return newMatch;
		});
	}

	// Fix dayjs plugin imports (need .js extension for ESM)
	const dayjsPattern = /from\s+['"]dayjs\/plugin\/([^'"]+)['"]/g;
	content = content.replace(dayjsPattern, (match, pluginName) => {
		// Skip if already has .js extension
		if (pluginName.endsWith('.js')) {
			return match;
		}
		modified = true;
		return match.replace(pluginName, pluginName + '.js');
	});

	if (modified) {
		await writeFile(filePath, content, 'utf-8');
		console.log(`✓ Fixed imports in: ${filePath}`);
	}

	return modified;
}

/**
 * Main function
 */
async function main() {
	const distDir = process.argv[2];

	if (!distDir) {
		console.error('Usage: node fix-imports.js <dist-directory>');
		process.exit(1);
	}

	console.log(`\nFixing imports in: ${distDir}\n`);

	const files = await getFiles(distDir);
	let fixedCount = 0;

	for (const file of files) {
		const wasFixed = await fixImportsInFile(file);
		if (wasFixed) {
			fixedCount++;
		}
	}

	console.log(`\n✓ Fixed ${fixedCount} file(s) with ${files.length} total files processed\n`);
}

main().catch((error) => {
	console.error('Error fixing imports:', error);
	process.exit(1);
});
