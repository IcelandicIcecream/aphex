<script lang="ts">
	import type { FieldComponentProps } from '@aphexcms/cms-core';
	import ColorPicker from './ColorPicker.svelte';

	// Registered as `aphex/field/component` for `input: 'color-picker'`, so it
	// receives the plugin field-component contract — not the editor's internals.
	let {
		field,
		value,
		onUpdate,
		validationClasses,
		readonly = false
	}: FieldComponentProps = $props();

	// Per-widget config lives in the field's `inputOptions` bag (typed on BaseField,
	// so any custom input can carry config). `alpha` enables an 8-digit hex channel.
	const allowOpacity = $derived(field.inputOptions?.alpha === true);

	// Local mirror the picker binds to. External changes flow in; picker changes
	// flow out through onChange → onUpdate (no ping-pong: onChange sets `value`,
	// after which the sync effect sees them equal and does nothing).
	let picked = $state('');
	$effect(() => {
		const v = typeof value === 'string' ? value : '';
		if (v !== picked) picked = v;
	});
</script>

<div class:pointer-events-none={readonly} class:opacity-50={readonly} aria-disabled={readonly}>
	<ColorPicker
		bind:value={picked}
		{allowOpacity}
		class={validationClasses}
		onChange={(nextValue) => onUpdate(nextValue)}
	/>
</div>
