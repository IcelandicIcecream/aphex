<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '@lib/utils.js';
	import { getAttachmentContext } from './attachment-context.svelte.js';
	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLParagraphElement>> = $props();
	const context = getAttachmentContext();
</script>

<p
	bind:this={ref}
	data-slot="attachment-title"
	class={cn(
		'cn-attachment-title truncate',
		(context.state === 'uploading' || context.state === 'processing') && 'shimmer',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</p>
