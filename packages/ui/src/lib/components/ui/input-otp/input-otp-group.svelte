<script lang="ts">
	import { cn, type WithElementRef } from '@lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="input-otp-group"
	class={cn(
		'has-aria-invalid:border-destructive has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40 flex items-center gap-2 rounded-lg has-aria-invalid:ring-[3px]',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
