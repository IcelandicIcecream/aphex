/**
 * Type generator for Aphex CMS
 * Generates TypeScript types from schema definitions with module augmentation
 */
import type { SchemaType, Field } from '../lib/types/schemas';
import { isFieldRequired } from '../lib/field-validation/utils';

/**
 * Map Aphex field types to TypeScript types
 */
function mapFieldTypeToTS(field: Field, schemaMap: Map<string, SchemaType>): string {
	switch (field.type) {
		case 'string':
		case 'text':
		case 'slug':
			return 'string';
		case 'number':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'image':
			// Image fields store reference to asset
			return 'string'; // Asset ID
		case 'array': {
			if (!('of' in field) || !field.of || field.of.length === 0) {
				return 'unknown[]';
			}
			// Union of all possible array item types
			const types = field.of
				.map((ref) => {
					const refSchema = schemaMap.get(ref.type);
					if (refSchema && refSchema.type === 'object') {
						return pascalCase(ref.type);
					}
					return 'unknown';
				})
				.filter((t) => t !== 'unknown');
			if (types.length === 0) {
				return 'unknown[]';
			}
			return types.length === 1 ? `${types[0]}[]` : `Array<${types.join(' | ')}>`;
		}
		case 'object': {
			if (!('fields' in field) || !field.fields) {
				return 'Record<string, unknown>';
			}
			// Generate inline interface for object fields
			const props = field.fields
				.map((f) => {
					const tsType = mapFieldTypeToTS(f, schemaMap);
					const optional = isFieldOptional(f) ? '?' : '';
					return `  ${f.name}${optional}: ${tsType};`;
				})
				.join('\n');
			return `{\n${props}\n}`;
		}
		case 'reference': {
			// References store document ID as string
			return 'string';
		}
		default:
			return 'unknown';
	}
}

/**
 * Convert kebab-case or snake_case to PascalCase
 */
function pascalCase(str: string): string {
	return str
		.split(/[-_]/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join('');
}

/**
 * Determine if a field is optional based on validation rules
 */
function isFieldOptional(field: Field): boolean {
	return !isFieldRequired(field);
}

/**
 * Generate TypeScript interface for a schema type
 */
function generateInterface(schema: SchemaType, schemaMap: Map<string, SchemaType>): string {
	const interfaceName = pascalCase(schema.name);
	const fields = schema.fields
		.map((field) => {
			const tsType = mapFieldTypeToTS(field, schemaMap);
			const optional = isFieldOptional(field) ? '?' : '';
			const comment = field.description ? `  /** ${field.description} */\n` : '';
			return `${comment}  ${field.name}${optional}: ${tsType};`;
		})
		.join('\n');

	// Add id and _meta fields for document types
	const isDocument = schema.type === 'document';
	const metadataFields = isDocument
		? `  /** Document ID */
  id: string;
${fields}
  /** Document metadata */
  _meta?: {
    type: string;
    status: 'draft' | 'published';
    organizationId: string;
    createdAt: Date | null;
    updatedAt: Date | null;
    createdBy?: string;
    updatedBy?: string;
    publishedAt?: Date | null;
    publishedHash?: string | null;
  };`
		: fields;

	return `export interface ${interfaceName} {\n${metadataFields}\n}`;
}

/**
 * Generate the Collections interface augmentation
 */
function generateCollectionsAugmentation(documentSchemas: SchemaType[]): string {
	const mappings = documentSchemas
		.map((schema) => {
			const interfaceName = pascalCase(schema.name);
			return `    ${schema.name}: CollectionAPI<${interfaceName}>;`;
		})
		.join('\n');

	return `declare module '@aphexcms/cms-core/server' {
  interface Collections {
${mappings}
  }
}`;
}

/**
 * Generate complete TypeScript types file with module augmentation
 */
export function generateTypes(schemas: SchemaType[]): string {
	// Create schema map for lookups
	const schemaMap = new Map<string, SchemaType>(schemas.map((s) => [s.name, s]));

	// Separate document and object types
	const documentSchemas = schemas.filter((s) => s.type === 'document');
	const objectSchemas = schemas.filter((s) => s.type === 'object');

	// Generate interfaces for all schemas
	const objectInterfaces = objectSchemas.map((s) => generateInterface(s, schemaMap)).join('\n\n');
	const documentInterfaces = documentSchemas.map((s) => generateInterface(s, schemaMap)).join('\n\n');

	// Generate Collections interface augmentation
	const collectionsAugmentation = generateCollectionsAugmentation(documentSchemas);

	// Build the complete file
	const output = `/**
 * Generated types for Aphex CMS
 * This file is auto-generated - DO NOT EDIT manually
 */
import type { CollectionAPI } from '@aphexcms/cms-core/server';

// ============================================================================
// Object Types (nested in documents)
// ============================================================================

${objectInterfaces}

// ============================================================================
// Document Types (collections)
// ============================================================================

${documentInterfaces}

// ============================================================================
// Module Augmentation - Extends Collections interface globally
// ============================================================================

${collectionsAugmentation}
`;

	return output;
}

/**
 * CLI helper to generate types from schema file
 */
export async function generateTypesFromConfig(
	schemaPath: string,
	outputPath: string
): Promise<void> {
	try {
		// Resolve paths relative to current working directory
		const path = await import('path');
		const { pathToFileURL } = await import('url');
		const fs = await import('fs/promises');
		const absoluteSchemaPath = path.resolve(process.cwd(), schemaPath);
		const absoluteOutputPath = path.resolve(process.cwd(), outputPath);

		// If the schema file is TypeScript, compile it with esbuild first
		let schemaModulePath = absoluteSchemaPath;
		let tempFile: string | null = null;

		if (absoluteSchemaPath.endsWith('.ts')) {
			const { build } = await import('esbuild');
			const tempOutFile = path.join(path.dirname(absoluteSchemaPath), '.temp-schema.mjs');

			await build({
				entryPoints: [absoluteSchemaPath],
				bundle: true,
				format: 'esm',
				platform: 'node',
				outfile: tempOutFile,
				external: ['@aphexcms/*'],
				plugins: [
					{
						name: 'stub-icons',
						setup(build) {
							// Stub out icon imports - they're not needed for type generation
							build.onResolve({ filter: /^(lucide-svelte|@lucide\/svelte)/ }, (args) => ({
								path: args.path,
								namespace: 'stub-icons'
							}));
							build.onLoad({ filter: /.*/, namespace: 'stub-icons' }, () => ({
								contents: 'export default {}',
								loader: 'js'
							}));
						}
					}
				]
			});

			schemaModulePath = tempOutFile;
			tempFile = tempOutFile;
		}

		// Dynamic import the schema types
		// Use file:// URL for proper ESM import
		const schemaModule = await import(pathToFileURL(schemaModulePath).href);
		const schemas = schemaModule.schemaTypes || schemaModule.default;

		// Clean up temp file if created
		if (tempFile) {
			try {
				await fs.unlink(tempFile);
			} catch {
				// Ignore cleanup errors
			}
		}

		if (!schemas || !Array.isArray(schemas)) {
			throw new Error('Invalid schema file: expected schemaTypes array export');
		}

		const generatedTypes = generateTypes(schemas);

		// Write to output file
		await fs.writeFile(absoluteOutputPath, generatedTypes, 'utf-8');

		console.log(`✅ Types generated successfully at: ${absoluteOutputPath}`);
	} catch (error) {
		console.error('❌ Failed to generate types:', error);
		throw error;
	}
}
