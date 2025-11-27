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
		case 'url':
			return 'string';
		case 'number':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'date':
			// Dates are stored as ISO date strings (YYYY-MM-DD)
			return 'string';
		case 'datetime':
			// Datetimes are stored as ISO datetime strings in UTC (YYYY-MM-DDTHH:mm:ssZ)
			return 'string';
		case 'image':
			// Image fields store reference to asset
			return 'string'; // Asset ID
		case 'array': {
			if (!('of' in field) || !field.of || field.of.length === 0) {
				return 'unknown[]';
			}
			// Map each array item type
			const types = field.of
				.map((item) => {
					// Check if it's a reference to a named object schema
					const refSchema = schemaMap.get(item.type);
					if (refSchema && refSchema.type === 'object') {
						// Named reference - use the schema name
						return pascalCase(item.type);
					}
					// Otherwise, it's either an inline object or a primitive
					// Recursively map it (will handle object, text, string, etc.)
					return mapFieldTypeToTS(item as Field, schemaMap);
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

			// Build comment with description and format information
			let comment = '';
			if (field.description || field.type === 'date' || field.type === 'datetime') {
				const parts: string[] = [];

				if (field.description) {
					parts.push(field.description);
				}

				if (field.type === 'date') {
					const dateField = field as any;
					const format = dateField.options?.dateFormat || 'YYYY-MM-DD';
					parts.push(`@format ISO date string (YYYY-MM-DD) - displays as ${format}`);
				} else if (field.type === 'datetime') {
					const dateTimeField = field as any;
					const dateFormat = dateTimeField.options?.dateFormat || 'YYYY-MM-DD';
					const timeFormat = dateTimeField.options?.timeFormat || 'HH:mm';
					parts.push(
						`@format ISO datetime string in UTC (YYYY-MM-DDTHH:mm:ssZ) - displays as ${dateFormat} ${timeFormat}`
					);
				}

				comment = `  /**\n   * ${parts.join('\n   * ')}\n   */\n`;
			}

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
	const documentInterfaces = documentSchemas
		.map((s) => generateInterface(s, schemaMap))
		.join('\n\n');

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
			const fs = await import('fs/promises');
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
						name: 'remove-icons',
						setup(build) {
							// Intercept lucide icon imports and provide empty stub module
							build.onResolve({ filter: /^@lucide\/svelte/ }, (args) => {
								return { path: args.path, namespace: 'lucide-stub' };
							});

							// Return empty stub for lucide modules
							build.onLoad({ filter: /.*/, namespace: 'lucide-stub' }, () => {
								return {
									contents: 'export default {}',
									loader: 'js'
								};
							});

							// Transform source files to remove icon usage in schemas
							build.onLoad({ filter: /\.(ts|js)$/ }, async (args) => {
								const contents = await fs.readFile(args.path, 'utf8');

								// Remove icon usage in schema definitions (icon: IconName -> icon: undefined)
								const transformed = contents.replace(/icon:\s*\w+/g, 'icon: undefined');

								return {
									contents: transformed,
									loader: args.path.endsWith('.ts') ? 'ts' : 'js'
								};
							});
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
