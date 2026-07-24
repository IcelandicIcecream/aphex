<script lang="ts">
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '@lib/utils.js';
	type Props = WithElementRef<HTMLButtonAttributes> & WithElementRef<HTMLAnchorAttributes>;
	let {
		ref = $bindable(null),
		class: className,
		href,
		children,
		type = 'button',
		...restProps
	}: Props = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="attachment-trigger"
		{href}
		class={cn('cn-attachment-trigger focus-visible:ring-ring focus-visible:ring-2', className)}
		{...restProps}>{@render children?.()}</a
	>
{:else}
	<button
		bind:this={ref}
		data-slot="attachment-trigger"
		{type}
		class={cn(
			'cn-attachment-trigger focus-visible:ring-ring cursor-pointer focus-visible:ring-2',
			className
		)}
		{...restProps}>{@render children?.()}</button
	>
{/if}
