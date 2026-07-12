<script lang="ts">
	import type { FieldComponentProps } from '@aphexcms/cms-core';
	import ColorPicker from './ColorPicker.svelte';
	import { parseColorToValue, colorValueToCss } from './color.js';

	// Registered as `aphex/field/component` for `input: 'color'`, so it receives the
	// plugin field-component contract — not the editor's internals.
	let {
		field,
		value,
		onUpdate,
		validationClasses,
		readonly = false
	}: FieldComponentProps = $props();

	// Storage shape follows the field type: an `object` field stores the rich
	// { hex, alpha, rgb, hsl, hsv } ColorValue (Sanity-style); a `string` field
	// stores a plain hex/CSS string (drops straight into CSS). One widget, both.
	const isObject = $derived(field.type === 'object');

	// Per-widget config lives in the field's `inputOptions` bag (typed on BaseField,
	// so any custom input can carry config). `alpha` enables an 8-digit hex channel.
	const allowOpacity = $derived(field.inputOptions?.alpha === true);
	type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch';
	const formats = $derived<ColorFormat[] | undefined>(
		// Object mode canonicalises via hex/rgb/hsl parsing (no oklch); string mode
		// honours `hexOnly`.
		isObject ? ['hex', 'rgb', 'hsl'] : field.inputOptions?.hexOnly === true ? ['hex'] : undefined
	);

	// Local mirror the picker binds to (always a CSS string). External changes flow in;
	// picker changes flow out through onChange → onUpdate, converted to the field's
	// storage shape. No ping-pong: onChange sets `picked`, the sync effect then sees
	// them equal and does nothing.
	let picked = $state('');
	$effect(() => {
		const next = isObject ? colorValueToCss(value) : typeof value === 'string' ? value : '';
		if (next !== picked) picked = next;
	});

	function emit(css: string) {
		if (isObject) {
			// Store the rich object; empty/unparseable clears the field.
			onUpdate(css ? parseColorToValue(css) : undefined);
		} else {
			onUpdate(css);
		}
	}
</script>

<div class:pointer-events-none={readonly} class:opacity-50={readonly} aria-disabled={readonly}>
	<ColorPicker
		bind:value={picked}
		{allowOpacity}
		{formats}
		class={validationClasses}
		onChange={emit}
	/>
</div>
