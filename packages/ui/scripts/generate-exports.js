#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagePath = join(__dirname, '..', 'package.json');
const componentsPath = join(__dirname, '..', 'src', 'lib', 'components', 'ui');

// Read the current package.json
const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

// Get all component directories
const components = readdirSync(componentsPath, { withFileTypes: true })
	.filter((dirent) => dirent.isDirectory())
	.map((dirent) => dirent.name)
	.sort();

// Generate exports
const exports = {
	'./package.json': './package.json'
};

// Add each component
for (const component of components) {
	exports[`./shadcn/${component}`] = {
		types: `./dist/components/ui/${component}/index.d.ts`,
		svelte: `./dist/components/ui/${component}/index.js`,
		default: `./dist/components/ui/${component}/index.js`
	};
}

// Add CSS and utils
exports['./shadcn/css'] = './src/app.css';
exports['./utils'] = {
	types: './dist/utils.d.ts',
	default: './dist/utils.js'
};

// Update package.json
packageJson.exports = exports;

// Write back to package.json
writeFileSync(packagePath, JSON.stringify(packageJson, null, '\t') + '\n');

console.log(`✅ Generated exports for ${components.length} components`);
console.log(`📦 Components: ${components.join(', ')}`);
