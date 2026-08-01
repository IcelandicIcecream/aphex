<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';
	export const bubbleVariants = tv({
		base: 'cn-bubble group/bubble relative flex w-fit min-w-0 flex-col',
		variants: {
			variant: {
				default: 'cn-bubble-variant-default',
				secondary: 'cn-bubble-variant-secondary',
				muted: 'cn-bubble-variant-muted',
				tinted: 'cn-bubble-variant-tinted',
				outline: 'cn-bubble-variant-outline',
				ghost: 'cn-bubble-variant-ghost',
				destructive: 'cn-bubble-variant-destructive'
			}
		},
		defaultVariants: { variant: 'default' }
	});
	export type BubbleVariant = VariantProps<typeof bubbleVariants>['variant'];
	export type BubbleAlign = 'start' | 'end';
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '@lib/utils.js';
	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: BubbleVariant;
		align?: BubbleAlign;
	};
	let {
		ref = $bindable(null),
		class: className,
		variant = 'default',
		align = 'start',
		children,
		...restProps
	}: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="bubble"
	data-variant={variant}
	data-align={align}
	class={cn(bubbleVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
