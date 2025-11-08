#!/usr/bin/env node
/**
 * CLI script to generate TypeScript types from Aphex CMS schema
 *
 * Usage:
 *   npm run generate-types <schema-path> <output-path>
 *
 * Example:
 *   npm run generate-types ./src/lib/schemaTypes/index.ts ./src/lib/generated-types.ts
 */
import { generateTypesFromConfig } from '../src/lib/codegen/index.js';
import { resolve } from 'path';

const args = process.argv.slice(2);

if (args.length !== 2) {
	console.error('Usage: generate-types <schema-path> <output-path>');
	console.error('Example: generate-types ./src/lib/schemaTypes/index.ts ./src/lib/generated-types.ts');
	process.exit(1);
}

const [schemaPath, outputPath] = args;

// Resolve paths relative to CWD
const resolvedSchemaPath = resolve(process.cwd(), schemaPath);
const resolvedOutputPath = resolve(process.cwd(), outputPath);

console.log(`📝 Generating types from: ${resolvedSchemaPath}`);
console.log(`📦 Output to: ${resolvedOutputPath}`);

generateTypesFromConfig(resolvedSchemaPath, resolvedOutputPath)
	.then(() => {
		console.log('✨ Type generation complete!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('❌ Type generation failed:', error);
		process.exit(1);
	});
