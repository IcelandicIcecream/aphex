<script lang="ts">
	import type { Snippet } from 'svelte';
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
			}
		});
	});
</script>

{@render children?.()}
