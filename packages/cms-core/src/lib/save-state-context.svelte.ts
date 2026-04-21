import { getContext, setContext } from 'svelte';

const SAVE_STATE_KEY = Symbol('aphex-save-state');

export interface SaveState {
	readonly saving: boolean;
	readonly hasUnsavedChanges: boolean;
	readonly savedAgoText: string | null;
}

export function setSaveStateContext(state: SaveState) {
	setContext(SAVE_STATE_KEY, state);
}

export function getSaveStateContext(): SaveState | null {
	return getContext<SaveState>(SAVE_STATE_KEY) ?? null;
}
