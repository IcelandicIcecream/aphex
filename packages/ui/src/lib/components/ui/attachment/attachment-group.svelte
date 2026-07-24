<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '@lib/utils.js';
	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="attachment-group"
	class={cn(
		'cn-attachment-group scroll-fade flex snap-x overflow-x-auto [&>[data-slot=attachment]]:snap-start',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
