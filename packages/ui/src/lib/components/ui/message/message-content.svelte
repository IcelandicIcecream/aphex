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
	data-slot="message-content"
	class={cn('cn-message-content flex w-full min-w-0 flex-col wrap-break-word', className)}
	{...restProps}
>
	{@render children?.()}
</div>
