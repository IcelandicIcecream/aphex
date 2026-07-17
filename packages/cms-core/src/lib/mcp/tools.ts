// MCP tool registry — transport-agnostic.
//
// Each tool is a plain { name, description, inputSchema, handler } descriptor.
// The MCP route (routes/mcp.ts) registers these into an MCP SDK server, but the
// registry itself has no MCP dependency — a future in-admin AI panel can consume
// the exact same tools. Input schemas are zod (matching the project's
// zod-as-contract convention). Tools are built per-request and bound to an
// authenticated LocalAPIContext, so every operation rides the caller's RBAC +
// RLS scope.

import { z } from 'zod';
import type { CMSInstances } from '../hooks';
import type { LocalAPIContext } from '../local-api/index';
import type { WhereTyped } from '../types/filters';
import type { Field, SchemaType, TypeReference } from '../types/schemas';
import {
	VALID_FIELD_TYPES,
	RESERVED_FIELDS,
	validateSchemaReferences
} from '../schema-utils/validator';
import { validateDocumentData } from '../field-validation/utils';
import { validateFile } from '../utils/mime-detect';
import { fieldWriteShape } from '../type-gen';
import {
	DEFAULT_BLOCK_STYLES,
	DEFAULT_BLOCK_DECORATORS,
	DEFAULT_BLOCK_LISTS
} from '../components/admin/fields/richtext/block-defaults';

export interface McpToolResult {
	content: Array<{ type: 'text'; text: string }>;
	isError?: boolean;
}

export interface McpTool {
	name: string;
	description: string;
	/** zod raw shape describing the tool's arguments. */
	inputSchema: z.ZodRawShape;
	handler: (args: Record<string, unknown>) => Promise<McpToolResult>;
}

export interface McpToolDeps {
	aphexCMS: CMSInstances;
	context: LocalAPIContext;
}

const ok = (data: unknown): McpToolResult => ({
	content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
});

const fail = (message: string): McpToolResult => ({
	content: [{ type: 'text', text: message }],
	isError: true
});

function asString(args: Record<string, unknown>, key: string): string | null {
	const v = args[key];
	return typeof v === 'string' && v.length > 0 ? v : null;
}

function asRecord(args: Record<string, unknown>, key: string): Record<string, unknown> | null {
	const v = args[key];
	return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

const perspectiveArg = (v: unknown): 'draft' | 'published' =>
	v === 'published' ? 'published' : 'draft';

interface RefEdge {
	from: string;
	/** Field path within the schema, e.g. 'author' or 'sections[].cta'. */
	path: string;
	to: string[];
}

/** Walk a schema's fields (depth-limited) and collect reference edges from the real field data. */
function collectReferences(
	schemaName: string,
	fields: Field[],
	edges: RefEdge[],
	prefix = ''
): void {
	for (const f of fields) {
		const path = prefix ? `${prefix}.${f.name}` : f.name;
		if (f.type === 'reference') {
			edges.push({ from: schemaName, path, to: f.to.map((t) => t.type) });
		} else if (f.type === 'array') {
			for (const ref of f.of) {
				if (ref.to && ref.to.length > 0) {
					edges.push({ from: schemaName, path: `${path}[]`, to: ref.to.map((t) => t.type) });
				}
			}
		} else if (f.type === 'object') {
			collectReferences(schemaName, f.fields, edges, path);
		}
	}
}

/**
 * Portable Text is an open spec (portabletext.org), so we do NOT re-document the
 * block/span/mark node shape here — we point at the spec. What we DO surface is
 * the part that is NOT in the spec and IS specific to this schema: the allowed
 * block styles, mark decorators/annotations, and custom block types — all derived
 * live from the schema. Returns null if the schema has no rich-text fields.
 */
function portableTextGuide(schema: SchemaType): Record<string, unknown> | null {
	const buildCustomExample = (ref: TypeReference): Record<string, unknown> => {
		const example: Record<string, unknown> = { _type: ref.type, _key: '<unique>' };
		for (const f of ref.fields ?? []) example[f.name] = `<${f.type}>`;
		return example;
	};

	const fields: Record<string, unknown> = {};
	for (const field of schema.fields) {
		if (field.type !== 'array') continue;
		const block = field.of.find((o) => o.type === 'block');
		if (!block) continue;
		fields[field.name] = {
			styles: block.styles?.map((s) => s.value) ?? DEFAULT_BLOCK_STYLES,
			decorators: block.marks?.decorators?.map((d) => d.value) ?? DEFAULT_BLOCK_DECORATORS,
			lists: block.lists?.map((l) => l.value) ?? DEFAULT_BLOCK_LISTS,
			// `link` is always available in the editor; plus any schema-defined annotations.
			annotations: ['link', ...(block.marks?.annotations?.map((a) => a.name) ?? [])],
			customBlockTypes: field.of
				.filter((o) => o.type !== 'block')
				.map((o) => ({ type: o.type, example: buildCustomExample(o) }))
		};
	}

	if (Object.keys(fields).length === 0) return null;
	return {
		spec: 'https://portabletext.org',
		note: "These fields are Portable Text (an open spec — follow it for the block/span/mark node shape). Every array item needs a unique string `_key`. The values below are this schema's specifics, not part of the spec: allowed block `style`s, mark decorators/annotations, and custom block types you can insert between text blocks.",
		fields
	};
}

// Literal JSON write-shapes for the alias type names `fieldWriteShape` emits.
// Only surfaced when a field actually uses them (see buildWriteShapes), so the
// agent gets the concrete shape instead of an opaque `ImageValue`.
const SHAPE_LEGEND: Record<string, string> = {
	ImageValue: "{ _type: 'image', asset: { _type: 'reference', _ref: '<assetId>' }, alt?: string }",
	FileValue: "{ _type: 'file', asset: { _type: 'reference', _ref: '<assetId>' } }",
	'Reference<…>': "{ _type: 'reference', _ref: '<documentId of the referenced type>' }",
	'PortableTextBlock[]':
		'Portable Text (portabletext.org) — see the `portableText` section of this response for allowed styles/marks/blocks. Every array item needs a unique string `_key`.'
};

/**
 * Per-field write shapes (the depth=0 JSON an agent should send), derived from
 * the same `fieldWriteShape`/type-generator mapping that emits `generated-types.ts`
 * — so slug reads as `string`, a reference as `Reference<author>`, an image as
 * `ImageValue`, never a guess. Attaches only the legend entries actually used.
 */
function buildWriteShapes(
	schema: SchemaType,
	allSchemas: SchemaType[]
): { writeShapes: Record<string, string>; shapeLegend: Record<string, string> } {
	const writeShapes: Record<string, string> = {};
	for (const field of schema.fields) {
		if (field.type === 'date') writeShapes[field.name] = 'string (ISO date, YYYY-MM-DD)';
		else if (field.type === 'datetime')
			writeShapes[field.name] = 'string (ISO datetime UTC, YYYY-MM-DDTHH:mm:ssZ)';
		else writeShapes[field.name] = fieldWriteShape(field, allSchemas);
	}
	const used = Object.values(writeShapes).join(' ');
	const shapeLegend: Record<string, string> = {};
	for (const [alias, shape] of Object.entries(SHAPE_LEGEND)) {
		const needle = alias === 'Reference<…>' ? 'Reference<' : alias;
		if (used.includes(needle)) shapeLegend[alias] = shape;
	}
	return { writeShapes, shapeLegend };
}

/**
 * Build the content-plane tools for one authenticated request.
 * Safe to expose against a live instance: all writes go through LocalAPI, so a
 * read-only API key is rejected by the permission layer, not by this registry.
 */
export function buildContentTools({ aphexCMS, context }: McpToolDeps): McpTool[] {
	const api = aphexCMS.localAPI;
	const { assetService } = aphexCMS;
	const orgId = context.organizationId;

	return [
		{
			name: 'describe_cms',
			description:
				'Orientation for building against this CMS: all content types and their relationships, the valid field-type vocabulary, and what this API key is allowed to do. Call this first. All data is derived live from the running config — never stale. For exact field/schema TypeScript signatures, read the SchemaType and Field types from the `@aphexcms/cms-core` package (and the real schemas in src/lib/schemaTypes/*.ts).',
			inputSchema: {},
			handler: async () => {
				const schemas = aphexCMS.config.schemaTypes;
				const edges: RefEdge[] = [];
				for (const s of schemas) collectReferences(s.name, s.fields, edges);

				const documentTypes = schemas
					.filter((s) => s.type === 'document')
					.map((s) => ({
						name: s.name,
						title: s.title,
						singleton: s.type === 'document' ? (s.singleton ?? false) : false,
						fieldCount: s.fields.length
					}));
				const objectTypes = schemas
					.filter((s) => s.type === 'object')
					.map((s) => ({ name: s.name, title: s.title, fieldCount: s.fields.length }));

				const auth = context.auth;
				const capabilities =
					auth?.type === 'api_key'
						? {
								authType: 'api_key' as const,
								canWrite: auth.permissions.includes('write'),
								permissions: auth.permissions,
								capabilities: auth.capabilities
							}
						: auth?.type === 'session'
							? { authType: 'session' as const, canWrite: true, capabilities: auth.capabilities }
							: { authType: 'unknown' as const, canWrite: false };

				return ok({
					organizationId: orgId,
					documentTypes,
					objectTypes,
					referenceGraph: edges,
					validFieldTypes: VALID_FIELD_TYPES,
					reservedFieldNames: RESERVED_FIELDS,
					capabilities,
					typeReference:
						"Import SchemaType/Field from '@aphexcms/cms-core' for exact per-field-type props and validation Rule API; TypeScript enforces them. Read existing schemas in src/lib/schemaTypes/*.ts as working examples."
				});
			}
		},
		{
			name: 'list_collections',
			description:
				'List the document collections (content types) available in this CMS, with their names and titles.',
			inputSchema: {},
			handler: async () => {
				const names = api.getCollectionNames();
				const collections = names.map((name) => {
					const schema = api.getCollectionSchema(name);
					return { name, title: schema?.title ?? name, singleton: schema?.singleton ?? false };
				});
				return ok({ collections });
			}
		},
		{
			name: 'get_schema',
			description:
				"Get the field schema for one collection, so you know the shape to use when creating or updating its documents. Returns { schema, portableText? } — `portableText` is present when the type has rich-text (block) fields and links the open Portable Text spec plus this schema's allowed styles/marks/custom block types.",
			inputSchema: { collection: z.string().describe('Collection name') },
			handler: async (args) => {
				const collection = asString(args, 'collection');
				if (!collection) return fail('Missing required string argument: collection');
				const schema = api.getCollectionSchema(collection);
				if (!schema) return fail(`Unknown collection: ${collection}`);
				const portableText = portableTextGuide(schema);
				const { writeShapes, shapeLegend } = buildWriteShapes(schema, aphexCMS.config.schemaTypes);
				return ok({
					schema,
					writeShapes,
					...(Object.keys(shapeLegend).length > 0 ? { shapeLegend } : {}),
					...(portableText ? { portableText } : {})
				});
			}
		},
		{
			name: 'validate_document',
			description:
				'Dry-run: validate document `data` against its collection schema WITHOUT saving, using the same validator as create/update. Returns field-level errors so you can fix them before create_document/update_document.',
			inputSchema: {
				collection: z.string().describe('Collection name'),
				data: z.record(z.string(), z.unknown()).describe('Document field values to validate')
			},
			handler: async (args) => {
				const collection = asString(args, 'collection');
				const data = asRecord(args, 'data');
				if (!collection || !data)
					return fail('Missing required arguments: collection (string), data (object)');
				const schema = api.getCollectionSchema(collection);
				if (!schema) return fail(`Unknown collection: ${collection}`);
				try {
					const result = await validateDocumentData(schema, data, data);
					return ok({ isValid: result.isValid, errors: result.errors });
				} catch (err) {
					return fail(`Validation failed: ${err instanceof Error ? err.message : String(err)}`);
				}
			}
		},
		{
			name: 'validate_schema',
			description:
				'Validate a proposed schema definition (structure, field types, references, reserved field names) against the current CMS, WITHOUT writing a file. Use before writing a schema .ts file. Pass the schema as JSON — validation-rule functions are not needed for structural validation.',
			inputSchema: {
				schema: z
					.record(z.string(), z.unknown())
					.describe('Proposed SchemaType as JSON (type, name, title, fields, …)')
			},
			handler: async (args) => {
				const proposed = asRecord(args, 'schema');
				if (!proposed) return fail('Missing required argument: schema (object)');
				// Validate the proposed schema alongside the existing ones so its
				// references resolve. `proposed` is external JSON asserted into SchemaType
				// at this boundary; validateSchemaReferences is what actually checks it.
				const all: SchemaType[] = [
					...aphexCMS.config.schemaTypes,
					proposed as unknown as SchemaType
				];
				try {
					validateSchemaReferences(all);
					return ok({ isValid: true, errors: [] });
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					return ok({ isValid: false, errors: message.split('\n') });
				}
			}
		},
		{
			name: 'query_documents',
			description:
				'Query documents in a collection. Supports where filters, sorting, pagination, and draft/published perspective.',
			inputSchema: {
				collection: z.string().describe('Collection name'),
				where: z
					.record(z.string(), z.unknown())
					.optional()
					.describe('Filter conditions (LocalAPI Where syntax)'),
				limit: z.number().optional().describe('Max results (default 50)'),
				offset: z.number().optional().describe('Results to skip (default 0)'),
				sort: z
					.string()
					.optional()
					.describe("Sort field; prefix '-' for descending, e.g. '-updatedAt'"),
				perspective: z
					.enum(['draft', 'published'])
					.optional()
					.describe('Which content to read (default draft)')
			},
			handler: async (args) => {
				const collection = asString(args, 'collection');
				if (!collection) return fail('Missing required string argument: collection');
				const col = api.getCollection(collection);
				if (!col) return fail(`Unknown collection: ${collection}`);
				// `where` is arbitrary filter JSON from the MCP client. WhereTyped permits
				// dynamic field keys; assert the parsed object into it at this external
				// boundary rather than validating every possible filter shape.
				const where = (asRecord(args, 'where') ?? undefined) as WhereTyped<unknown> | undefined;
				const limit = typeof args.limit === 'number' ? args.limit : undefined;
				const offset = typeof args.offset === 'number' ? args.offset : undefined;
				const sort = asString(args, 'sort') ?? undefined;
				try {
					const result = await col.find(context, {
						where,
						limit,
						offset,
						sort,
						perspective: perspectiveArg(args.perspective)
					});
					return ok(result);
				} catch (err) {
					return fail(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
				}
			}
		},
		{
			name: 'get_document',
			description: 'Get a single document by id from a collection.',
			inputSchema: {
				collection: z.string().describe('Collection name'),
				id: z.string().describe('Document id'),
				perspective: z.enum(['draft', 'published']).optional()
			},
			handler: async (args) => {
				const collection = asString(args, 'collection');
				const id = asString(args, 'id');
				if (!collection || !id) return fail('Missing required string arguments: collection, id');
				const col = api.getCollection(collection);
				if (!col) return fail(`Unknown collection: ${collection}`);
				try {
					const doc = await col.findByID(context, id, {
						perspective: perspectiveArg(args.perspective)
					});
					if (!doc) return fail(`Document not found: ${collection}/${id}`);
					return ok(doc);
				} catch (err) {
					return fail(`Get failed: ${err instanceof Error ? err.message : String(err)}`);
				}
			}
		},
		{
			name: 'create_document',
			description:
				'Create a document in a collection. Pass field values in `data` (matching the collection schema). Set publish:true to publish immediately, otherwise it is saved as a draft.',
			inputSchema: {
				collection: z.string().describe('Collection name'),
				data: z
					.record(z.string(), z.unknown())
					.describe('Field values matching the collection schema'),
				publish: z.boolean().optional().describe('Publish immediately (default false)')
			},
			handler: async (args) => {
				const collection = asString(args, 'collection');
				const data = asRecord(args, 'data');
				if (!collection || !data)
					return fail('Missing required arguments: collection (string), data (object)');
				const col = api.getCollection(collection);
				if (!col) return fail(`Unknown collection: ${collection}`);
				try {
					const result = await col.create(context, data, { publish: args.publish === true });
					return ok(result);
				} catch (err) {
					return fail(`Create failed: ${err instanceof Error ? err.message : String(err)}`);
				}
			}
		},
		{
			name: 'update_document',
			description:
				'Update fields on an existing document. Only include the fields you want to change in `data`. Set publish:true to publish the result.',
			inputSchema: {
				collection: z.string().describe('Collection name'),
				id: z.string().describe('Document id'),
				data: z.record(z.string(), z.unknown()).describe('Partial field values to update'),
				publish: z.boolean().optional().describe('Publish after updating (default false)')
			},
			handler: async (args) => {
				const collection = asString(args, 'collection');
				const id = asString(args, 'id');
				const data = asRecord(args, 'data');
				if (!collection || !id || !data)
					return fail('Missing required arguments: collection, id (strings), data (object)');
				const col = api.getCollection(collection);
				if (!col) return fail(`Unknown collection: ${collection}`);
				try {
					const result = await col.update(context, id, data, { publish: args.publish === true });
					if (!result) return fail(`Document not found: ${collection}/${id}`);
					return ok(result);
				} catch (err) {
					return fail(`Update failed: ${err instanceof Error ? err.message : String(err)}`);
				}
			}
		},
		{
			name: 'publish_document',
			description: 'Publish a document (copies its current draft to the published perspective).',
			inputSchema: {
				collection: z.string().describe('Collection name'),
				id: z.string().describe('Document id')
			},
			handler: async (args) => {
				const collection = asString(args, 'collection');
				const id = asString(args, 'id');
				if (!collection || !id) return fail('Missing required string arguments: collection, id');
				const col = api.getCollection(collection);
				if (!col) return fail(`Unknown collection: ${collection}`);
				try {
					const doc = await col.publish(context, id);
					if (!doc) return fail(`Document not found: ${collection}/${id}`);
					return ok(doc);
				} catch (err) {
					return fail(`Publish failed: ${err instanceof Error ? err.message : String(err)}`);
				}
			}
		},
		{
			name: 'get_singleton',
			description:
				'Get a singleton document (a type where exactly one exists, e.g. site settings — flagged `singleton: true` in describe_cms). No id needed; the canonical row is resolved (and lazily created empty on first access). Use this instead of get_document for singletons.',
			inputSchema: {
				collection: z.string().describe('Singleton collection name'),
				perspective: z.enum(['draft', 'published']).optional()
			},
			handler: async (args) => {
				const collection = asString(args, 'collection');
				if (!collection) return fail('Missing required string argument: collection');
				const col = api.getCollection(collection);
				if (!col) return fail(`Unknown collection: ${collection}`);
				try {
					const doc = await col.get(context, { perspective: perspectiveArg(args.perspective) });
					return ok(doc);
				} catch (err) {
					// SingletonOperationError when the type isn't a singleton — surface its message.
					return fail(err instanceof Error ? err.message : String(err));
				}
			}
		},
		{
			name: 'update_singleton',
			description:
				'Update a singleton document (e.g. site settings). No id needed — the canonical row is resolved by type. Include only the fields to change in `data`. Set publish:true to publish the result. Use this instead of update_document for singletons.',
			inputSchema: {
				collection: z.string().describe('Singleton collection name'),
				data: z.record(z.string(), z.unknown()).describe('Partial field values to update'),
				publish: z.boolean().optional().describe('Publish after updating (default false)')
			},
			handler: async (args) => {
				const collection = asString(args, 'collection');
				const data = asRecord(args, 'data');
				if (!collection || !data)
					return fail('Missing required arguments: collection (string), data (object)');
				const col = api.getCollection(collection);
				if (!col) return fail(`Unknown collection: ${collection}`);
				const id = col.getSingletonId(context);
				if (!id) return fail(`'${collection}' is not a singleton. Use update_document instead.`);
				try {
					// Ensure the canonical row exists (get lazily creates it), then update.
					await col.get(context);
					const result = await col.update(context, id, data, { publish: args.publish === true });
					if (!result) return fail(`Failed to update singleton '${collection}'.`);
					return ok(result);
				} catch (err) {
					return fail(`Update failed: ${err instanceof Error ? err.message : String(err)}`);
				}
			}
		},
		{
			name: 'list_assets',
			description:
				'List media assets (images and files) in this organization, optionally filtered.',
			inputSchema: {
				search: z.string().optional().describe('Filter by filename/text'),
				assetType: z.enum(['image', 'file']).optional(),
				limit: z.number().optional(),
				offset: z.number().optional()
			},
			handler: async (args) => {
				const search = asString(args, 'search') ?? undefined;
				const assetType =
					args.assetType === 'image' || args.assetType === 'file' ? args.assetType : undefined;
				const limit = typeof args.limit === 'number' ? args.limit : undefined;
				const offset = typeof args.offset === 'number' ? args.offset : undefined;
				try {
					const assets = await assetService.findAssets(orgId, { search, assetType, limit, offset });
					return ok({ assets, count: assets.length });
				} catch (err) {
					return fail(`List assets failed: ${err instanceof Error ? err.message : String(err)}`);
				}
			}
		},
		{
			name: 'upload_asset',
			description:
				'Upload an image or file from base64 data and get back a ready-to-reference value. ' +
				'The response includes `imageValue` and `fileValue` — drop the matching one straight ' +
				'into a document field (e.g. a blog post `coverImage`, an author `avatar`, or an inline ' +
				'`image` block) via update_document. File type is verified from the actual bytes, not the ' +
				'declared name.',
			inputSchema: {
				data: z.string().min(1).describe('Base64-encoded file contents (no data: URI prefix).'),
				filename: z
					.string()
					.min(1)
					.describe('Original filename, e.g. "cover.png". Its extension helps typing.'),
				mimeType: z
					.string()
					.optional()
					.describe('Declared MIME type. Optional — the bytes are sniffed regardless.'),
				alt: z.string().optional().describe('Default alt text, shared across every placement.'),
				title: z.string().optional(),
				description: z.string().optional()
			},
			handler: async (args) => {
				const base64 = asString(args, 'data');
				const filename = asString(args, 'filename');
				if (!base64) return fail("'data' (base64 file contents) is required.");
				if (!filename) return fail("'filename' is required.");

				let buffer: Buffer;
				try {
					buffer = Buffer.from(base64, 'base64');
				} catch {
					return fail("'data' is not valid base64.");
				}
				if (buffer.length === 0) return fail("'data' decoded to zero bytes.");

				const declaredMime = asString(args, 'mimeType') ?? '';
				const validation = validateFile(buffer, filename, declaredMime);
				if (!validation.valid) {
					return fail(`Upload rejected: ${validation.error ?? 'file failed validation.'}`);
				}
				const mimeType = validation.detectedMimeType || declaredMime || 'application/octet-stream';

				try {
					const asset = await assetService.uploadAsset(orgId, {
						buffer,
						originalFilename: filename,
						mimeType,
						size: buffer.length,
						alt: asString(args, 'alt') ?? undefined,
						title: asString(args, 'title') ?? undefined,
						description: asString(args, 'description') ?? undefined,
						createdBy: context.user?.id
					});

					const ref = { _type: 'reference' as const, _ref: asset.id };
					return ok({
						asset,
						// Referenceable field values — use the one matching the target field's type.
						imageValue: { _type: 'image', asset: ref },
						fileValue: { _type: 'file', asset: ref }
					});
				} catch (err) {
					return fail(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
				}
			}
		}
	];
}
