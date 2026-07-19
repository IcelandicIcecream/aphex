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
import type { Field, SettingsField, SchemaType } from '../types/schemas';
import type { AdminArea } from '../admin/types';
import type { CapabilityDefinition } from '../types/capabilities';
import type { JobHandlerMap } from '../jobs/types';

/** Known extension points. Plugins may also register custom string kinds. */
export type PartKind =
	| 'aphex/schema'
	| 'aphex/schema/transform'
	| 'aphex/server/route'
	| 'aphex/capabilities'
	| 'aphex/settings'
	| 'aphex/job/handler'
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
	/**
	 * Who may call this route. Mandatory and with no default: a plugin route is an
	 * ordinary internet-facing endpoint, and "I forgot" must not be spellable as
	 * "anyone may call this". Say which of the three you mean:
	 *
	 * - `['forms.export']` — must be authenticated AND hold every listed capability.
	 *   The usual answer. The CMS gates the route before the handler runs (401 with no
	 *   session/api-key, 403 when capabilities are missing), so the check can't be
	 *   forgotten in the handler.
	 * - `[]` — must be authenticated, but any role will do. Use when membership of the
	 *   organization is itself the authorization.
	 * - `'public'` — no gate; anyone on the internet can call it. For webhook receivers
	 *   and the like, where the handler does its own verification (a signature, a shared
	 *   secret). Opting out is deliberate and greppable.
	 */
	requiredCapabilities: string[] | 'public';
}

/**
 * Declares custom capabilities this plugin introduces — surfaced (and assignable) in
 * the roles UI. Pass `defineCapability(id, { title, description, group })` for full
 * metadata, or a bare id string (labelled from its last segment). Merged with the
 * built-in catalog by the part resolver (`capabilityCatalog()`); a plugin can't
 * redefine a core capability.
 */
export interface CapabilitiesPart {
	implements: 'aphex/capabilities';
	capabilities: (string | CapabilityDefinition)[];
}

/**
 * Declares a plugin's **settings surface** — configuration a user edits in the
 * admin UI (connection details, toggles, and — in phase 2 — secrets), stored
 * per-`(organization, plugin)` and injected back into the plugin's server code.
 *
 * This is CONFIG, not content: settings are deliberately NOT content schema types.
 * They never enter document lists, draft/published perspectives, versioning, the
 * content REST/GraphQL API, MCP tools, or generated types. Only the field *renderer*
 * is reused (the same UI that draws a document field), never the type registry,
 * content storage, or content API. See references/plugin-settings-and-secrets-scope.md.
 *
 * Declaration only, like every other serializable part — the host owns rendering,
 * storage, encryption, gating, and injection. A plugin only says what its settings
 * look like.
 */
export interface SettingsPart {
	implements: 'aphex/settings';
	/**
	 * Which plugin these settings belong to — the storage key alongside the org.
	 * Use the plugin's package name (e.g. `@aphexcms/forms`) so it's stable and unique.
	 */
	pluginId: string;
	/** Human label for the settings section in the admin UI. */
	title: string;
	/** Optional one-line description shown under the title. */
	description?: string;
	/**
	 * The settings fields. `SettingsField` is a deliberately narrow subset — `string`,
	 * `text`, `number`, `boolean`, plus the settings-only `secret` (write-only,
	 * encrypted at rest) — so every declared field is one the panel really renders and
	 * the service really validates. No content-schema features (references, portable
	 * text, assets) and no custom `input` widgets. Values are type-checked against
	 * these declarations on save.
	 */
	fields: SettingsField[];
	/**
	 * Capabilities required to view/edit this settings section. Defaults to the
	 * built-in `plugin.settings.manage` when omitted — set a narrower capability to
	 * gate a specific plugin's settings more tightly.
	 */
	requiredCapabilities?: string[];
}

/**
 * Registers job handlers on the durable queue — the *execution* half of the spine
 * (a `aphex/server/route` webhook receiver, or any code, does the *enqueue* half via
 * `c.var.aphexCMS.databaseAdapter.scheduleJob`). A plugin that both enqueues and
 * handles a job type (e.g. a Shopify sync) is thus fully self-contained: no handler
 * wiring in the app's `aphex.config.ts`.
 *
 * The runner assembles its map as: core built-ins → plugin handlers → the app's
 * `config.jobs.handlers` — so the app always wins and can override a plugin's handler,
 * and a plugin can override a core built-in. Two plugins claiming the same job `type`
 * is last-wins by registration order; keep type strings package-namespaced
 * (`shopify.product.sync`) to avoid collisions.
 */
export interface JobHandlerPart {
	implements: 'aphex/job/handler';
	handlers: JobHandlerMap;
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

/** Adds a top-level admin section (its own tool). */
export interface AdminToolPart {
	implements: 'aphex/admin/tool';
	/** Unique across all plugins; also the tool's route key. */
	id: string;
	title: string;
	icon?: Component;
	component: Component<{ tool: AdminToolProps }>;
	requiredCapabilities?: string[];
	order?: number;
	/**
	 * Where the tool's trigger renders. `'tab'` (default) puts it in the top tab
	 * strip alongside Content/Media/Vision; `'sidebar'` puts it in the left sidebar
	 * nav instead — better once several plugins are installed and the tab strip
	 * would overflow. Either way the tool opens the same `plugin:<id>` area.
	 */
	placement?: 'tab' | 'sidebar';
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
 * (e.g. `{ type: 'string', input: 'color' }`).
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
	| SettingsPart
	| JobHandlerPart
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
