<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '@lib/utils.js';
	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props();
</script>

<span
	bind:this={ref}
	data-slot="marker-content"
	class={cn('cn-marker-content min-w-0 wrap-break-word', className)}
	{...restProps}>{@render children?.()}</span
>
