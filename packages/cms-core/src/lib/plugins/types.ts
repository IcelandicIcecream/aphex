/**
 * Plugin type system — the public authoring surface.
 *
 * A plugin is a manifest of typed "parts", each implementing a named extension
 * point. The kinds are split into two planes (see PLUGIN_SYSTEM_PLAN.md §Constraint):
 *
 *  - SERVER / serializable plane — schemas, server routes, capabilities. Collected
 *    by the engine at boot; safe to reason about without loading any component.
 *  - COMPONENT plane — document actions, admin tools, field components. These carry
 *    Svelte components and are only ever imported into admin module code, never
 *    passed through SvelteKit `load` (load data must stay serializable).
 *
 * All imports here are type-only, so this module is safe on both planes.
 */
import type { Component } from 'svelte';
import type { Context, Hono } from 'hono';
import type { AphexEnv } from '../server/api/index';
import type { Field, SchemaType } from '../types/schemas';
import type { AdminArea } from '../admin/types';

/** Known extension points. Plugins may also register custom string kinds. */
export type PartKind =
	| 'aphex/schema'
	| 'aphex/schema/transform'
	| 'aphex/server/route'
	| 'aphex/capabilities'
	| 'aphex/document/action'
	| 'aphex/admin/tool'
	| 'aphex/field/component';

// ── Serializable plane ──────────────────────────────────────────────────────

/** Contributes content schemas, merged into the app's `schemaTypes`. */
export interface SchemaPart {
	implements: 'aphex/schema';
	schemas: SchemaType[];
}

/**
 * Transforms the resolved schema list — decorate existing types, not just add new
 * ones (e.g. inject an SEO field group into a set of collections). Runs after all
 * `aphex/schema` parts merge, on both the server engine and the admin, so the
 * transform must be pure and deterministic. This is what lets a plugin "enable"
 * itself on chosen document types the way Payload's `collections: [...]` does.
 */
export interface SchemaTransformPart {
	implements: 'aphex/schema/transform';
	transform: (schemas: SchemaType[]) => SchemaType[];
}

/**
 * Contributes an HTTP endpoint under `/api`. `path: '/bookings'` + `method: 'POST'`
 * becomes `POST /api/bookings`. The handler gets the same Hono context as built-ins
 * (`c.var.aphexCMS`, `c.var.auth`).
 */
export interface ServerRoutePart {
	implements: 'aphex/server/route';
	/** Unique across all plugins — collisions are a startup error. */
	id: string;
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	path: string;
	handler: (c: Context<AphexEnv>) => Response | Promise<Response>;
}

/** Declares custom capability strings this plugin introduces (for the roles UI). */
export interface CapabilitiesPart {
	implements: 'aphex/capabilities';
	capabilities: string[];
}

// ── Component plane (client only) ───────────────────────────────────────────

/**
 * A minimal, stable context handed to a document-action component. Deliberately
 * decoupled from editor internals — actions get exactly this and nothing more, so
 * the editor can be refactored without breaking plugins.
 */
export interface DocumentActionProps {
	/** Null while the document is new and unsaved. */
	documentId: string | null;
	schema: SchemaType;
	/** The live edited draft data. */
	data: Record<string, unknown>;
	status: 'new' | 'draft' | 'published' | 'unpublished';
	/** Shallow-merge a patch into the document's data. */
	updateData: (patch: Record<string, unknown>) => void;
	save: () => Promise<void>;
	publish: () => Promise<void>;
}

/** Adds a button/action to the document editor toolbar. */
export interface DocumentActionPart {
	implements: 'aphex/document/action';
	/** Unique across all plugins. */
	id: string;
	title: string;
	icon?: Component;
	component: Component<{ action: DocumentActionProps }>;
	/** Document type names this applies to. Omit for all types. */
	appliesTo?: string[];
	requiredCapabilities?: string[];
	order?: number;
}

/**
 * The stable context handed to an admin-tool component — enough to read the
 * environment, gate on capabilities, and navigate, without touching AdminApp
 * internals. For document data, tools use the REST client (session-authenticated).
 */
export interface AdminToolProps {
	organizationId: string | null;
	capabilities: readonly string[];
	role: string | null;
	/** True if the session has the capability (privileged roles bypass). */
	can: (capability: string) => boolean;
	/** All content schemas (read-only), for listing document types etc. */
	schemas: SchemaType[];
	/** Switch the active admin area/tab (e.g. back to `'structure'`). */
	navigate: (area: AdminArea) => void;
	/** Open a document in the editor. */
	openDocument: (documentType: string, documentId: string) => void;
}

/** Adds a top-level admin section (its own tool/tab). */
export interface AdminToolPart {
	implements: 'aphex/admin/tool';
	/** Unique across all plugins; also the tool's route key. */
	id: string;
	title: string;
	icon?: Component;
	component: Component<{ tool: AdminToolProps }>;
	requiredCapabilities?: string[];
	order?: number;
}

/**
 * The stable props a field-input widget receives — the same shape the built-in
 * field renderers use, so a plugin widget is a drop-in replacement.
 */
export interface FieldComponentProps {
	field: Field;
	value: unknown;
	onUpdate: (value: unknown) => void;
	readonly?: boolean;
	/** Validation-state CSS classes to spread onto the control (optional). */
	validationClasses?: string;
	/** The whole document's data — for widgets that read sibling fields (e.g. an SEO preview). */
	documentData?: Record<string, unknown>;
	/** The document's type name (e.g. `'author'`) — for widgets that vary by type. */
	schemaType?: string;
}

/**
 * Provides a custom input widget, selected by a field's `input` key in the schema
 * (e.g. `{ type: 'string', input: 'color-picker' }`).
 */
export interface FieldComponentPart {
	implements: 'aphex/field/component';
	/** Matched against a field's `input` property. */
	input: string;
	component: Component<FieldComponentProps>;
}

export type PluginPart =
	| SchemaPart
	| SchemaTransformPart
	| ServerRoutePart
	| CapabilitiesPart
	| DocumentActionPart
	| AdminToolPart
	| FieldComponentPart;

/** A plugin manifest. Returned by `definePlugin`. */
export interface CMSPlugin {
	/** Package-style name, e.g. `@acme/aphex-plugin-seo`. Used in error messages. */
	name: string;
	version?: string;
	parts?: PluginPart[];
}

/** Registration hook available to server-route parts (kept for the api-mount seam). */
export type RegisterRoutes = (app: Hono<AphexEnv>) => void;

/**
 * Identity helper that pins the `CMSPlugin` type for authoring. Kept a pure
 * pass-through so bundlers can tree-shake unused plugins; validation (duplicate
 * ids/names) happens in the part resolver at boot, where it can see all plugins.
 */
export function definePlugin(plugin: CMSPlugin): CMSPlugin {
	return plugin;
}
