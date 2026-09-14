/**
 * Build the OpenAPI 3.1 document for *this* instance.
 *
 * Two halves, deliberately:
 *
 * - The **generic** half comes from the zod request/query contracts in
 *   `api/schemas/*`, via `z.toJSONSchema`. Nothing is retyped — a change to a
 *   contract changes the spec on the next request.
 * - The **per-instance** half comes from `config.schemaTypes`. A static file can
 *   never say what goes in `draftData` for a `post`, because that only exists in
 *   this deployment. That's the reason this is generated at request time rather
 *   than checked in.
 *
 * Path params are read off the Hono path (`:id` → `{id}`) rather than declared,
 * so a renamed param can't silently disagree with the route.
 */
import { z, type ZodType } from 'zod';
import type { SchemaType } from '../../../types/schemas';
import { cmsLogger } from '../../../utils/logger';
import { ROUTE_REGISTRY, TAG_DESCRIPTIONS, type RouteMeta, type AuthMode } from './registry';
import {
	buildSchemaComponents,
	componentName,
	SHARED_VALUE_COMPONENTS,
	type JsonSchema
} from './json-schema';

export interface OpenApiOptions {
	/** Document types drive the per-collection request bodies. */
	schemaTypes?: SchemaType[];
	/** Server URL to advertise, e.g. `https://cms.example.com`. */
	serverUrl?: string;
	title?: string;
	version?: string;
}

/**
 * `z.toJSONSchema` emits a `$schema` key and, for `.refine()`-bearing objects,
 * keeps input-side semantics only under `io: 'input'` — which is what a *request*
 * body is. Strip `$schema`: it's valid JSON Schema but noise inside a component.
 *
 * Two guards, both learned the hard way:
 *
 * - **`unrepresentable: 'any'`.** `z.date()` has no JSON Schema equivalent, and
 *   the default is to *throw*. Several contracts legitimately accept
 *   `z.union([z.string(), z.date()])` because an adapter may hand back either, so
 *   the default would take the whole endpoint down over a field that serialises
 *   to a string anyway. The `override` below then restores the useful part by
 *   describing a Date as the ISO string it becomes on the wire.
 * - **The try/catch.** A description endpoint must not be able to 500. If some
 *   future contract can't be converted at all, that one schema degrades to
 *   "unconstrained" and the rest of the document still renders.
 */
function zodToJson(schema: ZodType): JsonSchema {
	try {
		const out = z.toJSONSchema(schema, {
			io: 'input',
			unrepresentable: 'any',
			override: (ctx) => {
				if (ctx.zodSchema._zod.def.type === 'date') {
					Object.assign(ctx.jsonSchema, {
						type: 'string',
						format: 'date-time',
						description: 'ISO 8601 timestamp.'
					});
				}
			}
		}) as JsonSchema;
		delete out.$schema;
		return out;
	} catch (error) {
		cmsLogger.warn(
			'[openapi]',
			'Could not convert a zod contract to JSON Schema; describing it as unconstrained.',
			error
		);
		return {
			description:
				'This contract could not be expressed as JSON Schema. See the endpoint documentation.'
		};
	}
}

/** `/api/documents/:id/versions/:version` → `/api/documents/{id}/versions/{version}`. */
function toOpenApiPath(honoPath: string): string {
	return honoPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

/** Path parameters implied by the route's own path string. */
function pathParams(honoPath: string): JsonSchema[] {
	const names = [...honoPath.matchAll(/:([A-Za-z0-9_]+)/g)].map((m) => m[1]!);
	return names.map((name) => ({
		name,
		in: 'path',
		required: true,
		schema: { type: 'string' },
		description: name === 'id' ? 'Document, asset, organization or job id.' : undefined
	}));
}

/**
 * Query parameters from a zod object: one parameter per top-level property,
 * `required` mirroring the schema's own required list.
 */
function queryParams(schema: ZodType): JsonSchema[] {
	const json = zodToJson(schema);
	const props = (json.properties ?? {}) as Record<string, JsonSchema>;
	const required = new Set((json.required as string[] | undefined) ?? []);
	return Object.entries(props).map(([name, propSchema]) => {
		const { description, ...rest } = propSchema;
		return {
			name,
			in: 'query',
			required: required.has(name),
			schema: rest,
			...(description ? { description } : {})
		};
	});
}

const AUTH_NOTES: Record<AuthMode, string> = {
	read: 'Session or API key. A read-only API key is accepted.',
	write: 'Session or API key with `write` permission. A read-only key receives 403.',
	'read-via-post':
		'Read-only despite the POST method — accepted with a read-only API key. See the note on write protection.',
	public: 'No credentials required.',
	session: 'Session cookie only — API keys are rejected by this handler.',
	secret: 'Shared-secret bearer token (`jobs.workerSecret`), not user auth. 404 when unset.'
};

/** Standard error responses every route can produce. */
function errorResponses(auth: AuthMode): Record<string, JsonSchema> {
	const responses: Record<string, JsonSchema> = {
		'400': {
			description:
				'Request rejected. Two distinct shapes — see `ZodIssue` (malformed body) and `ValidationIssue` (valid body, invalid content).',
			content: {
				'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } }
			}
		}
	};
	if (auth !== 'public') {
		responses['401'] = {
			description: 'Missing or invalid credentials.',
			content: { 'application/json': { schema: { $ref: '#/components/schemas/MiddlewareError' } } }
		};
	}
	if (auth === 'write' || auth === 'session') {
		responses['403'] = {
			description:
				auth === 'session'
					? 'Authenticated, but this handler requires a session rather than an API key.'
					: 'Authenticated without `write` permission.',
			content: { 'application/json': { schema: { $ref: '#/components/schemas/MiddlewareError' } } }
		};
	}
	return responses;
}

/**
 * The request body for a document write, expanded per collection.
 *
 * `createDocumentRequest.draftData` is `Record<string, unknown>` — true, and
 * useless. With the live schemas we can say: `type: "post"` means `draftData`
 * matches `PostData`.
 *
 * The composition keyword differs by method, and the difference is real rather
 * than cosmetic:
 *
 * - **POST** carries `type` in the body, so the variants *are* mutually
 *   exclusive and `oneOf` + a `discriminator` on `type` is exactly right. The
 *   discriminator is what lets a client generator emit a tagged union.
 * - **PUT** targets an existing id and carries no `type`, so nothing in the body
 *   distinguishes a page write from a post write. `oneOf` would be a false claim
 *   (a validator must match exactly one, and an empty `{}` body matches all of
 *   them). `anyOf` says what is actually true: the payload matches at least one
 *   collection's shape, and which one is settled by the id in the path.
 */
function expandedDocumentBody(
	base: JsonSchema,
	documentTypes: SchemaType[],
	method: 'POST' | 'PUT',
	/** Variant schemas are registered here — a discriminator can only select `$ref`s. */
	components: Record<string, JsonSchema>
): JsonSchema {
	if (documentTypes.length === 0) return base;
	const baseProps = (base.properties ?? {}) as Record<string, JsonSchema>;
	const suffix = method === 'POST' ? 'CreateRequest' : 'UpdateRequest';

	const refs = documentTypes.map((schema) => {
		const name = `${componentName(schema.name)}${suffix}`;
		const dataRef = { $ref: `#/components/schemas/${componentName(schema.name)}Data` };
		const properties: Record<string, JsonSchema> = {
			...baseProps,
			draftData: dataRef,
			data: dataRef
		};
		if (method === 'POST') properties.type = { type: 'string', const: schema.name };
		components[name] = {
			title: `${schema.title ?? schema.name} — ${method === 'POST' ? 'create' : 'update'}`,
			type: 'object',
			properties,
			...(method === 'POST' ? { required: ['type'] } : {})
		};
		return { $ref: `#/components/schemas/${name}` };
	});

	const description =
		'Exactly one of `draftData` or `data` is required; both carry the same per-collection shape.';

	if (method === 'PUT') {
		return {
			anyOf: refs,
			description: `${description} The collection is determined by the document id in the path, not by the body.`
		};
	}

	return {
		oneOf: refs,
		discriminator: {
			propertyName: 'type',
			mapping: Object.fromEntries(
				documentTypes.map((s) => [s.name, `#/components/schemas/${componentName(s.name)}${suffix}`])
			)
		},
		description
	};
}

function buildOperation(
	route: RouteMeta,
	documentTypes: SchemaType[],
	components: Record<string, JsonSchema>
): { method: string; operation: JsonSchema } {
	const parameters = [...pathParams(route.path), ...(route.query ? queryParams(route.query) : [])];

	const operation: JsonSchema = {
		operationId: `${route.method.toLowerCase()}${toOpenApiPath(route.path)
			.replace(/[{}]/g, '')
			.split(/[/-]/)
			.filter(Boolean)
			.map((s) => s[0]!.toUpperCase() + s.slice(1))
			.join('')}`,
		summary: route.summary,
		description: [route.description, `**Auth:** ${AUTH_NOTES[route.auth]}`]
			.filter(Boolean)
			.join('\n\n'),
		tags: [route.tag],
		responses: {
			'200': {
				description: 'Success.',
				content: {
					'application/json': {
						// Prefer the endpoint's own response contract. The generic
						// envelope is a last resort and deliberately says nothing about
						// `data` or pagination — claiming a `pagination` object on an
						// endpoint that never returns one is worse than staying silent.
						schema: route.response
							? zodToJson(route.response)
							: { $ref: '#/components/schemas/SuccessResponse' }
					}
				}
			},
			...errorResponses(route.auth)
		}
	};

	if (route.method === 'POST' && route.path === '/api/documents') {
		(operation.responses as Record<string, JsonSchema>)['201'] = {
			description: 'Created.',
			content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } }
		};
		delete (operation.responses as Record<string, JsonSchema>)['200'];
	}

	if (route.auth === 'write' || route.auth === 'read' || route.auth === 'read-via-post') {
		operation.security = [{ apiKey: [] }, { session: [] }];
	} else if (route.auth === 'session') {
		operation.security = [{ session: [] }];
	} else if (route.auth === 'secret') {
		operation.security = [{ workerSecret: [] }];
	} else {
		// An empty array is how OpenAPI spells "explicitly no auth". Omitting the
		// key entirely means "inherit the root requirement", which is a different
		// claim and reads as an oversight to any linter.
		operation.security = [];
	}

	if (route.formData) {
		operation.requestBody = {
			required: true,
			content: {
				'multipart/form-data': {
					schema: {
						type: 'object',
						properties: route.formData.fields,
						required: ['file']
					}
				}
			}
		};
	} else if (route.request) {
		let schema = zodToJson(route.request);
		if (route.expandDocumentData) {
			schema = expandedDocumentBody(
				schema,
				documentTypes,
				route.method as 'POST' | 'PUT',
				components
			);
		}
		// Some fields are deliberately `z.unknown()` in the contract because they're
		// validated further down (the filter DSL is parsed by `LocalAPI.find()`, not
		// by zod). `z.unknown()` converts to `{}`, which tells a reader nothing and
		// leads a UI to invent a plausible-looking example that doesn't work — so
		// describe those fields here instead of leaving them blank.
		if (route.bodyOverrides) {
			const props = { ...((schema.properties ?? {}) as Record<string, JsonSchema>) };
			for (const [name, override] of Object.entries(route.bodyOverrides)) {
				if (name in props) props[name] = override;
			}
			schema = { ...schema, properties: props };
		}
		operation.requestBody = {
			required: true,
			content: {
				'application/json': {
					schema,
					// A worked example beats a generated one: a UI faced with an
					// unconstrained field will otherwise fill in something that parses
					// but matches nothing.
					...(route.requestExample ? { example: route.requestExample } : {})
				}
			}
		};
	}

	if (parameters.length > 0) operation.parameters = parameters;

	// CAS-bearing writes can conflict.
	if (route.request && 'shape' in (route.request as never)) {
		const shape = (route.request as unknown as { shape?: Record<string, unknown> }).shape;
		if (shape && 'expectedRevision' in shape) {
			(operation.responses as Record<string, JsonSchema>)['409'] = {
				description:
					'`expectedRevision` did not match — the document changed since you read it. The body carries `currentRevision`.',
				content: {
					'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } }
				}
			};
		}
	}

	return { method: route.method.toLowerCase(), operation };
}

/** Envelope and error components — the shapes every endpoint shares. */
const ENVELOPE_COMPONENTS: Record<string, JsonSchema> = {
	SuccessResponse: {
		type: 'object',
		description:
			'The shared success envelope, for endpoints that have no more specific response contract yet. `data` is endpoint-dependent; list endpoints also carry `pagination`.',
		properties: {
			success: { type: 'boolean', const: true },
			data: {}
		},
		required: ['success']
	},
	Pagination: {
		type: 'object',
		properties: {
			total: { type: 'integer' },
			page: { type: 'integer' },
			pageSize: { type: 'integer' },
			totalPages: { type: 'integer' },
			hasNextPage: { type: 'boolean' },
			hasPrevPage: { type: 'boolean' }
		}
	},
	ErrorResponse: {
		type: 'object',
		description:
			'Returned by a route handler. `issues` carries one of two shapes depending on which layer rejected the request.',
		properties: {
			success: { type: 'boolean', const: false },
			error: { type: 'string' },
			message: { type: 'string' },
			currentRevision: { type: 'integer', description: 'Present on a 409 conflict.' },
			issues: {
				type: 'array',
				items: {
					oneOf: [
						{ $ref: '#/components/schemas/ZodIssue' },
						{ $ref: '#/components/schemas/ValidationIssue' }
					]
				}
			}
		},
		required: ['success', 'error']
	},
	ZodIssue: {
		type: 'object',
		title: 'Malformed request body',
		description: 'The request did not parse against the endpoint contract.',
		properties: {
			code: { type: 'string' },
			path: { type: 'array', items: { type: 'string' } },
			message: { type: 'string' }
		}
	},
	ValidationIssue: {
		type: 'object',
		title: 'Invalid document content',
		description:
			'The body parsed, but the document data failed schema validation. `kind: "structural"` means a wrong JSON shape (a field that isn’t declared, a string where an array belongs) rather than a failed rule.',
		properties: {
			field: { type: 'string' },
			errors: { type: 'array', items: { type: 'string' } },
			kind: { type: 'string', enum: ['structural', 'rule'] }
		}
	},
	FieldFilter: {
		type: 'object',
		title: 'Field filter',
		description:
			'Operators for one field. Source of truth: `types/filters.ts`. Anything not listed here is silently ignored, which drops the whole clause.',
		properties: {
			equals: {},
			not_equals: {},
			in: { type: 'array', items: {} },
			not_in: { type: 'array', items: {} },
			exists: { type: 'boolean' },
			greater_than: {},
			greater_than_equal: {},
			less_than: {},
			less_than_equal: {},
			like: { type: 'string' },
			contains: { type: 'string' },
			starts_with: { type: 'string' },
			ends_with: { type: 'string' }
		},
		additionalProperties: false
	},
	WhereFilter: {
		type: 'object',
		title: 'Where clause',
		description:
			'Field name → operators. Multiple fields are ANDed. Dot-notation reaches nested fields ("seo.title"). `and`/`or` nest further clauses.',
		properties: {
			and: { type: 'array', items: { $ref: '#/components/schemas/WhereFilter' } },
			or: { type: 'array', items: { $ref: '#/components/schemas/WhereFilter' } }
		},
		additionalProperties: { $ref: '#/components/schemas/FieldFilter' },
		examples: [
			{ slug: { equals: 'contact' } },
			{ title: { contains: 'incident' }, 'seo.noIndex': { equals: false } },
			{ or: [{ slug: { equals: 'contact' } }, { slug: { equals: 'home' } }] }
		]
	},
	MiddlewareError: {
		type: 'object',
		description:
			'Returned by the auth middleware, which short-circuits before the handler — so it carries neither `success` nor `message`.',
		properties: { error: { type: 'string' } },
		required: ['error']
	}
};

/**
 * Drop components nothing points at, following `$ref`s transitively from the
 * paths so a component reachable only via another component survives.
 *
 * Without this, an instance whose schemas contain no `file` field still
 * advertises `FileValue`, and a generated client ships a type for a value the
 * API will never return here.
 */
function pruneUnreferenced(
	schemas: Record<string, JsonSchema>,
	paths: Record<string, Record<string, JsonSchema>>
): Record<string, JsonSchema> {
	const refsIn = (value: unknown, out: Set<string>): Set<string> => {
		if (Array.isArray(value)) {
			for (const item of value) refsIn(item, out);
		} else if (value && typeof value === 'object') {
			for (const [key, child] of Object.entries(value)) {
				if (key === '$ref' && typeof child === 'string') {
					const name = child.replace('#/components/schemas/', '');
					if (name !== child) out.add(name);
				} else {
					refsIn(child, out);
				}
			}
		}
		return out;
	};

	const reachable = refsIn(paths, new Set<string>());
	// Transitive closure: a component referenced only by another component.
	let frontier = [...reachable];
	while (frontier.length > 0) {
		const next: string[] = [];
		for (const name of frontier) {
			const schema = schemas[name];
			if (!schema) continue;
			for (const ref of refsIn(schema, new Set<string>())) {
				if (!reachable.has(ref)) {
					reachable.add(ref);
					next.push(ref);
				}
			}
		}
		frontier = next;
	}

	return Object.fromEntries(Object.entries(schemas).filter(([name]) => reachable.has(name)));
}

/** Build the full OpenAPI document. */
export function generateOpenApiDocument(options: OpenApiOptions = {}): JsonSchema {
	const schemaTypes = options.schemaTypes ?? [];
	const documentTypes = schemaTypes.filter((s) => s.type === 'document');

	const paths: Record<string, Record<string, JsonSchema>> = {};
	// Filled as operations are built — the per-collection write variants a
	// discriminator has to point at by `$ref`.
	const writeVariants: Record<string, JsonSchema> = {};
	for (const route of ROUTE_REGISTRY) {
		const path = toOpenApiPath(route.path);
		const { method, operation } = buildOperation(route, documentTypes, writeVariants);
		paths[path] ??= {};
		paths[path]![method] = operation;
	}

	// Tags in registry order, so the rendered doc opens on Documents rather than
	// alphabetising Agent to the top.
	const tags: Array<{ name: string; description?: string }> = [];
	for (const route of ROUTE_REGISTRY) {
		if (!tags.some((t) => t.name === route.tag)) {
			tags.push({ name: route.tag, description: TAG_DESCRIPTIONS[route.tag] });
		}
	}

	const schemas: Record<string, JsonSchema> = {
		...ENVELOPE_COMPONENTS,
		...SHARED_VALUE_COMPONENTS,
		...buildSchemaComponents(schemaTypes),
		...writeVariants
	};

	return {
		openapi: '3.1.0',
		info: {
			title: options.title ?? 'AphexCMS HTTP API',
			version: options.version ?? '1.0.0',
			license: { name: 'MIT', identifier: 'MIT' },
			description: [
				'Generated from this instance: the endpoint contracts come from the zod schemas the handlers validate with, and the per-collection document shapes from the schema types this deployment is running.',
				'',
				'**Write protection.** `POST`, `PUT`, `PATCH` and `DELETE` under `/api/` require an API key with `write` permission. Two read-shaped exceptions pass with a read-only key: `POST /api/documents/query`, and GraphQL queries at the configured `graphql.path`. Note this check applies to *every* POST under `/api/`, including custom routes you mount yourself.',
				'',
				'**Organization scoping.** An API key is scoped to the organization active when it was created; every request with that key sees only that organization’s data.'
			].join('\n')
		},
		...(options.serverUrl ? { servers: [{ url: options.serverUrl }] } : {}),
		tags,
		paths,
		components: {
			securitySchemes: {
				apiKey: {
					type: 'apiKey',
					in: 'header',
					name: 'x-api-key',
					description: 'A CMS API key. Scoped to one organization.'
				},
				session: {
					type: 'apiKey',
					in: 'cookie',
					name: 'session',
					description: 'Admin session cookie. Used by the studio UI.'
				},
				workerSecret: {
					type: 'http',
					scheme: 'bearer',
					description: '`jobs.workerSecret`. Machine-to-machine only.'
				}
			},
			// Drop shared value components this instance never references — an
			// instance with no `file` field anywhere shouldn't advertise FileValue.
			schemas: pruneUnreferenced(schemas, paths)
		}
	};
}
