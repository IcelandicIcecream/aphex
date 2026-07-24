<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '@lib/utils.js';
	import type { MessageAlign } from './message-context.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & { align?: MessageAlign };
	let {
		ref = $bindable(null),
		class: className,
		align = 'start',
		children,
		...restProps
	}: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="message"
	data-align={align}
	class={cn(
		'cn-message group/message relative flex w-full min-w-0 data-[align=end]:flex-row-reverse',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
