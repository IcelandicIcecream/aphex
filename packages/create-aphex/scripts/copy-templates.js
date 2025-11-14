#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootTemplatesDir = join(__dirname, '../../../templates');
const packageTemplatesDir = join(__dirname, '../templates');

console.log('Copying templates...');

if (!existsSync(rootTemplatesDir)) {
	console.error('Templates directory not found at:', rootTemplatesDir);
	process.exit(1);
}

// Clean and create templates directory
if (existsSync(packageTemplatesDir)) {
	console.log('Cleaning existing templates directory...');
}

mkdirSync(packageTemplatesDir, { recursive: true });

// Copy templates, excluding build artifacts and dependencies
cpSync(rootTemplatesDir, packageTemplatesDir, {
	recursive: true,
	filter: (src) => {
		// Exclude node_modules, build artifacts, system files, and .env files
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
		return !excludePatterns.some((pattern) => src.includes(`/${pattern}`));
	}
});

console.log('Templates copied successfully!');
