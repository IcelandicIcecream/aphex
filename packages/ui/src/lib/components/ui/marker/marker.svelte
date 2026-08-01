<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';
	export const markerVariants = tv({
		base: 'cn-marker group/marker relative flex w-full items-center',
		variants: {
			variant: {
				default: 'cn-marker-variant-default',
				border: 'cn-marker-variant-border',
				separator: 'cn-marker-variant-separator'
			}
		},
		defaultVariants: { variant: 'default' }
	});
	export type MarkerVariant = VariantProps<typeof markerVariants>['variant'];
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '@lib/utils.js';
	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & { variant?: MarkerVariant };
	let {
		ref = $bindable(null),
		class: className,
		variant = 'default',
		children,
		...restProps
	}: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="marker"
	data-variant={variant}
	class={cn(markerVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
