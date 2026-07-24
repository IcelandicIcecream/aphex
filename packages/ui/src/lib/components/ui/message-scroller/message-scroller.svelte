<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '@lib/utils.js';
	import { useMessageScroller } from './message-scroller-context.svelte.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
	const state = useMessageScroller();
</script>

<div
	bind:this={ref}
	data-slot="message-scroller"
	data-autoscrolling={state.autoscrolling ? '' : undefined}
	data-scrollable={state.canScrollStart || state.canScrollEnd ? '' : undefined}
	class={cn(
		'cn-message-scroller group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
