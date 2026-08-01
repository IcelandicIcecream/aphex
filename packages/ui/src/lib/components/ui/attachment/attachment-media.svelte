<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '@lib/utils.js';
	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & { variant?: 'icon' | 'image' };
	let {
		ref = $bindable(null),
		class: className,
		variant = 'icon',
		children,
		...restProps
	}: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="attachment-media"
	data-variant={variant}
	class={cn(
		'cn-attachment-media flex aspect-square shrink-0 items-center justify-center overflow-hidden [&_img]:size-full [&_img]:object-cover',
		variant === 'image' && 'cn-attachment-media-variant-image',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
