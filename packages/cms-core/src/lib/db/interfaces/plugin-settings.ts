// Plugin-settings adapter interface — the generic per-(org, plugin) config store.
//
// This is the storage primitive behind the plugin settings & secrets feature
// (references/plugin-settings-and-secrets-scope.md). It is deliberately generic:
// ONE table serves every plugin, keyed by (organizationId, pluginId), one row per
// pair (a config singleton). Values are an opaque JSON object — the store neither
// knows nor cares which values are content vs config vs encrypted secrets. Core
// handles encryption/decryption of secret fields above this layer; the adapter only
// persists the resulting strings.
//
// NOT part of the content model: no drafts, versions, references, or RLS-as-content.
// Org isolation is by the `organizationId` key (and RLS on the pglite path).

/** A stored settings row: the raw persisted values for one (org, plugin) pair. */
export interface PluginSettingsRow {
	organizationId: string;
	pluginId: string;
	/** Opaque JSON blob of the plugin's settings values (secrets stored encrypted). */
	values: Record<string, unknown>;
	updatedAt: Date;
}

export interface PluginSettingsAdapter {
	/**
	 * Read the stored values for a plugin in an org. Returns `null` when the plugin
	 * has never been configured for that org (no row yet) — callers treat that as
	 * "use declared defaults".
	 */
	getPluginSettings(
		organizationId: string,
		pluginId: string
	): Promise<Record<string, unknown> | null>;

	/**
	 * Upsert the full values object for a plugin in an org (one row per pair). The
	 * passed object replaces the stored one — callers merge partial edits before
	 * calling. Secret values must already be encrypted by core.
	 */
	setPluginSettings(
		organizationId: string,
		pluginId: string,
		values: Record<string, unknown>
	): Promise<void>;
}
