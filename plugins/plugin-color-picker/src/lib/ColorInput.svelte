<script lang="ts">
	import { Input } from '@aphexcms/ui/shadcn/input';
	import * as Popover from '@aphexcms/ui/shadcn/popover';
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

	// The swatch preview only renders solid 6-digit hex; fall back for empty/short.
	const swatchColor = $derived(/^#[0-9a-fA-F]{6,8}$/.test(picked) ? picked : 'transparent');

	const textValue = $derived(typeof value === 'string' ? value : '');

	function handleText(event: Event) {
		onUpdate((event.target as HTMLInputElement).value);
	}
</script>

<div class="flex items-center gap-2">
	<Popover.Root>
		<Popover.Trigger
			disabled={readonly}
			aria-label={`Pick ${field.title} color`}
			class="border-input h-9 w-10 shrink-0 rounded-md border bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')] p-0 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<span class="block h-full w-full rounded-[5px]" style:background-color={swatchColor}></span>
		</Popover.Trigger>
		<Popover.Content class="w-auto p-0" align="start">
			<ColorPicker bind:value={picked} {allowOpacity} onChange={(v) => onUpdate(v)} />
		</Popover.Content>
	</Popover.Root>
	<Input
		id={field.name}
		type="text"
		value={textValue}
		placeholder="#3EB0EF"
		oninput={handleText}
		class={validationClasses}
		disabled={readonly}
		spellcheck={false}
	/>
</div>
