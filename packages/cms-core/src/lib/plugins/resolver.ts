/**
 * Part resolver — indexes a plugin list by extension point and answers the
 * queries core needs (schemas to merge, routes to mount, document actions for a
 * given type, a field component for an `input` key). Built once at boot from
 * `config.plugins` and exposed on the engine so both server and admin consult the
 * same resolved model. Validates duplicate part ids up front — no silent overrides.
 */
import type {
	AdminToolPart,
	CMSPlugin,
	DocumentActionPart,
	FieldComponentPart,
	PartKind,
	PluginPart,
	ServerRoutePart
} from './types';
import type { SchemaType } from '../types/schemas';

type PartOf<K extends PartKind> = Extract<PluginPart, { implements: K }>;

export interface PartResolver {
	readonly plugins: CMSPlugin[];
	/** All parts implementing a given extension point, typed to that part kind. */
	getParts<K extends PartKind>(kind: K): PartOf<K>[];
	/** Flattened schema contributions, ready to merge into `schemaTypes`. */
	schemaTypes(): SchemaType[];
	/** Apply every `aphex/schema/transform` part, in order, to a schema list. */
	applySchemaTransforms(schemas: SchemaType[]): SchemaType[];
	/** Server-route parts to mount under `/api`. */
	serverRoutes(): ServerRoutePart[];
	/** Deduplicated custom capability strings declared by plugins. */
	capabilities(): string[];
	/** Document actions applicable to a document type, capability- and order-filtered. */
	documentActions(args: {
		schemaName: string;
		capabilities?: string[];
		overrideAccess?: boolean;
	}): DocumentActionPart[];
	/** Admin tools, capability- and order-filtered. */
	adminTools(args?: { capabilities?: string[]; overrideAccess?: boolean }): AdminToolPart[];
	/** The field component registered for a given `input` key, if any. */
	fieldComponent(input: string): FieldComponentPart | undefined;
}

export function createPartResolver(plugins: CMSPlugin[] = []): PartResolver {
	const allParts: PluginPart[] = plugins.flatMap((p) => p.parts ?? []);

	// Duplicate-id validation, per extension point. Parts without an id (schema,
	// capabilities, field-component) are exempt.
	const seen = new Map<string, Set<string>>();
	for (const part of allParts) {
		if ('id' in part && typeof part.id === 'string') {
			const bucket = seen.get(part.implements) ?? new Set<string>();
			if (bucket.has(part.id)) {
				throw new Error(
					`Duplicate plugin part id "${part.id}" for ${part.implements}. ` +
						`Part ids must be unique per extension point.`
				);
			}
			bucket.add(part.id);
			seen.set(part.implements, bucket);
		}
	}

	const getParts = <K extends PartKind>(kind: K): PartOf<K>[] =>
		allParts.filter((p): p is PartOf<K> => p.implements === kind);

	const hasCaps = (
		required: string[] | undefined,
		caps: string[],
		overrideAccess: boolean
	): boolean =>
		overrideAccess || !required || required.length === 0 || required.every((c) => caps.includes(c));

	return {
		plugins,
		getParts,
		schemaTypes: () => getParts('aphex/schema').flatMap((p) => p.schemas),
		applySchemaTransforms: (schemas) =>
			getParts('aphex/schema/transform').reduce((acc, part) => part.transform(acc), schemas),
		serverRoutes: () => getParts('aphex/server/route'),
		capabilities: () => {
			const set = new Set<string>();
			for (const p of getParts('aphex/capabilities')) for (const c of p.capabilities) set.add(c);
			return [...set];
		},
		documentActions: ({ schemaName, capabilities = [], overrideAccess = false }) =>
			getParts('aphex/document/action')
				.filter((a) => !a.appliesTo || a.appliesTo.includes(schemaName))
				.filter((a) => hasCaps(a.requiredCapabilities, capabilities, overrideAccess))
				.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
		adminTools: ({ capabilities = [], overrideAccess = false } = {}) =>
			getParts('aphex/admin/tool')
				.filter((t) => hasCaps(t.requiredCapabilities, capabilities, overrideAccess))
				.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
		fieldComponent: (input) => getParts('aphex/field/component').find((f) => f.input === input)
	};
}
