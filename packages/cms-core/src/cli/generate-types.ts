/**
 * Type generator for Aphex CMS
 * Generates TypeScript types from schema definitions with module augmentation
 */
import type { SchemaType, Field } from '../lib/types/schemas';
import { isFieldRequired } from '../lib/field-validation/utils';

interface MapOptions {
	inArray?: boolean;
	/**
	 * When true, emit the depth=1 resolved shape: singular refs become the
	 * target's raw interface, array-of-refs become `Target[]`, and named
	 * object schemas reference their `*Resolved` variant (since refs inside
	 * the same document tree all resolve at depth=1).
	 */
	resolved?: boolean;
	/** Parent schema name — used to look up block content field info. */
	parentSchemaName?: string;
	/** Collected block content field info for union typing. */
	blockContentFields?: BlockContentFieldInfo[];
}

/**
 * Map Aphex field types to TypeScript types
 */
function mapFieldTypeToTS(
	field: Field,
	schemaMap: Map<string, SchemaType>,
	opts: MapOptions = {}
): string {
	const { inArray = false, resolved = false, parentSchemaName, blockContentFields } = opts;
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
			// Image fields store a Sanity-style value: { _type: 'image', asset: { _type: 'reference', _ref } }
			return 'ImageValue';
		case 'file':
			// File fields mirror image: { _type: 'file', asset: { _type: 'reference', _ref } }
			return 'FileValue';
		case 'array': {
			if (!('of' in field) || !field.of || field.of.length === 0) {
				return 'unknown[]';
			}
			if (field.of.some((item) => item.type === 'block')) {
				if (parentSchemaName && blockContentFields) {
					const info = blockContentFields.find(
						(f) => f.schemaName === parentSchemaName && f.fieldName === field.name
					);
					if (info) return getBlockContentArrayType(info);
				}
				return 'PortableTextBlock[]';
			}
			// Map each array item type. Items get `_key?` injected at runtime by
			// ArrayField for stable DnD ordering; reflect that in the type.
			const types = field.of
				.map((item) => {
					// Reference array item: stored as { _type: 'reference', _ref, _key }.
					// Raw mode → Reference<Target>; resolved mode → Target (the raw
					// target — at depth=1 the resolver doesn't recurse into the
					// fetched docs, so their inner refs stay raw).
					if (item.type === 'reference') {
						const to = (item as any).to as Array<{ type: string }> | undefined;
						const targets =
							to
								?.map((t) => {
									const target = schemaMap.get(t.type);
									return target ? pascalCase(t.type) : null;
								})
								.filter((s): s is string => !!s) ?? [];
						if (targets.length === 0) {
							return resolved ? 'unknown' : 'Reference<unknown>';
						}
						const union = targets.join(' | ');
						if (resolved) {
							return targets.length === 1 ? targets[0]! : `(${union})`;
						}
						return targets.length === 1 ? `Reference<${targets[0]}>` : `Reference<${union}>`;
					}
					// Named object schema — refs inside it are part of the same
					// document tree, so in resolved mode point at the *Resolved
					// variant (only if it actually has refs; otherwise no Resolved
					// variant was emitted).
					const refSchema = schemaMap.get(item.type);
					if (refSchema && refSchema.type === 'object') {
						const useResolved = resolved && hasReferences(refSchema, schemaMap);
						const name = pascalCase(item.type) + (useResolved ? 'Resolved' : '');
						return `(${name} & { _key?: string })`;
					}
					// Inline object or primitive — recurse, propagating resolved.
					return mapFieldTypeToTS(item as Field, schemaMap, { inArray: true, resolved });
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
			// Generate inline interface for object fields. When this object is
			// itself an array item, prepend the runtime-only `_key?` and
			// `_type?` discriminator props.
			const arrayMeta = inArray ? '  _key?: string;\n  _type?: string;\n' : '';
			const props = field.fields
				.map((f) => {
					const tsType = mapFieldTypeToTS(f, schemaMap, { resolved });
					const optional = isFieldOptional(f) ? '?' : '';
					return `  ${f.name}${optional}: ${tsType};`;
				})
				.join('\n');
			return `{\n${arrayMeta}${props}\n}`;
		}
		case 'reference': {
			const to = (field as any).to as Array<{ type: string }> | undefined;
			const targets =
				to
					?.map((t) => (schemaMap.get(t.type) ? pascalCase(t.type) : null))
					.filter((s): s is string => !!s) ?? [];
			if (resolved) {
				// At depth=1 the ref is replaced with the full target doc (raw shape).
				if (targets.length === 0) return 'unknown';
				return targets.length === 1 ? targets[0]! : targets.join(' | ');
			}
			// Raw: stored as { _type: 'reference', _ref } — same shape as array items.
			if (targets.length === 0) return 'Reference<unknown>';
			const union = targets.join(' | ');
			return targets.length === 1 ? `Reference<${targets[0]!}>` : `Reference<${union}>`;
		}
		default:
			return 'unknown';
	}
}

/**
 * The depth=0 write shape (TypeScript type string) for a single field, e.g.
 * `string` for a slug, `Reference<author>` for a reference, `ImageValue` for an
 * image. Same mapping `generate-types` uses to emit `generated-types.ts`, so
 * agent-facing schema introspection (MCP `get_schema`) can derive value shapes
 * from the one source of truth instead of hand-authoring a parallel list.
 */
export function fieldWriteShape(field: Field, schemas: SchemaType[]): string {
	const schemaMap = new Map<string, SchemaType>(schemas.map((s) => [s.name, s]));
	return mapFieldTypeToTS(field, schemaMap, {});
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

// ============================================================================
// Block Content (Portable Text) type generation
// ============================================================================

interface BlockTypeInfo {
	name: string;
	interfaceName: string;
	fields: Field[];
}

interface BlockContentFieldInfo {
	schemaName: string;
	fieldName: string;
	mapTypeName: string;
	blockTypes: BlockTypeInfo[];
	inlineTypes: BlockTypeInfo[];
	annotations: BlockTypeInfo[];
	hasImage: boolean;
}

function generateBlockTypeInterface(info: BlockTypeInfo): string {
	const props = info.fields
		.map((f) => {
			const tsType = mapFieldTypeToTS(f, new Map(), {});
			const optional = isFieldOptional(f) ? '?' : '';
			return `  ${f.name}${optional}: ${tsType};`;
		})
		.join('\n');
	return `export interface ${info.interfaceName} {\n  _type: '${info.name}';\n  _key: string;\n${props}\n}`;
}

function collectBlockContentFields(
	schemas: SchemaType[],
	schemaMap: Map<string, SchemaType>
): {
	fields: BlockContentFieldInfo[];
	allBlockTypes: Map<string, BlockTypeInfo>;
} {
	const allBlockTypes = new Map<string, BlockTypeInfo>();
	const fields: BlockContentFieldInfo[] = [];

	for (const schema of schemas) {
		for (const field of schema.fields) {
			if (field.type !== 'array' || !('of' in field) || !field.of) continue;
			const blockDef = field.of.find((item) => item.type === 'block');
			if (!blockDef) continue;

			const mapTypeName = `${pascalCase(schema.name)}${pascalCase(field.name)}Types`;
			const blockTypes: BlockTypeInfo[] = [];
			const inlineTypes: BlockTypeInfo[] = [];
			const annotations: BlockTypeInfo[] = [];
			let hasImage = false;

			for (const item of field.of) {
				if (item.type === 'block') continue;
				if (item.type === 'image') {
					hasImage = true;
					continue;
				}

				const existing = schemaMap.get(item.type);
				const itemFields = (item as any).fields || existing?.fields || [];
				const interfaceName = pascalCase(item.type) + 'Block';

				const info: BlockTypeInfo = {
					name: item.type,
					interfaceName,
					fields: itemFields
				};

				if (!allBlockTypes.has(item.type)) {
					allBlockTypes.set(item.type, info);
				}
				blockTypes.push(info);
			}

			const blockOfItems = (blockDef as any).of as
				| Array<{ type: string; title?: string; fields?: Field[] }>
				| undefined;
			if (blockOfItems) {
				for (const item of blockOfItems) {
					const existing = schemaMap.get(item.type);
					const itemFields = item.fields || existing?.fields || [];
					const interfaceName = pascalCase(item.type) + 'Inline';

					const info: BlockTypeInfo = {
						name: item.type,
						interfaceName,
						fields: itemFields
					};

					if (!allBlockTypes.has(`inline:${item.type}`)) {
						allBlockTypes.set(`inline:${item.type}`, info);
					}
					inlineTypes.push(info);
				}
			}

			const markAnnotations = (blockDef as any).marks?.annotations as
				| Array<{ name: string; title?: string; fields?: Field[] }>
				| undefined;
			if (markAnnotations) {
				for (const ann of markAnnotations) {
					const interfaceName = pascalCase(ann.name) + 'Annotation';
					const info: BlockTypeInfo = {
						name: ann.name,
						interfaceName,
						fields: ann.fields || []
					};

					if (!allBlockTypes.has(`annotation:${ann.name}`)) {
						allBlockTypes.set(`annotation:${ann.name}`, info);
					}
					annotations.push(info);
				}
			}

			fields.push({
				schemaName: schema.name,
				fieldName: field.name,
				mapTypeName,
				blockTypes,
				inlineTypes,
				annotations,
				hasImage
			});
		}
	}

	return { fields, allBlockTypes };
}

function generateBlockContentTypes(
	allBlockTypes: Map<string, BlockTypeInfo>,
	fields: BlockContentFieldInfo[]
): string {
	if (fields.length === 0) return '';

	const sections: string[] = [];

	// Standalone interfaces (deduped)
	const interfaces: string[] = [];
	for (const [, info] of allBlockTypes) {
		interfaces.push(generateBlockTypeInterface(info));
	}

	// Image block (built-in)
	const hasAnyImage = fields.some((f) => f.hasImage);
	if (hasAnyImage) {
		interfaces.push(`export interface PortableTextImageBlock {
  _type: 'image';
  _key: string;
  asset?: { _ref: string; _type: string };
  alt?: string;
}`);
	}

	if (interfaces.length > 0) {
		sections.push(interfaces.join('\n\n'));
	}

	// Per-field mapped types for indexed access
	for (const field of fields) {
		const entries: string[] = [];

		for (const bt of field.blockTypes) {
			entries.push(`  ${bt.name}: ${bt.interfaceName};`);
		}
		if (field.hasImage) {
			entries.push(`  image: PortableTextImageBlock;`);
		}
		for (const it of field.inlineTypes) {
			entries.push(`  ${it.name}: ${it.interfaceName};`);
		}
		for (const ann of field.annotations) {
			entries.push(`  ${ann.name}: ${ann.interfaceName};`);
		}

		if (entries.length > 0) {
			sections.push(`export interface ${field.mapTypeName} {\n${entries.join('\n')}\n}`);
		}
	}

	return sections.join('\n\n');
}

function getBlockContentArrayType(field: BlockContentFieldInfo): string {
	const types = ['PortableTextBlock'];
	for (const bt of field.blockTypes) {
		types.push(bt.interfaceName);
	}
	if (field.hasImage) {
		types.push('PortableTextImageBlock');
	}
	if (types.length === 1) return 'PortableTextBlock[]';
	return `Array<\n    | ${types.join('\n    | ')}\n  >`;
}

/**
 * Generate TypeScript interface for a schema type. When `resolved` is true,
 * emits the depth=1 shape (refs swapped for their targets) under the name
 * `<Name>Resolved`.
 */
function generateInterface(
	schema: SchemaType,
	schemaMap: Map<string, SchemaType>,
	resolved = false,
	blockContentFields?: BlockContentFieldInfo[]
): string {
	const interfaceName = pascalCase(schema.name) + (resolved ? 'Resolved' : '');
	const fields = schema.fields
		.map((field) => {
			const tsType = mapFieldTypeToTS(field, schemaMap, {
				resolved,
				parentSchemaName: schema.name,
				blockContentFields
			});
			const optional = isFieldOptional(field) ? '?' : '';

			// Build comment with description and format information
			let comment = '';
			const needsComment = field.description || field.type === 'date' || field.type === 'datetime';
			if (needsComment) {
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

				if (parts.length > 0) {
					comment = `  /**\n   * ${parts.join('\n   * ')}\n   */\n`;
				}
			}

			return `${comment}  ${field.name}${optional}: ${tsType};`;
		})
		.join('\n');

	// Add id and _meta fields for document types, _type for object types
	const isDocument = schema.type === 'document';
	let finalFields: string;
	if (isDocument) {
		finalFields = `  /** Document ID */
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
  };`;
	} else {
		// Object types include _type for array item discrimination
		finalFields = `  /** Object type discriminator */
  _type?: string;
${fields}`;
	}

	return `export interface ${interfaceName} {\n${finalFields}\n}`;
}

/**
 * True if the schema (or any object schema reachable from it) contains a
 * reference field. Used to skip emitting `*Resolved` variants for schemas
 * that have nothing to resolve.
 */
function hasReferences(
	schema: SchemaType,
	schemaMap: Map<string, SchemaType>,
	visited = new Set<string>()
): boolean {
	if (visited.has(schema.name)) return false;
	visited.add(schema.name);
	return schema.fields.some((f) => fieldHasReferences(f, schemaMap, visited));
}

function fieldHasReferences(
	field: Field,
	schemaMap: Map<string, SchemaType>,
	visited: Set<string>
): boolean {
	if (field.type === 'reference') return true;
	if (field.type === 'array' && 'of' in field && field.of) {
		return field.of.some((item) => {
			if (item.type === 'reference') return true;
			const named = schemaMap.get(item.type);
			if (named && named.type === 'object') return hasReferences(named, schemaMap, visited);
			return fieldHasReferences(item as Field, schemaMap, visited);
		});
	}
	if (field.type === 'object' && 'fields' in field && field.fields) {
		return field.fields.some((f) => fieldHasReferences(f, schemaMap, visited));
	}
	return false;
}

/**
 * Generate the Collections interface augmentation. Singleton-flagged schemas
 * are typed as `SingletonCollection<T>` (a narrowed pick exposing only
 * `get`/`update`/`publish`/`unpublish`/`singletonId`/`schema`) so consumers
 * can't accidentally call list/findByID/create/delete on them at compile
 * time. The runtime is still the same CollectionAPI instance.
 */
function generateCollectionsAugmentation(documentSchemas: SchemaType[]): string {
	const mappings = documentSchemas
		.map((schema) => {
			const interfaceName = pascalCase(schema.name);
			const collectionType = schema.singleton
				? `SingletonCollection<${interfaceName}>`
				: `CollectionAPI<${interfaceName}>`;
			return `    ${schema.name}: ${collectionType};`;
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

	// Collect block content field info for typed unions
	const { fields: blockContentFields, allBlockTypes } = collectBlockContentFields(
		schemas,
		schemaMap
	);

	// Raw shape (storage / depth=0)
	const objectInterfaces = objectSchemas
		.map((s) => generateInterface(s, schemaMap, false, blockContentFields))
		.join('\n\n');
	const documentInterfaces = documentSchemas
		.map((s) => generateInterface(s, schemaMap, false, blockContentFields))
		.join('\n\n');

	// Resolved shape (depth=1) — only for schemas that actually contain refs.
	const objectResolvedInterfaces = objectSchemas
		.filter((s) => hasReferences(s, schemaMap))
		.map((s) => generateInterface(s, schemaMap, true, blockContentFields))
		.join('\n\n');
	const documentResolvedInterfaces = documentSchemas
		.filter((s) => hasReferences(s, schemaMap))
		.map((s) => generateInterface(s, schemaMap, true, blockContentFields))
		.join('\n\n');

	// Block content types (custom blocks, inline objects, annotations)
	const blockContentTypeDefs = generateBlockContentTypes(allBlockTypes, blockContentFields);

	const hasResolved = !!(objectResolvedInterfaces || documentResolvedInterfaces);

	// Generate Collections interface augmentation
	const hasSingletons = documentSchemas.some((s) => s.singleton);
	const collectionsAugmentation = generateCollectionsAugmentation(documentSchemas);

	const resolvedSection = hasResolved
		? `

// ============================================================================
// Resolved Types (depth=1) — refs swapped for their target docs
// ============================================================================
//
// Use these when reading with \`depth: 1\`. The local API and HTTP routes default
// to depth=0 (raw IDs); pass \`{ depth: 1 }\` to get the resolved shape:
//
//   const menu = (await cms.collections.menu.get(id, { depth: 1 })) as MenuResolved;
//
// At depth=1 only the outer document's refs resolve — refs inside the resolved
// targets stay raw, which is why \`MenuResolved.items\` is \`MenuItem[]\` (not
// \`MenuItemResolved[]\`).

${objectResolvedInterfaces ? objectResolvedInterfaces + '\n\n' : ''}${documentResolvedInterfaces}`
		: '';

	// Only import the asset value types the generated interfaces actually reference, so a
	// schema with no image (or no file) fields doesn't pull in an unused import.
	const generatedBody = [
		blockContentTypeDefs,
		objectInterfaces,
		documentInterfaces,
		resolvedSection,
		collectionsAugmentation
	].join('\n');
	const assetImports = [
		/\bImageValue\b/.test(generatedBody) ? 'ImageValue' : null,
		/\bFileValue\b/.test(generatedBody) ? 'FileValue' : null
	].filter((name): name is string => name !== null);

	const apiImports = hasSingletons ? 'CollectionAPI, SingletonCollection' : 'CollectionAPI';
	const importNames = [apiImports, ...assetImports].join(', ');

	// Build the complete file
	const output = `/**
 * Generated types for Aphex CMS
 * This file is auto-generated - DO NOT EDIT manually
 */
import type { ${importNames} } from '@aphexcms/cms-core/server';

/**
 * A reference to another document, stored as \`{ _type: 'reference', _ref }\`
 * inside arrays. At depth=0 (default) this is the raw shape; at depth=1 the
 * field is replaced with the target document — see the \`*Resolved\` variants.
 */
export interface Reference<T = unknown> {
	_type: 'reference';
	_ref: string;
	_key?: string;
	/** Phantom — present only in the type, used for inferring the target. */
	__targetType?: T;
}

export interface PortableTextBlock {
	_type: 'block';
	_key: string;
	style?: string;
	children: Array<{
		_type: 'span';
		_key: string;
		text: string;
		marks?: string[];
	}>;
	markDefs?: Array<{
		_type: string;
		_key: string;
		[key: string]: unknown;
	}>;
	listItem?: string;
	level?: number;
}

// ============================================================================
// Block Content Types (custom blocks, inline objects, annotations)
// ============================================================================

${blockContentTypeDefs}

// ============================================================================
// Object Types (nested in documents)
// ============================================================================

${objectInterfaces}

// ============================================================================
// Document Types (collections)
// ============================================================================

${documentInterfaces}${resolvedSection}

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
