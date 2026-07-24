<script lang="ts">
	import { onMount } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '@lib/utils.js';
	import { useMessageScroller } from './message-scroller-context.svelte.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>, HTMLDivElement> = $props();
	const state = useMessageScroller();

	onMount(() => {
		state.setContent(ref);
		const observer = new ResizeObserver(() => state.scheduleLayout());
		if (ref) observer.observe(ref);
		return () => {
			observer.disconnect();
			state.setContent(null);
		};
	});
</script>

<div
	bind:this={ref}
	data-slot="message-scroller-content"
	class={cn('cn-message-scroller-content flex h-max min-h-full flex-col', className)}
	role="log"
	aria-relevant="additions"
	{...restProps}
>
	{@render children?.()}
</div>
