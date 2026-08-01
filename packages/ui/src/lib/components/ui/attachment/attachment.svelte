<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '@lib/utils.js';
	import {
		setAttachmentContext,
		type AttachmentOrientation,
		type AttachmentSize,
		type AttachmentState
	} from './attachment-context.svelte.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		state?: AttachmentState;
		size?: AttachmentSize;
		orientation?: AttachmentOrientation;
	};
	let {
		ref = $bindable(null),
		class: className,
		state = 'done',
		size = 'default',
		orientation = 'horizontal',
		children,
		...restProps
	}: Props = $props();
	const context = setAttachmentContext();
	$effect(() => {
		context.state = state;
		context.size = size;
		context.orientation = orientation;
	});
</script>

<div
	bind:this={ref}
	data-slot="attachment"
	data-state={state}
	data-size={size}
	data-orientation={orientation}
	class={cn(
		'cn-attachment group/attachment bg-card text-card-foreground relative flex min-w-0 overflow-hidden border',
		orientation === 'horizontal'
			? 'cn-attachment-orientation-horizontal'
			: 'cn-attachment-orientation-vertical',
		size === 'default'
			? 'cn-attachment-size-default'
			: size === 'sm'
				? 'cn-attachment-size-sm'
				: 'cn-attachment-size-xs',
		orientation === 'horizontal' ? 'items-center' : 'flex-col items-stretch',
		state === 'error' && 'border-destructive/50 text-destructive',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
