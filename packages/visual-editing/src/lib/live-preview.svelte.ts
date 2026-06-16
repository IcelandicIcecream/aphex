import { getContext, setContext } from 'svelte';

const KEY = Symbol('aphex:live-preview');

export class LivePreviewContext {
	current = $state<Record<string, unknown> | null>(null);
}

export function setLivePreviewContext(): LivePreviewContext {
	const ctx = new LivePreviewContext();
	setContext(KEY, ctx);
	return ctx;
}

/**
 * Returns the live preview document context set by <AphexVisualOverlay>.
 * `preview.current` is null until the CMS pushes data via postMessage.
 * Use as: `const post = $derived(preview.current ?? data.post)`
 */
export function getLivePreviewDocument(): LivePreviewContext {
	return getContext<LivePreviewContext>(KEY) ?? new LivePreviewContext();
}
