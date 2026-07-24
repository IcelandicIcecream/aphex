<script lang="ts">
	import { onMount } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '@lib/utils.js';
	import { useMessageScroller } from './message-scroller-context.svelte.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		messageId?: string;
		scrollAnchor?: boolean;
	};

	let {
		ref = $bindable(null),
		class: className,
		children,
		messageId,
		scrollAnchor = false,
		...restProps
	}: Props = $props();
	const state = useMessageScroller();

	onMount(() => {
		if (!ref) return;
		const id = messageId ?? crypto.randomUUID();
		const unregister = state.registerItem(id, ref, scrollAnchor);
		const observer = new IntersectionObserver(
			([entry]) => state.setItemVisible(id, entry?.isIntersecting ?? false),
			{ root: state.viewport }
		);
		observer.observe(ref);
		return () => {
			observer.disconnect();
			unregister();
		};
	});
</script>

<div
	bind:this={ref}
	id={messageId}
	data-slot="message-scroller-item"
	data-message-id={messageId}
	data-scroll-anchor={scrollAnchor ? '' : undefined}
	class={cn(
		'cn-message-scroller-item min-w-0 shrink-0 [contain-intrinsic-size:auto_10rem] [content-visibility:auto]',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
