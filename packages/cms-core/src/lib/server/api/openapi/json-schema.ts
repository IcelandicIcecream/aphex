/**
 * Field → JSON Schema, for the per-instance half of the OpenAPI document.
 *
 * The generic request contracts (`api/schemas/*.ts`) describe `draftData` as
 * `Record<string, unknown>`, which is honest but useless to a reader: the whole
 * question when you POST a document is *what goes in there*, and the answer only
 * exists in this instance's `schemaTypes`. So the spec gets a real component per
 * document type, generated at request time from the live config.
 *
 * This is the third walker over `Field` in the codebase — `type-gen.ts` emits
 * TypeScript, `graphql/schema.ts` emits SDL, this emits JSON Schema. The *emit*
 * genuinely differs each time (strings vs strings vs objects), but the
 * classification underneath must not: required-ness comes from the canonical
 * `isFieldRequired` in `field-validation/utils`, the same predicate the validator
 * itself runs, so a field that the API will reject as missing is the same field
 * the spec marks required.
 *
 * (Note: `graphql/schema.ts` has its own local `isFieldRequired` that string-matches
 * the validation function source. It disagrees with this one on any rule that
 * mentions "required" without being required. Not changed here — fixing it moves
 * GraphQL non-null markers, which is a breaking change for clients and deserves
 * its own decision.)
 */
import type { Field, SchemaType } from '../../../types/schemas';
import { isFieldRequired } from '../../../field-validation/utils';

/** A JSON Schema object, loose enough for the subset OpenAPI 3.1 accepts. */
export type JsonSchema = Record<string, unknown>;

/** Shared component schemas referenced by `$ref` from generated field shapes. */
export const SHARED_VALUE_COMPONENTS: Record<string, JsonSchema> = {
	Reference: {
		type: 'object',
		description: 'A link to another document. Only `_ref` is written by the caller.',
		properties: {
			_type: { type: 'string', const: 'reference' },
			_ref: { type: 'string', description: 'Target document id.' },
			_key: { type: 'string', description: 'Stable key when inside an array.' }
		},
		required: ['_ref']
	},
	ImageValue: {
		type: 'object',
		properties: {
			_type: { type: 'string', const: 'image' },
			asset: { $ref: '#/components/schemas/Reference' },
			alt: { type: 'string' },
			hotspot: { type: 'object', additionalProperties: true },
			crop: { type: 'object', additionalProperties: true }
		},
		required: ['asset']
	},
	FileValue: {
		type: 'object',
		properties: {
			_type: { type: 'string', const: 'file' },
			asset: { $ref: '#/components/schemas/Reference' }
		},
		required: ['asset']
	},
	PortableTextBlock: {
		type: 'object',
		description:
			'One block of Portable Text. Text blocks are managed by the editor; custom block types declared in the field’s `of` array appear as siblings with their own `_type`.',
		properties: {
			_type: { type: 'string' },
			_key: { type: 'string' },
			style: { type: 'string' },
			listItem: { type: 'string' },
			level: { type: 'number' },
			markDefs: { type: 'array', items: { type: 'object', additionalProperties: true } },
			children: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						_type: { type: 'string' },
						_key: { type: 'string' },
						text: { type: 'string' },
						marks: { type: 'array', items: { type: 'string' } }
					}
				}
			}
		},
		additionalProperties: true
	}
};

function withMeta(field: Field, schema: JsonSchema): JsonSchema {
	const out: JsonSchema = { ...schema };
	if (field.title) out.title = field.title;
	if (field.description) out.description = field.description;
	return out;
}

/**
 * Reference targets as a `$ref` union. An empty/unknown `to` degrades to the
 * bare Reference component rather than dropping the field.
 */
function referenceSchema(field: Field, schemaMap: Map<string, SchemaType>): JsonSchema {
	const to = 'to' in field ? (field.to as Array<{ type: string }> | undefined) : undefined;
	const targets = to?.map((t) => t.type).filter((t) => schemaMap.has(t)) ?? [];
	if (targets.length === 0) return { $ref: '#/components/schemas/Reference' };
	return {
		allOf: [{ $ref: '#/components/schemas/Reference' }],
		description: `References: ${targets.join(', ')}`
	};
}

/**
 * The depth=0 *write* shape of one field as JSON Schema.
 *
 * Write shape, not read shape: references stay `{_ref}` rather than the resolved
 * document, because that is what a caller sends and what the validator checks.
 */
export function fieldToJsonSchema(
	field: Field,
	schemaMap: Map<string, SchemaType>,
	seen: Set<string> = new Set()
): JsonSchema {
	switch (field.type) {
		case 'string':
		case 'text':
		case 'slug':
		case 'url': {
			const base: JsonSchema = { type: 'string' };
			// `slug` is a bare string in Aphex — never Sanity's `{ current }`.
			if (field.type === 'slug') base.description = 'Slug as a plain string, e.g. "about-us".';
			if (field.type === 'url') base.format = 'uri';
			const list = 'list' in field ? field.list : undefined;
			if (Array.isArray(list) && list.length > 0) {
				base.enum = list.map((o) =>
					typeof o === 'object' && o !== null && 'value' in o ? o.value : o
				);
			}
			return withMeta(field, base);
		}
		case 'number':
			return withMeta(field, { type: 'number' });
		case 'boolean':
			return withMeta(field, { type: 'boolean' });
		case 'date':
			return withMeta(field, { type: 'string', format: 'date', examples: ['2026-09-13'] });
		case 'datetime':
			return withMeta(field, {
				type: 'string',
				format: 'date-time',
				examples: ['2026-09-13T15:00:00.000Z']
			});
		case 'image':
			return withMeta(field, { $ref: '#/components/schemas/ImageValue' });
		case 'file':
			return withMeta(field, { $ref: '#/components/schemas/FileValue' });
		case 'reference':
			return withMeta(field, referenceSchema(field, schemaMap));
		case 'array': {
			const of = 'of' in field ? field.of : undefined;
			if (!of || of.length === 0) return withMeta(field, { type: 'array', items: {} });
			// A `block` member anywhere in `of` makes this Portable Text.
			if (of.some((item) => item.type === 'block')) {
				return withMeta(field, {
					type: 'array',
					items: { $ref: '#/components/schemas/PortableTextBlock' }
				});
			}
			const variants = of.map((item) => {
				// A named object type becomes a `$ref` into components — which is also
				// what makes a self-containing schema (an object whose array names its
				// own type) terminate: the component is emitted once, not inlined.
				const named = schemaMap.get(item.type);
				if (named && named.type === 'object') {
					return { $ref: `#/components/schemas/${componentName(named.name)}` };
				}
				return fieldToJsonSchema(item as Field, schemaMap, seen);
			});
			return withMeta(field, {
				type: 'array',
				items: variants.length === 1 ? variants[0]! : { oneOf: variants }
			});
		}
		case 'object': {
			const fields = 'fields' in field ? field.fields : undefined;
			if (!fields || fields.length === 0) {
				return withMeta(field, { type: 'object', additionalProperties: true });
			}
			return withMeta(field, fieldsToJsonSchema(fields, schemaMap, seen));
		}
		default:
			return withMeta(field, {});
	}
}

/** Turn a list of fields into an object schema with a `required` array. */
export function fieldsToJsonSchema(
	fields: Field[],
	schemaMap: Map<string, SchemaType>,
	seen: Set<string> = new Set()
): JsonSchema {
	const properties: Record<string, JsonSchema> = {};
	const required: string[] = [];
	for (const field of fields) {
		properties[field.name] = fieldToJsonSchema(field, schemaMap, seen);
		if (isFieldRequired(field)) required.push(field.name);
	}
	const out: JsonSchema = {
		type: 'object',
		properties,
		// A write may legitimately carry a subset of fields, but it may not carry
		// fields the schema doesn't declare — the validator rejects those as
		// `kind: "structural"`, so the spec says so too.
		additionalProperties: false
	};
	if (required.length > 0) out.required = required;
	return out;
}

/** PascalCase component name for a schema type, e.g. `post` → `PostData`. */
export function componentName(schemaName: string): string {
	return schemaName
		.replace(/[-_](\w)/g, (_, c: string) => c.toUpperCase())
		.replace(/^(\w)/, (_, c: string) => c.toUpperCase());
}

/**
 * Every schema type in the instance as components: `<Type>Data` for documents
 * (the `draftData`/`data` payload) and the object types they reference.
 */
export function buildSchemaComponents(schemaTypes: SchemaType[]): Record<string, JsonSchema> {
	const schemaMap = new Map(schemaTypes.map((s) => [s.name, s]));
	const components: Record<string, JsonSchema> = {};
	for (const schema of schemaTypes) {
		const name = componentName(schema.name);
		const body = fieldsToJsonSchema(schema.fields ?? [], schemaMap, new Set([schema.name]));
		components[schema.type === 'document' ? `${name}Data` : name] = {
			...body,
			description:
				schema.description ??
				(schema.type === 'document'
					? `Write shape for \`${schema.name}\` documents.`
					: `Reusable object type \`${schema.name}\`.`)
		};
	}
	return components;
}
