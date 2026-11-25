// Content agent tools — transport-agnostic.
//
// Each tool is an `AgentToolDefinition` (name/description/capabilities/zod schema — the
// Milestone 2 contract, see references/content-copilot-phase-1-plan.md) paired with an
// `execute` function. Unlike the old per-request `McpTool[]` registry, these are defined
// ONCE, statically — `execute` receives `{ aphexCMS, context }` as a call-time argument
// (matching how `aphex/event/consumer`/`aphex/job/handler` plugin parts already work) rather
// than a closure bound at registration time, so the exact same tool can be invoked by MCP,
// a future in-admin agent panel, or a plugin-contributed executor, through one execution
// service. `buildContentTools()` is a thin per-request adapter that wraps these into the
// MCP SDK's expected shape — the MCP route (routes/mcp.ts) is the only remaining MCP-specific
// code in this file.

import { z } from 'zod';
import { applyPatch, PatchError } from '../local-api/patch';
import { isRevisionConflictError } from '../db/interfaces/document';
import type { Asset } from '../types/asset';
import type { AssetFilters } from '../db/interfaces/asset';
import type { CMSInstances } from '../hooks';
import type { LocalAPIContext } from '../local-api/index';
import type {
	AgentToolDefinition,
	AgentToolExecutor,
	AgentToolExecutionContext,
	AgentToolResult
} from '../types/agent-tools';
import type { WhereTyped } from '../types/filters';
import type { Field, SchemaType, TypeReference } from '../types/schemas';
import {
	VALID_FIELD_TYPES,
	RESERVED_FIELDS,
	validateSchemaReferences
} from '../schema-utils/validator';
import { newUnusableFields } from '../field-validation/new-fields';
import { validateDocumentData } from '../field-validation/utils';
import { validateFile } from '../utils/mime-detect';
import { fetchRemoteFile } from '../utils/fetch-remote-file';
import { fieldWriteShape } from '../type-gen';
import { schemaOutline } from './schema-outline';
import { viewDocument, viewOptions } from './document-view';
import { hasCapability, resolveCapabilities } from '../types/capabilities';
import { hasRequiredCapabilities } from '../schema-utils/required-capabilities';
import { contentWorkspaceTools } from '../ai/content-workspace-tools';
import {
	DEFAULT_BLOCK_STYLES,
	DEFAULT_BLOCK_DECORATORS,
	DEFAULT_BLOCK_LISTS
} from '../components/admin/fields/richtext/block-defaults';

export interface McpToolResult {
	content: Array<
		{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }
	>;
	isError?: boolean;
}

export interface McpTool {
	name: string;
	description: string;
	/** zod raw shape describing the tool's arguments. */
	inputSchema: z.ZodRawShape;
	/** Whether it changes content, from its definition: counted as a change, not a read. */
	mutates: boolean;
	/** What clients call it ("Publish document"). */
	title: string;
	/** Whether a call can overwrite or remove, not only add (`AgentToolDefinition.destructive`). */
	destructive: boolean;
	/** Whether it reaches outside this site (`AgentToolDefinition.openWorld`). */
	openWorld: boolean;
	handler: (args: Record<string, unknown>) => Promise<McpToolResult>;
}

export interface McpToolDeps {
	aphexCMS: CMSInstances;
	context: LocalAPIContext;
}

/** One content tool: its serializable definition plus the function that runs it. */
export interface ContentAgentTool {
	definition: AgentToolDefinition<any>;
	execute: AgentToolExecutor<any>;
}

const ok = (data: unknown): AgentToolResult => ({ success: true, data });

/** How many documents `query_documents` returns by default, and at most. */
const DOCUMENTS_DEFAULT = 20;
const DOCUMENTS_MAX = 50;
/** Characters of documents in one `query_documents` answer: a page of pages would fill a model's context. */
const DOCUMENTS_BUDGET = 24_000;

/** How many files `list_assets` returns by default, and at most. */
const ASSETS_DEFAULT = 25;
const ASSETS_MAX = 50;

/**
 * A file as a model needs it: what it is, what it shows, and the id to reference it by.
 * The stored row is mostly image metadata and storage paths, several times this size.
 */
function assetView(asset: Asset) {
	return {
		id: asset.id,
		filename: asset.originalFilename,
		mimeType: asset.mimeType,
		size: asset.size,
		...(asset.width && asset.height ? { width: asset.width, height: asset.height } : {}),
		...(asset.alt ? { alt: asset.alt } : {}),
		...(asset.title ? { title: asset.title } : {}),
		...(asset.description ? { description: asset.description } : {}),
		url: asset.url
	};
}

/**
 * Whether the caller's organization has a type at all (`requiredCapabilities`).
 * The Local API refuses the rest, so an agent shouldn't be told about them.
 */
function typeAvailable(context: LocalAPIContext) {
	if (context.overrideAccess) return () => true;
	const held = context.auth ? resolveCapabilities(context.auth) : new Set<string>();
	return (schema: SchemaType | undefined) => hasRequiredCapabilities(schema, held);
}

const fail = (message: string): AgentToolResult => ({ success: false, error: message });

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

/** The revision and status a saved document now has, and whether it differs from what's live. */
function documentMeta(doc: object): {
	revision?: number;
	status?: string;
	hasUnpublishedChanges?: boolean;
} {
	const meta = '_meta' in doc ? doc._meta : undefined;
	if (!meta || typeof meta !== 'object') return {};
	return {
		...('revision' in meta && typeof meta.revision === 'number' ? { revision: meta.revision } : {}),
		...('status' in meta && typeof meta.status === 'string' ? { status: meta.status } : {}),
		...('hasUnpublishedChanges' in meta && typeof meta.hasUnpublishedChanges === 'boolean'
			? { hasUnpublishedChanges: meta.hasUnpublishedChanges }
			: {})
	};
}

/** A read document's own fields, apart from its id and `_meta`, and the revision read. */
function documentFields(doc: object): { data: Record<string, unknown>; revision?: number } {
	const data: Record<string, unknown> = {};
	let revision: number | undefined;
	for (const [key, value] of Object.entries(doc)) {
		if (key === '_meta') revision = documentMeta(doc).revision;
		else if (key !== 'id') data[key] = value;
	}
	return { data, revision };
}

/** A document that a single read returns whole; a larger one comes skimmed unless it's asked for by part. */
const DOCUMENT_BUDGET = 40_000;

/** One document for an agent: whole when it fits, else its index and how to read the rest. */
function readDocument(
	doc: object,
	args: Record<string, unknown>,
	schema: SchemaType | undefined,
	schemas: readonly SchemaType[]
): Record<string, unknown> {
	const view = viewOptions(args);
	const seen = viewDocument(doc, view, schema, schemas);
	if (view.skim || view.path || view.fields?.length) return seen;
	if (JSON.stringify(seen).length <= DOCUMENT_BUDGET) return seen;
	return {
		...viewDocument(doc, { skim: true }, schema, schemas),
		note: 'Too large to return whole, so it is skimmed: read the part you need with `path` or `fields`.'
	};
}

/**
 * What a write answers with. The agent has just sent the content, so it isn't sent
 * back: only what saving settled (keys given to new items, values hooks filled in),
 * skimmed, and the revision to write with next.
 */
function savedView<T extends { document: unknown }>(result: T, written: Record<string, unknown>) {
	const { document, ...rest } = result;
	if (!document || typeof document !== 'object') return result;
	const skimmed = viewDocument(document, { skim: true });
	return {
		document: Object.fromEntries(
			Object.entries(skimmed).filter(
				([key, value]) => key in written || (!Array.isArray(value) && value !== '{…}')
			)
		),
		...rest
	};
}

/** What a read returns: fields to pick, one path, or the whole document skimmed. */
const readShape = {
	fields: z
		.array(z.string())
		.optional()
		.describe('Only these top-level fields (id and _meta always come)'),
	skim: z
		.boolean()
		.optional()
		.describe(
			'Cut text to its start and rich text to plain text, keeping every _key and _type: enough to find what to patch, at a fraction of the size'
		)
};

const patchPath = z.string().describe('e.g. blocks[_key=="k3"].heading');
/** One patch_document edit; the runtime is local-api/patch.ts. */
const patchOperationSchema = z.discriminatedUnion('op', [
	z.object({ op: z.literal('set'), path: patchPath, value: z.unknown() }),
	z.object({ op: z.literal('unset'), path: patchPath }),
	z.object({
		op: z.literal('insert'),
		path: patchPath.describe('An item, for before/after; the list itself, for start/end'),
		position: z.enum(['before', 'after', 'start', 'end']),
		items: z.array(z.unknown()).min(1)
	}),
	z.object({
		op: z.literal('move'),
		path: patchPath,
		position: z.enum(['before', 'after']),
		target: patchPath
	}),
	z.object({
		op: z.literal('replaceText'),
		path: patchPath,
		find: z.string().min(1),
		replace: z.string()
	})
]);

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
 * The content-plane tools, safe to expose against a live instance: all writes go through
 * LocalAPI, so a read-only API key is rejected by the permission layer, not by this
 * registry. `requiredCapabilities` here is the advertisement/execution gate for the new
 * agent-tool contract; document tools additionally get real enforcement downstream from
 * `CollectionAPI`'s own `PermissionChecker` (unchanged) — `asset.read`/`asset.upload` have no
 * such downstream check, so `list_assets`/`upload_asset` enforce it directly in `execute`.
 */
export const contentAgentTools: ContentAgentTool[] = [
	{
		definition: {
			name: 'describe_cms',
			title: 'Describe the content',
			description:
				'Orientation for building against this CMS: all content types and their relationships, the valid field-type vocabulary, and what this API key is allowed to do: the starting point for any job here. All data is derived live from the running config — never stale. For exact field/schema TypeScript signatures, read the SchemaType and Field types from the `@aphexcms/cms-core` package (and the real schemas in src/lib/schemaTypes/*.ts).',
			mutates: false,
			requiredCapabilities: [],
			execution: 'server',
			inputSchema: z.object({})
		},
		execute: async (_input, { aphexCMS, context }: AgentToolExecutionContext) => {
			const schemas = aphexCMS.config.schemaTypes;
			const orgId = context.organizationId;
			const edges: RefEdge[] = [];
			for (const s of schemas) collectReferences(s.name, s.fields, edges);

			const available = typeAvailable(context);
			const documentTypes = schemas
				.filter((s) => s.type === 'document' && available(s))
				.map((s) => ({
					name: s.name,
					title: s.title,
					...(s.type === 'document' && s.singleton ? { singleton: true } : {})
				}));
			const objectTypes = schemas
				.filter((s) => s.type === 'object' && available(s))
				.map((s) => s.name);

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
				// 'blogPost.author -> author': an object per edge is mostly repeated keys.
				referenceGraph: edges.map(({ from, path, to }) => `${from}.${path} -> ${to.join('|')}`),
				validFieldTypes: VALID_FIELD_TYPES,
				reservedFieldNames: RESERVED_FIELDS,
				capabilities,
				typeReference:
					"Import SchemaType/Field from '@aphexcms/cms-core' for exact per-field-type props and validation Rule API; TypeScript enforces them. Read existing schemas in src/lib/schemaTypes/*.ts as working examples."
			});
		}
	},
	{
		definition: {
			name: 'list_collections',
			title: 'List content types',
			description:
				'List the document collections (content types) available in this CMS, with their names and titles.',
			mutates: false,
			requiredCapabilities: [],
			execution: 'server',
			inputSchema: z.object({})
		},
		execute: async (_input, { aphexCMS, context }: AgentToolExecutionContext) => {
			const api = aphexCMS.localAPI;
			const available = typeAvailable(context);
			const names = api
				.getCollectionNames()
				.filter((name) => available(api.getCollectionSchema(name)));
			const collections = names.map((name) => {
				const schema = api.getCollectionSchema(name);
				return { name, title: schema?.title ?? name, singleton: schema?.singleton ?? false };
			});
			return ok({ collections });
		}
	},
	{
		definition: {
			name: 'get_schema',
			title: 'Get a content type',
			description:
				"Get the shape of one collection's documents, to write them: TypeScript-style `types` (the collection's own type first; `?` is optional; comments say what a field is for and what its values mean) and `values`, the shapes of Image, Ref and the other names it uses. A page builder with many block types lists them at the end instead: call again with `types` naming the blocks you'll write, e.g. ['hero', 'cta']. `portableText` is present for rich-text fields. `detail: 'full'` returns the raw schema instead, which is far larger: only for writing schema code.",
			mutates: false,
			requiredCapabilities: [],
			execution: 'server',
			inputSchema: z.object({
				collection: z.string().describe('Collection name'),
				types: z
					.array(z.string())
					.optional()
					.describe(
						"Block types to outline in full (their _type), e.g. ['hero', 'cta']; ['*'] for all of them"
					),
				detail: z
					.enum(['outline', 'full'])
					.optional()
					.describe("'outline' (default) or 'full' for the raw schema")
			})
		},
		execute: async (
			args: Record<string, unknown>,
			{ aphexCMS, context }: AgentToolExecutionContext
		) => {
			const api = aphexCMS.localAPI;
			const collection = asString(args, 'collection');
			if (!collection) return fail('Missing required string argument: collection');
			const schema = api.getCollectionSchema(collection);
			if (!schema) return fail(`Unknown collection: ${collection}`);
			if (!typeAvailable(context)(schema)) {
				return fail(`${schema.title} isn't available in this organization.`);
			}
			const portableText = portableTextGuide(schema);
			if (args.detail === 'full') {
				const { writeShapes, shapeLegend } = buildWriteShapes(schema, aphexCMS.config.schemaTypes);
				return ok({
					schema,
					writeShapes,
					...(Object.keys(shapeLegend).length > 0 ? { shapeLegend } : {}),
					...(portableText ? { portableText } : {})
				});
			}
			const requested = Array.isArray(args.types)
				? args.types.filter((t): t is string => typeof t === 'string')
				: [];
			const all = requested.includes('*');
			const outline = schemaOutline(schema, aphexCMS.config.schemaTypes, {
				only: all ? undefined : requested,
				summarize: !all
			});
			if (outline.unknown.length > 0) {
				return fail(
					`${collection} has no block type ${outline.unknown.map((t) => `"${t}"`).join(', ')}. Call get_schema without types to list them.`
				);
			}
			return ok({
				collection,
				...(schema.singleton ? { singleton: true } : {}),
				types: outline.types,
				values: outline.values,
				...(portableText ? { portableText } : {})
			});
		}
	},
	{
		definition: {
			name: 'validate_document',
			title: 'Check a document',
			description:
				'Dry-run: validate document `data` against its collection schema WITHOUT saving, using the same validator as create/update. Returns field-level errors so you can fix them before create_document/update_document. For changes to an existing document, pass its `id` too.',
			mutates: false,
			requiredCapabilities: [],
			execution: 'server',
			inputSchema: z.object({
				collection: z.string().describe('Collection name'),
				data: z.record(z.string(), z.unknown()).describe('Document field values to validate'),
				id: z
					.string()
					.optional()
					.describe("The document they're for, so what it already holds isn't reported")
			})
		},
		execute: async (
			args: Record<string, unknown>,
			{ aphexCMS, context }: AgentToolExecutionContext
		) => {
			const api = aphexCMS.localAPI;
			const collection = asString(args, 'collection');
			const data = asRecord(args, 'data');
			if (!collection || !data)
				return fail('Missing required arguments: collection (string), data (object)');
			const schema = api.getCollectionSchema(collection);
			if (!schema) return fail(`Unknown collection: ${collection}`);
			try {
				const schemas = aphexCMS.config.schemaTypes;
				// The other half of a save's check: fields this write would newly misuse.
				const id = asString(args, 'id');
				const col = id ? api.getCollection(collection) : undefined;
				const previous: unknown[] = [];
				if (id && col) {
					for (const perspective of ['draft', 'published'] as const) {
						const doc = await col.findByID(context, id, { perspective });
						if (doc) previous.push(documentFields(doc).data);
					}
				}
				const result = await validateDocumentData(schema, data, { schemas, stored: previous });
				const { unknown, deprecated } = newUnusableFields(schema, data, previous, schemas);
				const unusable = [...unknown, ...deprecated];
				const reported = new Set(unusable.map((e) => e.field));
				const errors = [...unusable, ...result.errors.filter((e) => !reported.has(e.field))];
				return ok({ isValid: errors.length === 0, errors });
			} catch (err) {
				return fail(`Validation failed: ${err instanceof Error ? err.message : String(err)}`);
			}
		}
	},
	{
		definition: {
			name: 'validate_schema',
			title: 'Check a content type',
			description:
				'Validate a proposed schema definition (structure, field types, references, reserved field names) against the current CMS, WITHOUT writing a file. Use before writing a schema .ts file. Pass the schema as JSON — validation-rule functions are not needed for structural validation.',
			mutates: false,
			requiredCapabilities: [],
			execution: 'server',
			inputSchema: z.object({
				schema: z
					.record(z.string(), z.unknown())
					.describe('Proposed SchemaType as JSON (type, name, title, fields, …)')
			})
		},
		execute: async (args: Record<string, unknown>, { aphexCMS }: AgentToolExecutionContext) => {
			const proposed = asRecord(args, 'schema');
			if (!proposed) return fail('Missing required argument: schema (object)');
			// Validate the proposed schema alongside the existing ones so its
			// references resolve. `proposed` is external JSON asserted into SchemaType
			// at this boundary; validateSchemaReferences is what actually checks it.
			const all: SchemaType[] = [...aphexCMS.config.schemaTypes, proposed as unknown as SchemaType];
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
		definition: {
			name: 'query_documents',
			title: 'Find documents',
			description:
				'Query a collection’s documents. `where` and `sort` take the field names and stored shapes get_schema returns for that collection. Supports filters, sorting, pagination, and draft/published perspective. Aphex slug fields are bare strings: use `where: { "slug": "home" }`, never `slug.current` or `{ current: "home" }`. Returns the documents themselves, in full unless you pass `fields` or `skim`: do, unless you need the whole of them. A large answer stops early; when `hasMore`, pass `nextOffset` as `offset` for the rest.',
			mutates: false,
			requiredCapabilities: ['document.read'],
			execution: 'server',
			inputSchema: z.object({
				collection: z.string().describe('Collection name'),
				where: z
					.record(z.string(), z.unknown())
					.optional()
					.describe(
						'Filter conditions (LocalAPI Where syntax). Call get_schema for this collection first and use only fields it returned. Slugs are bare strings, e.g. { "slug": "home" }; never use "slug.current".'
					),
				limit: z
					.number()
					.optional()
					.describe(`Max results (default ${DOCUMENTS_DEFAULT}, max ${DOCUMENTS_MAX})`),
				offset: z.number().optional().describe('Results to skip (default 0)'),
				sort: z
					.string()
					.optional()
					.describe("Schema-confirmed sort field; prefix '-' for descending, e.g. '-updatedAt'"),
				perspective: z
					.enum(['draft', 'published'])
					.optional()
					.describe('Which content to read (default draft)'),
				...readShape
			})
		},
		execute: async (
			args: Record<string, unknown>,
			{ aphexCMS, context }: AgentToolExecutionContext
		) => {
			const api = aphexCMS.localAPI;
			const collection = asString(args, 'collection');
			if (!collection) return fail('Missing required string argument: collection');
			const col = api.getCollection(collection);
			if (!col) return fail(`Unknown collection: ${collection}`);
			// `where` is arbitrary filter JSON from the MCP client. WhereTyped permits
			// dynamic field keys; assert the parsed object into it at this external
			// boundary rather than validating every possible filter shape.
			const where = (asRecord(args, 'where') ?? undefined) as WhereTyped<unknown> | undefined;
			const wanted = typeof args.limit === 'number' ? Math.floor(args.limit) : DOCUMENTS_DEFAULT;
			const limit = Math.min(Math.max(wanted, 1), DOCUMENTS_MAX);
			const offset = typeof args.offset === 'number' ? Math.max(Math.floor(args.offset), 0) : 0;
			const sort = asString(args, 'sort') ?? undefined;
			try {
				const result = await col.find(context, {
					where,
					limit,
					offset,
					sort,
					perspective: perspectiveArg(args.perspective)
				});
				// A list of documents needs each one's outline, not the lists inside its lists.
				const view = { ...viewOptions(args), flat: true };
				const schema = api.getCollectionSchema(collection);
				const docs: unknown[] = [];
				let used = 0;
				let cutShort = false;
				let skimmedFirst = false;
				for (const doc of result.docs) {
					const read = (options: typeof view) =>
						doc && typeof doc === 'object'
							? viewDocument(doc, options, schema, aphexCMS.config.schemaTypes)
							: doc;
					let seen: unknown = read(view);
					let size = JSON.stringify(seen)?.length ?? 0;
					if (used + size > DOCUMENTS_BUDGET) {
						// One document always comes, or the next page could never start.
						cutShort = docs.length > 0;
						if (cutShort) break;
						if (!view.skim) {
							seen = read({ ...view, skim: true });
							size = JSON.stringify(seen)?.length ?? 0;
							skimmedFirst = true;
						}
					}
					docs.push(seen);
					used += size;
				}
				const next = offset + docs.length;
				const hasMore = docs.length > 0 && next < result.totalDocs;
				const notes = [
					...(skimmedFirst
						? [
								'The first document is too large to return whole, so it is skimmed: read it with get_document, by `path` or `fields`.'
							]
						: []),
					...(cutShort
						? [
								'Stopped early: these documents are large. Pass `skim` or `fields` to see more at once.'
							]
						: [])
				];
				return ok({
					docs,
					totalDocs: result.totalDocs,
					offset,
					hasMore,
					...(hasMore ? { nextOffset: next } : {}),
					...(notes.length ? { note: notes.join(' ') } : {})
				});
			} catch (err) {
				return fail(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
			}
		}
	},
	{
		definition: {
			name: 'get_document',
			title: 'Get a document',
			description:
				'Get a single document by id. Read only what you need: `skim` for a page’s structure and block keys, `path` for one block, `fields` for a few fields.',
			mutates: false,
			requiredCapabilities: ['document.read'],
			execution: 'server',
			inputSchema: z.object({
				collection: z.string().describe('Collection name'),
				id: z.string().describe('Document id'),
				perspective: z.enum(['draft', 'published']).optional(),
				...readShape,
				path: z.string().optional().describe('Read one value only, e.g. blocks[_key=="k3"]')
			})
		},
		execute: async (
			args: Record<string, unknown>,
			{ aphexCMS, context }: AgentToolExecutionContext
		) => {
			const api = aphexCMS.localAPI;
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
				return ok(
					readDocument(doc, args, api.getCollectionSchema(collection), aphexCMS.config.schemaTypes)
				);
			} catch (err) {
				return fail(`Get failed: ${err instanceof Error ? err.message : String(err)}`);
			}
		}
	},
	{
		definition: {
			name: 'create_document',
			title: 'Create a document',
			description:
				'Create a NEW document in a collection: a new post, page or other document. (Workspace tools only edit the document already open.) Pass field values in `data` (matching the collection schema). Set publish:true to publish immediately, otherwise it is saved as a draft.',
			mutates: true,
			requiredCapabilities: ['document.create'],
			execution: 'server',
			inputSchema: z.object({
				collection: z.string().describe('Collection name'),
				data: z
					.record(z.string(), z.unknown())
					.describe('Field values matching the collection schema'),
				publish: z.boolean().optional().describe('Publish immediately (default false)')
			})
		},
		execute: async (
			args: Record<string, unknown>,
			{ aphexCMS, context }: AgentToolExecutionContext
		) => {
			const api = aphexCMS.localAPI;
			const collection = asString(args, 'collection');
			const data = asRecord(args, 'data');
			if (!collection || !data)
				return fail('Missing required arguments: collection (string), data (object)');
			const col = api.getCollection(collection);
			if (!col) return fail(`Unknown collection: ${collection}`);
			try {
				const result = await col.create(context, data, {
					publish: args.publish === true,
					rejectNewUnknownFields: true
				});
				return ok(savedView(result, data));
			} catch (err) {
				return fail(`Create failed: ${err instanceof Error ? err.message : String(err)}`);
			}
		}
	},
	{
		definition: {
			name: 'update_document',
			title: 'Update a document',
			description:
				"Update fields on an existing document. Only the fields in `data` change; a field is replaced whole, so for an edit inside a list or rich text use patch_document. Pass `expectedRevision` (the `_meta.revision` you last read) so a newer change isn't overwritten. Answers with the saved document skimmed. If `content_patch_fields`/`content_save_draft` are available, use those for the document open in the admin editor, which won't show this tool's write until it reloads.",
			mutates: true,
			requiredCapabilities: ['document.update'],
			execution: 'server',
			inputSchema: z.object({
				collection: z.string().describe('Collection name'),
				id: z.string().describe('Document id'),
				data: z.record(z.string(), z.unknown()).describe('Partial field values to update'),
				publish: z.boolean().optional().describe('Publish after updating (default false)'),
				expectedRevision: z
					.number()
					.optional()
					.describe('CAS guard — the revision you last read; mismatch fails instead of overwriting')
			})
		},
		execute: async (
			args: Record<string, unknown>,
			{ aphexCMS, context }: AgentToolExecutionContext
		) => {
			const api = aphexCMS.localAPI;
			const collection = asString(args, 'collection');
			const id = asString(args, 'id');
			const data = asRecord(args, 'data');
			if (!collection || !id || !data)
				return fail('Missing required arguments: collection, id (strings), data (object)');
			const col = api.getCollection(collection);
			if (!col) return fail(`Unknown collection: ${collection}`);
			try {
				const result = await col.update(context, id, data, {
					publish: args.publish === true,
					rejectNewUnknownFields: true,
					expectedRevision:
						typeof args.expectedRevision === 'number' ? args.expectedRevision : undefined
				});
				if (!result) return fail(`Document not found: ${collection}/${id}`);
				return ok(savedView(result, data));
			} catch (err) {
				return fail(`Update failed: ${err instanceof Error ? err.message : String(err)}`);
			}
		}
	},
	{
		definition: {
			name: 'patch_document',
			title: 'Edit a document',
			description:
				'Change part of a document by path, without sending the rest back: one heading in a page of blocks, a sentence in rich text, a block moved, added or removed. Prefer it to update_document for any edit inside a list or rich text. Address list items by their _key (`blocks[_key=="k3"].heading`), read from get_document. Operations apply in order, all or none. ' +
				'`set` a value; `unset` a field or remove an item; `insert` items before/after an item, or at the start/end of a list (new items get keys); `move` an item before/after another; `replaceText` swaps one exact phrase anywhere under the path (it must occur once; in rich text, a phrase crossing bold or a link is split, so find part of it). ' +
				'Singletons need no id. Answers with the new revision, not the document.',
			mutates: true,
			requiredCapabilities: ['document.update'],
			execution: 'server',
			inputSchema: z.object({
				collection: z.string().describe('Collection name'),
				id: z.string().optional().describe('Document id (leave out for a singleton)'),
				operations: z.array(patchOperationSchema).min(1).describe('Edits, applied in order'),
				publish: z.boolean().optional().describe('Publish after patching (default false)'),
				expectedRevision: z
					.number()
					.optional()
					.describe(
						'The revision you last read. Leave it out and the patch applies to the latest draft, re-applied once if someone saves in between.'
					)
			})
		},
		execute: async (
			args: Record<string, unknown>,
			{ aphexCMS, context }: AgentToolExecutionContext
		) => {
			const api = aphexCMS.localAPI;
			const collection = asString(args, 'collection');
			if (!collection) return fail('Missing required string argument: collection');
			const col = api.getCollection(collection);
			if (!col) return fail(`Unknown collection: ${collection}`);
			const parsed = z.array(patchOperationSchema).min(1).safeParse(args.operations);
			if (!parsed.success) return fail(`Invalid operations: ${parsed.error.message}`);
			const id = asString(args, 'id') ?? col.getSingletonId(context);
			if (!id) return fail('Missing id (only a singleton can leave it out)');
			if (!asString(args, 'id')) await col.get(context);
			const given = typeof args.expectedRevision === 'number' ? args.expectedRevision : undefined;

			// Read, patch, write the fields it touched, guarded by the revision read. A
			// save in between re-reads and re-applies once: paths name items by key, so
			// the patch means the same on the newer draft.
			for (let attempt = 0; ; attempt++) {
				try {
					const doc = await col.findByID(context, id, { perspective: 'draft' });
					if (!doc) return fail(`Document not found: ${collection}/${id}`);
					const { data, revision: read } = documentFields(doc);
					const revision = given ?? read;
					const { data: patched, fields } = applyPatch(data, parsed.data);
					const changes = Object.fromEntries(
						fields.map((field) => [field, patched[field] ?? null])
					);
					const result = await col.update(context, id, changes, {
						publish: args.publish === true,
						rejectNewUnknownFields: true,
						expectedRevision: revision
					});
					if (!result) return fail(`Document not found: ${collection}/${id}`);
					const { validation } = result;
					const saved =
						result.document && typeof result.document === 'object'
							? documentMeta(result.document)
							: {};
					return ok({
						id,
						...saved,
						changed: fields,
						...(validation.isValid ? {} : { validation: validation.errors })
					});
				} catch (err) {
					if (isRevisionConflictError(err) && given === undefined && attempt === 0) continue;
					if (err instanceof PatchError) return fail(err.message);
					return fail(`Patch failed: ${err instanceof Error ? err.message : String(err)}`);
				}
			}
		}
	},
	{
		definition: {
			name: 'publish_document',
			title: 'Publish a document',
			description:
				"Publish a document (copies its current draft to the published perspective). Pass `expectedRevision` (from a prior read/write's `document._meta.revision`) to guard against publishing over a change made since you last read it.",
			mutates: true,
			requiredCapabilities: ['document.publish'],
			execution: 'server',
			inputSchema: z.object({
				collection: z.string().describe('Collection name'),
				id: z.string().describe('Document id'),
				expectedRevision: z
					.number()
					.optional()
					.describe('CAS guard — the revision you last read; mismatch fails instead of overwriting')
			})
		},
		execute: async (
			args: Record<string, unknown>,
			{ aphexCMS, context }: AgentToolExecutionContext
		) => {
			const api = aphexCMS.localAPI;
			const collection = asString(args, 'collection');
			const id = asString(args, 'id');
			if (!collection || !id) return fail('Missing required string arguments: collection, id');
			const col = api.getCollection(collection);
			if (!col) return fail(`Unknown collection: ${collection}`);
			try {
				const doc = await col.publish(context, id, {
					expectedRevision:
						typeof args.expectedRevision === 'number' ? args.expectedRevision : undefined
				});
				if (!doc) return fail(`Document not found: ${collection}/${id}`);
				return ok({ id, ...(typeof doc === 'object' ? documentMeta(doc) : {}) });
			} catch (err) {
				return fail(`Publish failed: ${err instanceof Error ? err.message : String(err)}`);
			}
		}
	},
	{
		definition: {
			name: 'get_singleton',
			title: 'Get settings',
			description:
				'Get a singleton document (a type where exactly one exists, e.g. site settings — flagged `singleton: true` in describe_cms). No id needed; the canonical row is resolved (and lazily created empty on first access). Use this instead of get_document for singletons.',
			mutates: false,
			requiredCapabilities: ['document.read'],
			execution: 'server',
			inputSchema: z.object({
				collection: z.string().describe('Singleton collection name'),
				perspective: z.enum(['draft', 'published']).optional(),
				...readShape,
				path: z.string().optional().describe('Read one value only, e.g. navigation[0]')
			})
		},
		execute: async (
			args: Record<string, unknown>,
			{ aphexCMS, context }: AgentToolExecutionContext
		) => {
			const api = aphexCMS.localAPI;
			const collection = asString(args, 'collection');
			if (!collection) return fail('Missing required string argument: collection');
			const col = api.getCollection(collection);
			if (!col) return fail(`Unknown collection: ${collection}`);
			try {
				const doc = await col.get(context, { perspective: perspectiveArg(args.perspective) });
				return ok(
					doc && typeof doc === 'object'
						? readDocument(
								doc,
								args,
								api.getCollectionSchema(collection),
								aphexCMS.config.schemaTypes
							)
						: doc
				);
			} catch (err) {
				// SingletonOperationError when the type isn't a singleton — surface its message.
				return fail(err instanceof Error ? err.message : String(err));
			}
		}
	},
	{
		definition: {
			name: 'update_singleton',
			title: 'Edit settings',
			description:
				'Update a singleton document (e.g. site settings). No id needed — the canonical row is resolved by type. Include only the fields to change in `data`. Set publish:true to publish the result. Use this instead of update_document for singletons.',
			mutates: true,
			requiredCapabilities: ['document.update'],
			execution: 'server',
			inputSchema: z.object({
				collection: z.string().describe('Singleton collection name'),
				data: z.record(z.string(), z.unknown()).describe('Partial field values to update'),
				publish: z.boolean().optional().describe('Publish after updating (default false)')
			})
		},
		execute: async (
			args: Record<string, unknown>,
			{ aphexCMS, context }: AgentToolExecutionContext
		) => {
			const api = aphexCMS.localAPI;
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
				const result = await col.update(context, id, data, {
					publish: args.publish === true,
					rejectNewUnknownFields: true
				});
				if (!result) return fail(`Failed to update singleton '${collection}'.`);
				return ok(savedView(result, data));
			} catch (err) {
				return fail(`Update failed: ${err instanceof Error ? err.message : String(err)}`);
			}
		}
	},
	{
		definition: {
			name: 'list_assets',
			title: 'List files',
			description: `List media assets (images and files) in this organization, newest first. Returns ${ASSETS_DEFAULT} at a time (${ASSETS_MAX} at most) with the \`total\`; when \`hasMore\`, pass \`nextOffset\` as \`offset\` for the next page. \`search\` by name or alt text instead of reading every page.`,
			mutates: false,
			requiredCapabilities: ['asset.read'],
			execution: 'server',
			inputSchema: z.object({
				search: z.string().optional().describe('Matches filename, title, alt text, description'),
				assetType: z.enum(['image', 'file']).optional(),
				limit: z
					.number()
					.optional()
					.describe(`Files to return (default ${ASSETS_DEFAULT}, max ${ASSETS_MAX})`),
				offset: z.number().optional().describe('Files to skip (default 0)')
			})
		},
		execute: async (
			args: Record<string, unknown>,
			{ aphexCMS, context }: AgentToolExecutionContext
		) => {
			if (!context.auth || !hasCapability(context.auth, 'asset.read')) {
				return fail("Forbidden: 'asset.read' capability required.");
			}
			const { assetService, databaseAdapter } = aphexCMS;
			const orgId = context.organizationId;
			const search = asString(args, 'search') ?? undefined;
			const assetType =
				args.assetType === 'image' || args.assetType === 'file' ? args.assetType : undefined;
			const wanted = typeof args.limit === 'number' ? Math.floor(args.limit) : ASSETS_DEFAULT;
			const limit = Math.min(Math.max(wanted, 1), ASSETS_MAX);
			const offset = typeof args.offset === 'number' ? Math.max(Math.floor(args.offset), 0) : 0;
			const filters: AssetFilters = { search, assetType, limit, offset };
			try {
				const [assets, total] = await Promise.all([
					assetService.findAssets(orgId, filters),
					databaseAdapter.countAssets(orgId, filters)
				]);
				const next = offset + assets.length;
				const hasMore = assets.length > 0 && next < total;
				return ok({
					assets: assets.map(assetView),
					total,
					hasMore,
					...(hasMore ? { nextOffset: next } : {})
				});
			} catch (err) {
				return fail(`List assets failed: ${err instanceof Error ? err.message : String(err)}`);
			}
		}
	},
	{
		definition: {
			name: 'upload_asset',
			title: 'Upload a file',
			description:
				'Upload an image or file and get back a ready-to-reference value. Provide either ' +
				'`data` (base64 file contents) or `url` (fetched server-side — use this for an image ' +
				'found via search or a link you were given, not `data`, since you cannot produce raw ' +
				'file bytes yourself). The response includes `imageValue` and `fileValue` — drop the ' +
				'matching one straight into a document field (e.g. a blog post `coverImage`, an author ' +
				'`avatar`, or an inline `image` block) via update_document. File type is verified from ' +
				'the actual bytes, not the declared name or URL.',
			mutates: true,
			requiredCapabilities: ['asset.upload'],
			execution: 'server',
			inputSchema: z.object({
				data: z
					.string()
					.min(1)
					.optional()
					.describe('Base64-encoded file contents (no data: URI prefix).'),
				url: z
					.string()
					.url()
					.optional()
					.describe('An http(s) URL to fetch the file from. Provide exactly one of `data`/`url`.'),
				filename: z
					.string()
					.min(1)
					.optional()
					.describe(
						'Original filename, e.g. "cover.png". Its extension helps typing. Required with ' +
							'`data`; derived from the URL when omitted with `url`.'
					),
				mimeType: z
					.string()
					.optional()
					.describe('Declared MIME type. Optional — the bytes are sniffed regardless.'),
				alt: z.string().optional().describe('Default alt text, shared across every placement.'),
				title: z.string().optional(),
				description: z.string().optional()
			})
		},
		execute: async (
			args: Record<string, unknown>,
			{ aphexCMS, context }: AgentToolExecutionContext
		) => {
			if (!context.auth || !hasCapability(context.auth, 'asset.upload')) {
				return fail("Forbidden: 'asset.upload' capability required.");
			}
			const { assetService } = aphexCMS;
			const orgId = context.organizationId;
			const base64 = asString(args, 'data');
			const url = asString(args, 'url');
			if (!base64 && !url) return fail("Provide either 'data' or 'url'.");
			if (base64 && url) return fail("Provide only one of 'data' or 'url', not both.");

			let buffer: Buffer;
			let sniffedMime: string | null = null;
			let filename = asString(args, 'filename');
			if (url) {
				try {
					const remote = await fetchRemoteFile(url);
					buffer = remote.buffer;
					sniffedMime = remote.contentType;
				} catch (err) {
					return fail(`Fetching 'url' failed: ${err instanceof Error ? err.message : String(err)}`);
				}
				if (!filename) {
					const last = new URL(url).pathname.split('/').filter(Boolean).pop();
					filename = last && last.includes('.') ? last : 'upload';
				}
			} else {
				try {
					buffer = Buffer.from(base64 as string, 'base64');
				} catch {
					return fail("'data' is not valid base64.");
				}
			}
			if (!filename) return fail("'filename' is required.");
			if (buffer.length === 0) return fail('File contents decoded to zero bytes.');

			const declaredMime = asString(args, 'mimeType') ?? sniffedMime ?? '';
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
					asset: assetView(asset),
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

function toMcpResult(result: AgentToolResult): McpToolResult {
	if (result.success) {
		return {
			content: [
				// Compact: indentation is a third of a page's tokens and tells a model nothing.
				{ type: 'text', text: JSON.stringify(result.data) },
				...(result.images ?? []).map((image) => ({
					type: 'image' as const,
					data: image.data,
					mimeType: image.mimeType
				}))
			]
		};
	}
	return { content: [{ type: 'text', text: result.error ?? 'Tool failed' }], isError: true };
}

export interface ResolveAgentToolsOptions {
	/** Set when the caller has a live document editor tab to bridge into — see
	 * `document-workspace-registry.svelte.ts` and `types/document-workspace.ts`. Only when
	 * this is present are the `execution: 'workspace'` tools (`content-workspace-tools.ts`)
	 * advertised at all; MCP and any request with no matching open document never see them,
	 * since there's no live draft on the other end to round-trip into. */
	documentContext?: { collection: string; id: string };
}

/**
 * The full set of tools this caller can see: core built-ins plus any
 * plugin-contributed `aphex/agent/tool` parts their capabilities unlock
 * (`partResolver.agentToolsForCapabilities`), plus the workspace-bridge tools when
 * `documentContext` is given — the one shared list MCP, the in-admin agent runtime
 * (`ai/run-agent-turn.ts`), and any other future tool-calling transport all resolve from.
 * Core built-ins always win a name collision, since they're the platform's own contract.
 */
export function resolveAgentTools(
	{ aphexCMS, context }: McpToolDeps,
	opts?: ResolveAgentToolsOptions
): ContentAgentTool[] {
	const coreNames = new Set(contentAgentTools.map((t) => t.definition.name));
	const callerCapabilities = context.auth ? [...resolveCapabilities(context.auth)] : [];
	const pluginTools = aphexCMS.partResolver
		.agentToolsForCapabilities(callerCapabilities)
		.filter((t) => !coreNames.has(t.definition.name));
	// Core tools the caller can't run aren't offered either, as with plugin tools: a
	// model shown `publish_document` will try it and tell the user it failed. Each
	// tool's `execute` still checks, so this only decides what's listed.
	const held = new Set(callerCapabilities);
	const coreTools = context.overrideAccess
		? contentAgentTools
		: contentAgentTools.filter((t) =>
				(t.definition.requiredCapabilities ?? []).every((capability) => held.has(capability))
			);

	const base = [...coreTools, ...pluginTools];
	if (opts?.documentContext) {
		// `update_document` writes straight to the DB and bypasses the open editor. Its
		// description already told the model to prefer the workspace tools here, but a prompt
		// preference is not a guarantee — the model still reached for it (users had to explicitly
		// ask for a refresh). Removing it as a *choice* while a document is bridged is the actual
		// fix: the only path left for editing that document is the one that stays in sync.
		const { collection, id } = opts.documentContext;
		const workspaceTools = contentWorkspaceTools.map((tool) => ({
			...tool,
			definition: {
				...tool.definition,
				description:
					`${tool.definition.description} Exact target: existing document ${collection}/${id}. ` +
					'This tool cannot create a document and must not be used for another collection or document.'
			}
		}));
		// patch_document writes straight to the database the same way.
		const direct = new Set(['update_document', 'patch_document']);
		return [...base.filter((t) => !direct.has(t.definition.name)), ...workspaceTools];
	}
	// Defense in depth: without a live document to bridge into, a `workspace`-execution tool
	// (core or plugin-contributed) must never be advertised — there's nothing on the other
	// end to resolve it, and `run-agent-turn.ts` would otherwise pause a turn forever.
	return base.filter((t) => t.definition.execution !== 'workspace');
}

/** `publish_document` → "Publish document": a tool's name in words, for clients to show. */
export function toolTitle(name: string): string {
	const words = name.replace(/[_-]+/g, ' ').trim();
	return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Names of tools that only add something new, never change or remove what's there. */
const ADDS_ONLY = /^(create|upload|add)_/;

/**
 * Adapt `resolveAgentTools` into the MCP SDK's expected shape for one authenticated
 * request. All the actual tool logic lives in `contentAgentTools`/plugin parts above —
 * this is purely a transport-shape + result-shape conversion.
 */
export function buildContentTools(
	deps: McpToolDeps,
	options: {
		/**
		 * Called after every call of a tool that `mutates`, succeeded or not, with what it
		 * returned: the MCP route records it in the caller's change set (`mcp/change-sets.ts`).
		 */
		onWrite?: (
			name: string,
			args: Record<string, unknown>,
			result: AgentToolResult
		) => Promise<void>;
	} = {}
): McpTool[] {
	const { aphexCMS, context } = deps;
	return resolveAgentTools(deps).map(({ definition, execute }) => ({
		name: definition.name,
		description: definition.description,
		inputSchema: (definition.inputSchema as z.ZodObject<z.ZodRawShape>).shape,
		mutates: definition.mutates,
		title: definition.title ?? toolTitle(definition.name),
		destructive: definition.mutates && (definition.destructive ?? !ADDS_ONLY.test(definition.name)),
		openWorld: definition.openWorld ?? false,
		handler: async (args: Record<string, unknown>) => {
			const result = await execute(args, { aphexCMS, context });
			if (definition.mutates) await options.onWrite?.(definition.name, args, result);
			return toMcpResult(result);
		}
	}));
}
