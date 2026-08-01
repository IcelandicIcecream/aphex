<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '@lib/utils.js';
	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		side?: 'top' | 'bottom';
		align?: 'start' | 'end';
	};
	let {
		ref = $bindable(null),
		class: className,
		side = 'bottom',
		align = 'end',
		children,
		...restProps
	}: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="bubble-reactions"
	data-align={align}
	data-side={side}
	class={cn(
		'cn-bubble-reactions absolute z-10 flex w-fit items-center justify-center',
		side === 'top' ? 'cn-bubble-reactions-side-top' : 'cn-bubble-reactions-side-bottom',
		align === 'start' ? 'cn-bubble-reactions-align-start' : 'cn-bubble-reactions-align-end',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
