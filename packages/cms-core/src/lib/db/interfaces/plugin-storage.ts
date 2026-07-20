// Plugin storage port — a generic, org-scoped record store for plugins, the DATA-plane sibling
// of the CONFIG-plane `cms_plugin_settings`. It is NOT the content/document model: records never
// enter document lists, versioning, drafts, the content REST/GraphQL API, or MCP tools. Any plugin
// namespaces its rows by `(plugin, collection)` — e.g. the forms plugin stores a submission as
// `(plugin: 'forms', collection: <formId>)`. Relational adapters implement this.
//
// `createPluginRecord` is callable on the tx handle from `withTransaction`, so a record and the
// domain event that announces it commit atomically — a stored record always has its event, and
// vice versa (e.g. a submission + its `form.submitted` event).
import type { Page } from '../../types/events';

/** A stored plugin record — arbitrary JSON data under a `(plugin, collection)` namespace. */
export interface PluginStorageRecord {
	id: string;
	organizationId: string;
	/** Owning plugin namespace, e.g. `'forms'`. Package-namespace it to avoid collisions. */
	plugin: string;
	/** Sub-namespace within the plugin, e.g. a form's id `'contact'`. */
	collection: string;
	/** Arbitrary JSON payload the plugin defines. */
	data: Record<string, unknown>;
	createdAt: Date;
}

/** Input to persist a record. `id` may be supplied so it can match a related event's id. */
export interface CreatePluginRecordInput {
	id?: string;
	organizationId: string;
	plugin: string;
	collection: string;
	data: Record<string, unknown>;
}

/** Query for a plugin's records (newest first). */
export interface ListPluginRecordsOptions {
	organizationId: string;
	plugin: string;
	/** Filter to one collection within the plugin. */
	collection?: string;
	limit?: number;
	offset?: number;
}

export interface PluginStorageAdapter {
	/** Persist a record. Call on the tx handle to commit it atomically with `appendEvent`. */
	createPluginRecord(input: CreatePluginRecordInput): Promise<PluginStorageRecord>;
	/** Read one record by id (org-scoped) — e.g. a consumer resolving an event's record id. */
	getPluginRecord(organizationId: string, id: string): Promise<PluginStorageRecord | null>;
	/** List a plugin's records (optionally one collection), newest first. */
	listPluginRecords(options: ListPluginRecordsOptions): Promise<Page<PluginStorageRecord>>;
}
