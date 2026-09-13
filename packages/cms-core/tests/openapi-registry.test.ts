/**
 * The registry is the one hand-maintained piece of the OpenAPI pipeline, so it is
 * the one piece that can rot. These tests diff it against Hono's own route table:
 * mount an endpoint without describing it (or describe one that no longer exists)
 * and CI fails with the exact key.
 *
 * That is the whole reason the spec is worth having. A documentation artifact that
 * can drift silently is worse than none — it is confidently wrong.
 */
import { describe, it, expect } from 'vitest';
import { createAphexApi, mountAphexBuiltins } from '../src/lib/server/api/index';
import { ROUTE_REGISTRY, routeKey } from '../src/lib/server/api/openapi/registry';
import { generateOpenApiDocument } from '../src/lib/server/api/openapi/generate';
import type { SchemaType } from '../src/lib/types/schemas';

function mountedRoutes(): Set<string> {
	const app = createAphexApi();
	mountAphexBuiltins(app);
	const keys = new Set<string>();
	for (const route of app.routes) {
		// `ALL` entries are the body-limit and bridge middleware, not endpoints.
		if (route.method === 'ALL') continue;
		keys.add(routeKey(route.method, route.path));
	}
	return keys;
}

function registryKeys(): Set<string> {
	return new Set(ROUTE_REGISTRY.map((r) => routeKey(r.method, r.path)));
}

describe('OpenAPI registry ↔ mounted routes', () => {
	it('describes every mounted route', () => {
		const missing = [...mountedRoutes()].filter((k) => !registryKeys().has(k)).sort();
		expect(
			missing,
			`Mounted but undescribed. Add a row to server/api/openapi/registry.ts:\n${missing.join('\n')}`
		).toEqual([]);
	});

	it('describes no route that is not mounted', () => {
		const mounted = mountedRoutes();
		const stale = [...registryKeys()].filter((k) => !mounted.has(k)).sort();
		expect(stale, `Described but not mounted — stale registry rows:\n${stale.join('\n')}`).toEqual(
			[]
		);
	});

	it('gives every route a summary and a tag', () => {
		const incomplete = ROUTE_REGISTRY.filter((r) => !r.summary?.trim() || !r.tag?.trim()).map((r) =>
			routeKey(r.method, r.path)
		);
		expect(incomplete).toEqual([]);
	});
});

describe('generateOpenApiDocument', () => {
	const schemaTypes: SchemaType[] = [
		{
			type: 'document',
			name: 'post',
			title: 'Post',
			fields: [
				{
					name: 'title',
					type: 'string',
					title: 'Title',
					validation: (Rule: any) => Rule.required()
				},
				{ name: 'slug', type: 'slug', title: 'Slug' },
				{ name: 'hero', type: 'image', title: 'Hero' },
				{ name: 'body', type: 'array', title: 'Body', of: [{ type: 'block' }] },
				// An object type reached through an array — this is what produces a
				// `$ref` to a named object component.
				{ name: 'blocks', type: 'array', title: 'Blocks', of: [{ type: 'callout' }] },
				{ name: 'author', type: 'reference', title: 'Author', to: [{ type: 'person' }] }
			]
		} as unknown as SchemaType,
		{
			type: 'document',
			name: 'person',
			title: 'Person',
			fields: [{ name: 'name', type: 'string', title: 'Name' }]
		} as unknown as SchemaType,
		{
			type: 'object',
			name: 'callout',
			title: 'Callout',
			fields: [{ name: 'text', type: 'string', title: 'Text' }]
		} as unknown as SchemaType
	];

	const doc = generateOpenApiDocument({ schemaTypes, serverUrl: 'https://cms.example.com' });
	const components = (doc.components as any).schemas as Record<string, any>;

	it('is a valid-looking 3.1 document', () => {
		expect(doc.openapi).toBe('3.1.0');
		expect((doc.info as any).title).toContain('AphexCMS');
		expect((doc.servers as any)[0].url).toBe('https://cms.example.com');
	});

	it('converts Hono path params to OpenAPI syntax', () => {
		const paths = doc.paths as Record<string, unknown>;
		expect(paths['/api/documents/{id}']).toBeDefined();
		expect(paths['/api/documents/{id}/versions/{version}']).toBeDefined();
		expect(paths['/api/documents/:id']).toBeUndefined();
	});

	it('declares path parameters from the path itself', () => {
		const op = (doc.paths as any)['/api/documents/{id}/versions/{version}'].get;
		const names = op.parameters.map((p: any) => p.name);
		expect(names).toEqual(expect.arrayContaining(['id', 'version']));
	});

	it('derives query parameters from the zod contract', () => {
		const op = (doc.paths as any)['/api/documents'].get;
		const names = op.parameters.map((p: any) => p.name);
		// Straight from listDocumentsQuery — not retyped anywhere.
		expect(names).toEqual(
			expect.arrayContaining(['type', 'status', 'page', 'pageSize', 'perspective'])
		);
		const perspective = op.parameters.find((p: any) => p.name === 'perspective');
		expect(perspective.schema.enum).toEqual(['draft', 'published']);
	});

	it('expands the create body into a discriminated union', () => {
		const body = (doc.paths as any)['/api/documents'].post.requestBody.content['application/json']
			.schema;
		expect(body.oneOf).toHaveLength(2); // post + person
		// A discriminator can only select named schemas, so the variants must be
		// `$ref`s rather than inline objects.
		expect(body.oneOf[0].$ref).toBe('#/components/schemas/PostCreateRequest');
		const variant = components.PostCreateRequest;
		expect(variant.properties.type.const).toBe('post');
		expect(variant.properties.draftData.$ref).toBe('#/components/schemas/PostData');
		// `type` in the body is what makes the variants mutually exclusive, so the
		// discriminator is what makes `oneOf` a true claim rather than a wish.
		expect(body.discriminator.propertyName).toBe('type');
		expect(body.discriminator.mapping.post).toBe('#/components/schemas/PostCreateRequest');
	});

	it('uses anyOf, not oneOf, for the update body', () => {
		// A PUT carries no `type` — nothing distinguishes the variants, so `oneOf`
		// would be false (an empty body matches every one of them).
		const body = (doc.paths as any)['/api/documents/{id}'].put.requestBody.content[
			'application/json'
		].schema;
		expect(body.oneOf).toBeUndefined();
		expect(body.anyOf).toHaveLength(2);
		expect(body.anyOf[0].$ref).toBe('#/components/schemas/PostUpdateRequest');
		expect(body.discriminator).toBeUndefined();
		// No `type` on an update — the id in the path settles the collection.
		expect(components.PostUpdateRequest.properties.type).toBeUndefined();
	});

	it('builds a component per schema type with required fields marked', () => {
		expect(components.PostData).toBeDefined();
		expect(components.PersonData).toBeDefined();
		// `title` has Rule.required(); nothing else does.
		expect(components.PostData.required).toEqual(['title']);
	});

	it('emits named object types as components reachable by $ref', () => {
		expect(components.PostData.properties.blocks.items.$ref).toBe('#/components/schemas/Callout');
		expect(components.Callout).toBeDefined();
	});

	it('prunes shared components this instance never references', () => {
		// The fixture has an image field but no file field.
		expect(components.ImageValue).toBeDefined();
		expect(components.FileValue).toBeUndefined();
	});

	it('rejects undeclared fields in the spec, as the validator does', () => {
		expect(components.PostData.additionalProperties).toBe(false);
	});

	it('types a slug as a bare string, never { current }', () => {
		expect(components.PostData.properties.slug.type).toBe('string');
		expect(components.PostData.properties.slug.properties).toBeUndefined();
	});

	it('maps images, references and portable text to shared components', () => {
		expect(components.PostData.properties.hero.$ref).toBe('#/components/schemas/ImageValue');
		expect(components.PostData.properties.body.items.$ref).toBe(
			'#/components/schemas/PortableTextBlock'
		);
		expect(JSON.stringify(components.PostData.properties.author)).toContain('Reference');
	});

	it('documents both 400 shapes', () => {
		expect(components.ZodIssue).toBeDefined();
		expect(components.ValidationIssue).toBeDefined();
		expect(components.ValidationIssue.properties.kind.enum).toContain('structural');
	});

	it('marks a 409 only on the CAS-bearing writes', () => {
		expect((doc.paths as any)['/api/documents/{id}'].put.responses['409']).toBeDefined();
		expect((doc.paths as any)['/api/roles'].post.responses['409']).toBeUndefined();
	});

	it('advertises the right security scheme per auth mode', () => {
		const securitySchemes = (doc.components as any).securitySchemes;
		expect(securitySchemes.apiKey.name).toBe('x-api-key');
		// Health is public. An empty array is OpenAPI's "explicitly no auth";
		// omitting the key would instead mean "inherit the root requirement".
		expect((doc.paths as any)['/api/aphex-health'].get.security).toEqual([]);
		// Plugin settings are session-only.
		expect((doc.paths as any)['/api/plugin-settings'].get.security).toEqual([{ session: [] }]);
		// The worker endpoint is secret-gated.
		expect((doc.paths as any)['/api/internal/workers/run'].post.security).toEqual([
			{ workerSecret: [] }
		]);
	});

	it('describes a Date-bearing contract instead of throwing', () => {
		// `z.date()` has no JSON Schema equivalent and zod's default is to throw,
		// which took the whole endpoint down rather than degrading. Several asset
		// and version contracts accept `z.union([z.string(), z.date()])` because the
		// adapter may return either.
		const listAssets = (doc.paths as any)['/api/assets'].get.responses['200'].content[
			'application/json'
		].schema;
		const createdAt = listAssets.properties.data.items.properties.createdAt;
		expect(JSON.stringify(createdAt)).toContain('date-time');
	});

	it('reports pagination only where the endpoint actually paginates', () => {
		const listAssets = (doc.paths as any)['/api/assets'].get.responses['200'].content[
			'application/json'
		].schema;
		expect(listAssets.properties.pagination).toBeDefined();
		// A single-resource read has no pagination, and the spec must not imply one.
		const getAsset = (doc.paths as any)['/api/assets/{id}'].get.responses['200'].content[
			'application/json'
		].schema;
		expect(getAsset.properties.pagination).toBeUndefined();
		// Nor does the generic fallback envelope.
		expect(components.SuccessResponse.properties.pagination).toBeUndefined();
	});

	it('carries the asset listing’s reporting fields', () => {
		// `indexing`, `limits` and `images` are returned by the handler and were
		// missing from the response contract until the spec surfaced the gap.
		const listAssets = (doc.paths as any)['/api/assets'].get.responses['200'].content[
			'application/json'
		].schema;
		expect(Object.keys(listAssets.properties)).toEqual(
			expect.arrayContaining(['data', 'pagination', 'indexing', 'limits', 'images'])
		);
	});

	it('describes the filter DSL that the zod contract leaves as unknown', () => {
		// `where` is `z.unknown()` on purpose (LocalAPI.find parses it), which
		// converts to `{}` — accurate, useless, and enough for a UI to invent a
		// plausible example that silently matches nothing.
		const body = (doc.paths as any)['/api/documents/query'].post.requestBody;
		const schema = body.content['application/json'].schema;
		expect(schema.properties.where.$ref).toBe('#/components/schemas/WhereFilter');
		expect(components.WhereFilter.properties.or).toBeDefined();
		expect(components.FieldFilter.properties.contains).toBeDefined();
		// A worked example, so nothing has to guess one.
		expect(body.content['application/json'].example.where).toEqual({
			title: { contains: 'incident' }
		});
	});

	it('survives an instance with no schemas at all', () => {
		const empty = generateOpenApiDocument({ schemaTypes: [] });
		const body = (empty.paths as any)['/api/documents'].post.requestBody.content['application/json']
			.schema;
		// Falls back to the generic contract rather than emitting an empty oneOf.
		expect(body.oneOf).toBeUndefined();
		expect(body.properties.type).toBeDefined();
	});
});
