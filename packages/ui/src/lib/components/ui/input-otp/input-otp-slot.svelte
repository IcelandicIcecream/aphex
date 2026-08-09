<script lang="ts">
	import { PinInput as InputOTPPrimitive } from 'bits-ui';
	import { cn } from '@lib/utils.js';

	// Deliberately diverges from upstream shadcn, which joins the slots into one
	// segmented control (`border-y border-r`, rounded only at the ends). Each slot
	// here is a standalone rounded box, so the group reads as "one character per
	// box" at a glance. If this component is ever re-added via `pnpm shadcn`, the
	// generated file will revert to the joined look.
	//
	// The size is `h-11 w-11`, not `size-11`: tailwind-merge only lets a later
	// `size-*` override an earlier `w-*`/`h-*`, never the reverse, so a caller
	// passing `h-12` would end up with both declarations and whichever the
	// stylesheet happened to order last. Spelling the axes out keeps overrides
	// per-axis and predictable.
	let {
		ref = $bindable(null),
		cell,
		class: className,
		...restProps
	}: InputOTPPrimitive.CellProps = $props();
</script>

<InputOTPPrimitive.Cell
	{cell}
	bind:ref
	data-slot="input-otp-slot"
	class={cn(
		// `h-11 w-11` rather than `size-11`: tailwind-merge only lets a later
		// `size-*` override an earlier `w-*`/`h-*`, never the reverse, so a caller
		// passing `h-12` would end up with both declarations and whichever the
		// stylesheet happened to order last. Spelling the axes out keeps overrides
		// per-axis and predictable.
		'border-input dark:bg-input/30 relative flex h-11 w-11 items-center justify-center rounded-lg border text-base font-medium transition-all outline-none',
		'data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:z-10 data-[active=true]:ring-[3px]',
		'aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40',
		className
	)}
	{...restProps}
>
	{cell.char}
	{#if cell.hasFakeCaret}
		<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
			<div class="animate-caret-blink bg-foreground h-5 w-px duration-1000"></div>
		</div>
	{/if}
</InputOTPPrimitive.Cell>
