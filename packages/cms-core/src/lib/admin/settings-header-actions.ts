import type { Snippet } from 'svelte';

/**
 * Lets a settings panel push buttons into the shared settings header (e.g. a
 * "Create role" action) without the shell hard-coding per-panel knowledge. The
 * shell provides this context; a panel calls `setActions(snippet)` to fill the
 * header's action slot, and `setActions(null)` to clear it.
 */
export type SettingsHeaderActionContext = {
	setActions: (actions: Snippet | null) => void;
};

export const settingsHeaderActionContextKey = Symbol.for('aphex.settings.headerActions');
