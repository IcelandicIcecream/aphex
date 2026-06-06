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

export function getLivePreviewDocument(): LivePreviewContext {
	return getContext<LivePreviewContext>(KEY) ?? new LivePreviewContext();
}
