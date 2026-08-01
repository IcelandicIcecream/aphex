<script lang="ts">
	import { ArrowDown } from '@lucide/svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '@lib/utils.js';
	import { buttonVariants, type ButtonSize, type ButtonVariant } from '../button/index.js';
	import { useMessageScroller } from './message-scroller-context.svelte.js';

	type Props = WithElementRef<HTMLButtonAttributes> & {
		direction?: 'start' | 'end';
		variant?: ButtonVariant;
		size?: ButtonSize;
	};
	let {
		ref = $bindable(null),
		class: className,
		direction = 'end',
		variant = 'secondary',
		size = 'icon-sm',
		children,
		...restProps
	}: Props = $props();
	const state = useMessageScroller();
	let active = $derived(direction === 'end' ? state.canScrollEnd : state.canScrollStart);
</script>

<button
	bind:this={ref}
	type="button"
	data-slot="message-scroller-button"
	data-active={active}
	data-direction={direction}
	data-variant={variant}
	data-size={size}
	class={cn(
		buttonVariants({ variant, size }),
		'cn-message-scroller-button border-border bg-background text-foreground hover:bg-muted hover:text-foreground absolute inset-s-1/2 -translate-x-1/2 transition-[translate,scale,opacity] duration-200 data-[active=false]:pointer-events-none data-[active=false]:scale-95 data-[active=false]:opacity-0 data-[active=false]:duration-400 data-[active=false]:ease-[cubic-bezier(0.7,0,0.84,0)] data-[active=true]:translate-y-0 data-[active=true]:scale-100 data-[active=true]:opacity-100 data-[active=true]:ease-[cubic-bezier(0.23,1,0.32,1)] data-[direction=end]:bottom-4 data-[direction=end]:data-[active=false]:translate-y-full data-[direction=start]:top-4 data-[direction=start]:data-[active=false]:-translate-y-full rtl:translate-x-1/2 data-[direction=start]:[&_svg]:rotate-180',
		className
	)}
	disabled={!active}
	tabindex={active ? 0 : -1}
	onclick={() => (direction === 'end' ? state.scrollToEnd() : state.scrollToStart())}
	aria-label={direction === 'end' ? 'Jump to latest message' : 'Jump to first message'}
	{...restProps}
>
	{#if children}
		{@render children()}
	{:else}
		<ArrowDown class="size-4" />
		<span class="sr-only">{direction === 'end' ? 'Scroll to end' : 'Scroll to start'}</span>
	{/if}
</button>
