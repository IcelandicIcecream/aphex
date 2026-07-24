/**
 * Part resolver — indexes a plugin list by extension point and answers the
 * queries core needs (schemas to merge, routes to mount, document actions for a
 * given type, a field component for an `input` key). Built once at boot from
 * `config.plugins` and exposed on the engine so both server and admin consult the
 * same resolved model. Validates duplicate part ids up front — no silent overrides.
 */
import type {
	AdminToolPart,
	AgentToolPart,
	CMSPlugin,
	DocumentActionPart,
	EventConsumerPart,
	FieldComponentPart,
	PartKind,
	PluginPart,
	ServerRoutePart,
	SettingsPart
} from './types';
import type { SchemaType } from '../types/schemas';
import type { JobHandlerMap } from '../jobs/types';
import {
	defineCapability,
	mergeCapabilityCatalog,
	type CapabilityDefinition
} from '../types/capabilities';

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
	/** Deduplicated capability id strings declared by plugins. */
	capabilities(): string[];
	/** The full capability catalog — built-in definitions plus plugin-declared ones,
	 *  deduped by id. This is the registry the roles UI renders. */
	capabilityCatalog(): CapabilityDefinition[];
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
	/** All plugin settings declarations, in registration order. */
	settingsDeclarations(): SettingsPart[];
	/** The settings declaration for a given plugin id, if any. */
	settingsDeclaration(pluginId: string): SettingsPart | undefined;
	/**
	 * All plugin-contributed job handlers, merged into one map (later parts win on a
	 * type collision). The runner layers this between core built-ins and the app's
	 * `config.jobs.handlers`.
	 */
	jobHandlers(): JobHandlerMap;
	/** All registered event consumers, in registration order. The runner turns these into delivery job handlers. */
	eventConsumers(): EventConsumerPart[];
	/** Event consumers subscribed to a given event type — the relay's fan-out list. */
	consumersForEvent(eventType: string): EventConsumerPart[];
	/**
	 * Tools visible to a caller with the given capability set — the advertisement
	 * filter. Execution must separately re-check `requiredCapabilities` against the
	 * actual invoking caller; never trust that a tool was only reachable because it
	 * was listed.
	 */
	agentToolsForCapabilities(capabilities: string[], overrideAccess?: boolean): AgentToolPart[];
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

	// Settings parts key on `pluginId` (not `id`), so guard their uniqueness separately —
	// two declarations for one plugin would fight over the same storage row.
	const settingsIds = new Set<string>();
	for (const part of allParts) {
		if (part.implements !== 'aphex/settings') continue;
		if (settingsIds.has(part.pluginId)) {
			throw new Error(
				`Duplicate plugin settings declaration for "${part.pluginId}". ` +
					`Each plugin may declare settings once.`
			);
		}
		settingsIds.add(part.pluginId);
	}

	// Agent tool parts key on `definition.name` (not a top-level `id`), so guard
	// their uniqueness separately too — two tools sharing a name would collide in
	// whatever registry the agent runtime builds from this list.
	const agentToolNames = new Set<string>();
	for (const part of allParts) {
		if (part.implements !== 'aphex/agent/tool') continue;
		if (agentToolNames.has(part.definition.name)) {
			throw new Error(
				`Duplicate agent tool name "${part.definition.name}". Tool names must be unique across all plugins.`
			);
		}
		agentToolNames.add(part.definition.name);
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
			for (const p of getParts('aphex/capabilities'))
				for (const c of p.capabilities) set.add(typeof c === 'string' ? c : c.id);
			return [...set];
		},
		capabilityCatalog: () => {
			// Normalize each plugin-declared capability (bare id or full definition),
			// then merge with the built-in catalog — first definition of an id wins.
			const pluginDefs: CapabilityDefinition[] = [];
			for (const p of getParts('aphex/capabilities'))
				for (const c of p.capabilities)
					pluginDefs.push(typeof c === 'string' ? defineCapability(c) : c);
			return mergeCapabilityCatalog(pluginDefs);
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
		fieldComponent: (input) => getParts('aphex/field/component').find((f) => f.input === input),
		settingsDeclarations: () => getParts('aphex/settings'),
		settingsDeclaration: (pluginId) =>
			getParts('aphex/settings').find((s) => s.pluginId === pluginId),
		jobHandlers: () =>
			getParts('aphex/job/handler').reduce<JobHandlerMap>(
				(acc, part) => ({ ...acc, ...part.handlers }),
				{}
			),
		eventConsumers: () => getParts('aphex/event/consumer'),
		consumersForEvent: (eventType) =>
			getParts('aphex/event/consumer').filter((c) => c.events.includes(eventType)),
		agentToolsForCapabilities: (capabilities, overrideAccess = false) =>
			getParts('aphex/agent/tool').filter((t) =>
				hasCaps(t.definition.requiredCapabilities, capabilities, overrideAccess)
			)
	};
}
