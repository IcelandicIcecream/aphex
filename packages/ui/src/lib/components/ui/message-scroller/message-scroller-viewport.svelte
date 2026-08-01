<script lang="ts">
	import { onMount } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '@lib/utils.js';
	import { useMessageScroller } from './message-scroller-context.svelte.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		'aria-label': ariaLabel = 'Messages',
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>, HTMLDivElement> = $props();
	const state = useMessageScroller();

	onMount(() => {
		state.setViewport(ref);
		return () => state.setViewport(null);
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	bind:this={ref}
	data-slot="message-scroller-viewport"
	data-autoscrolling={state.autoscrolling ? '' : undefined}
	class={cn(
		'cn-message-scroller-viewport scroll-fade-b size-full min-h-0 min-w-0 scrollbar-thin scrollbar-gutter-stable overflow-y-auto overscroll-contain contain-content data-autoscrolling:scrollbar-thumb-transparent data-autoscrolling:scrollbar-track-transparent',
		className
	)}
	role="region"
	aria-label={ariaLabel}
	tabindex="0"
	onscroll={(event) => state.handleScroll(event.isTrusted)}
	onwheel={() => state.releaseFollow()}
	ontouchstart={() => state.releaseFollow()}
	onpointerdown={() => state.releaseFollow()}
	onkeydown={(event) => {
		if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
			state.releaseFollow();
		}
	}}
	{...restProps}
>
	{@render children?.()}
</div>
