<script lang="ts">
	import type { FieldComponentProps } from '@aphexcms/cms-core';
	import * as Popover from '@aphexcms/ui/shadcn/popover';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { cn } from '@aphexcms/ui/utils';
	import { X } from '@lucide/svelte';
	import ColorPicker from './ColorPicker.svelte';
	import { parseColorToValue, colorValueToCss } from './color.js';

	/**
	 * A colour field as one compact row: a swatch that opens the picker, the value
	 * as text to type or paste, and a clear button. Compact so several sit side by
	 * side; the full picker only appears while it's being used.
	 *
	 * Registered as `aphex/field/component` for `input: 'color'`, so it receives the
	 * plugin field-component contract, not the editor's internals.
	 */
	let {
		field,
		value,
		onUpdate,
		validationClasses,
		readonly = false,
		inherited
	}: FieldComponentProps = $props();

	// Storage shape follows the field type: an `object` field stores the rich
	// { hex, alpha, rgb, hsl, hsv } ColorValue (Sanity-style); a `string` field
	// stores a plain hex/CSS string (drops straight into CSS). One widget, both.
	const isObject = $derived(field.type === 'object');

	// Per-widget config lives in the field's `inputOptions` bag (typed on BaseField,
	// so any custom input can carry config). `alpha` enables an 8-digit hex channel.
	const allowOpacity = $derived(field.inputOptions?.alpha === true);
	const hexOnly = $derived(!isObject && field.inputOptions?.hexOnly === true);
	type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch';
	const formats = $derived<ColorFormat[] | undefined>(
		// Object mode canonicalises via hex/rgb/hsl parsing (no oklch); string mode
		// honours `hexOnly`.
		isObject ? ['hex', 'rgb', 'hsl'] : hexOnly ? ['hex'] : undefined
	);
	// While empty, the colour it takes from elsewhere (`field.inherits`), as a CSS string.
	const inheritedCss = $derived(
		isObject ? colorValueToCss(inherited) : typeof inherited === 'string' ? inherited : ''
	);
	const placeholder = $derived(
		inheritedCss || ((field as { placeholder?: string }).placeholder ?? 'None')
	);

	// Local mirror the picker binds to (always a CSS string). External changes flow in;
	// picker changes flow out through onChange → onUpdate, converted to the field's
	// storage shape. No ping-pong: onChange sets `picked`, the sync effect then sees
	// them equal and does nothing.
	let picked = $state('');
	let open = $state(false);
	// The swatch shows the inherited colour, dashed, until one is picked.
	const shown = $derived(picked || inheritedCss);
	// What's typed, kept apart from `picked` so a half-typed value isn't saved.
	let typed = $state('');
	$effect(() => {
		const next = isObject ? colorValueToCss(value) : typeof value === 'string' ? value : '';
		if (next !== picked) picked = next;
		typed = next;
	});

	function emit(css: string) {
		picked = css;
		typed = css;
		if (isObject) {
			// Store the rich object; empty/unparseable clears the field.
			onUpdate(css ? parseColorToValue(css) : undefined);
		} else {
			onUpdate(css);
		}
	}

	const CHECKERBOARD =
		'background-image: linear-gradient(45deg, #d4d4d8 25%, transparent 25%, transparent 75%, #d4d4d8 75%), linear-gradient(45deg, #d4d4d8 25%, transparent 25%, transparent 75%, #d4d4d8 75%); background-size: 10px 10px; background-position: 0 0, 5px 5px;';

	const NONE =
		'background-image: linear-gradient(to top right, transparent calc(50% - 0.75px), #a1a1aa calc(50% - 0.75px), #a1a1aa calc(50% + 0.75px), transparent calc(50% + 0.75px));';

	const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

	/** Take what was typed when it's a colour; otherwise put the last good value back. */
	function commitTyped() {
		const text = typed.trim();
		if (text === '') return emit('');
		if (HEX.test(text)) return emit(`#${text.replace(/^#/, '').toLowerCase()}`);
		if (!hexOnly && parseColorToValue(text)) return emit(text);
		typed = picked;
	}
</script>

<div
	class="flex items-center gap-2"
	class:pointer-events-none={readonly}
	class:opacity-50={readonly}
	aria-disabled={readonly}
>
	<Popover.Root bind:open>
		<Popover.Trigger
			class={cn(
				'border-input focus-visible:ring-ring/50 relative size-9 shrink-0 overflow-hidden rounded-md border shadow-xs outline-none focus-visible:ring-[3px]',
				!picked && inheritedCss && 'border-muted-foreground/50 border-dashed',
				validationClasses
			)}
			aria-label="Pick {field.title ?? 'a colour'}"
			disabled={readonly}
		>
			<!-- Inline styles, not utility classes: an app's Tailwind may not scan this package.
			     The checkerboard is what shows through a translucent colour, so only a field
			     that allows opacity has one: under a solid colour it read as "transparent",
			     in the gap around an inherited swatch and on an empty one. -->
			{#if allowOpacity && picked}
				<span class="absolute inset-0" style={CHECKERBOARD}></span>
			{:else if !shown}
				<!-- No colour: a slash, the usual sign for "none". -->
				<span class="absolute inset-0" style={NONE}></span>
			{/if}
			<span
				class="absolute inset-0"
				style:background-color={shown || undefined}
				style:inset={!picked && inheritedCss ? '3px' : undefined}
				style:border-radius={!picked && inheritedCss ? '3px' : undefined}
			></span>
		</Popover.Trigger>
		<Popover.Content class="w-auto border-0 bg-transparent p-0 shadow-none" align="start">
			<ColorPicker value={shown || '#000000'} {allowOpacity} {formats} onChange={emit} />
		</Popover.Content>
	</Popover.Root>

	<Input
		class="min-w-0 flex-1 font-mono text-sm"
		value={typed}
		{placeholder}
		spellcheck={false}
		autocomplete="off"
		disabled={readonly}
		oninput={(event) => (typed = event.currentTarget.value)}
		onblur={commitTyped}
		onkeydown={(event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				commitTyped();
			}
		}}
	/>

	<!-- A colour that inherits is put back with the field's Reset instead. -->
	{#if picked && !readonly && !field.inherits}
		<button
			type="button"
			class="text-muted-foreground hover:text-foreground hover:bg-muted -ml-1 grid size-7 shrink-0 place-items-center rounded-md"
			aria-label="Clear {field.title ?? 'colour'}"
			title="Clear"
			onclick={() => emit('')}
		>
			<X class="size-4" />
		</button>
	{/if}
</div>
