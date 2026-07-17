<script lang="ts">
	import type { Snippet } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { setLivePreviewContext } from './live-preview.svelte.js';
	import { enableAphexPreview } from './core.js';

	interface Props {
		/**
		 * Whether to use stega encoding for auto-detecting fields.
		 * Must match the setting in DocumentEditor / aphex.config.ts. Default: true.
		 */
		stega?: boolean;
		children?: Snippet;
	}

	let { stega = true, children }: Props = $props();

	const preview = setLivePreviewContext();

	$effect(() => {
		if (typeof window === 'undefined') return;
		if (!new URLSearchParams(window.location.search).has('aphex-preview')) return;

		return enableAphexPreview({
			stega,
			onData: (doc, meta) => {
				preview.current = doc;
				preview.currentType = meta?.documentType ?? null;
				preview.currentId = meta?.documentId ?? null;
			},
			// Re-run load functions (no full reload) when the editor signals a change to a
			// document this page loaded server-side — e.g. after editing a referenced doc.
			onRefresh: () => void invalidateAll()
		});
	});
</script>

{@render children?.()}
