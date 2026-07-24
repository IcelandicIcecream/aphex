<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setMessageScroller, type ScrollPosition } from './message-scroller-context.svelte.js';

	type Props = {
		autoScroll?: boolean;
		defaultScrollPosition?: ScrollPosition;
		preserveScrollOnPrepend?: boolean;
		scrollPreviousItemPeek?: number;
		children?: Snippet;
	};

	let {
		autoScroll = false,
		defaultScrollPosition = 'last-anchor',
		preserveScrollOnPrepend = true,
		scrollPreviousItemPeek = 64,
		children
	}: Props = $props();

	const state = setMessageScroller({
		autoScroll: false,
		defaultScrollPosition: 'last-anchor',
		preserveScrollOnPrepend: true,
		scrollPreviousItemPeek: 64
	});

	$effect(() => {
		state.options = {
			autoScroll,
			defaultScrollPosition,
			preserveScrollOnPrepend,
			scrollPreviousItemPeek
		};
	});

	$effect(() => () => state.destroy());
</script>

{@render children?.()}
