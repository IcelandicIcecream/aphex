import type { Snippet } from 'svelte';

export type SettingsHeaderActionContext = {
	setActions: (actions: Snippet | null) => void;
};

export const settingsHeaderActionContextKey = Symbol('settings-header-actions');
