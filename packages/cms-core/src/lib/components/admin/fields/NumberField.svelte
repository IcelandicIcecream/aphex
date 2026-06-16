<script lang="ts">
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Slider } from '@aphexcms/ui/shadcn/slider';
	import type { NumberField } from '../../../types/schemas';

	interface Props {
		field: NumberField;
		value: number | null;
		onUpdate: (value: number | null) => void;
		validationClasses?: string;
		onBlur?: (event: any) => void;
		onFocus?: (event: any) => void;
		readonly?: boolean;
	}

	let {
		field,
		value,
		onUpdate,
		validationClasses,
		onBlur,
		onFocus,
		readonly = false
	}: Props = $props();

	// --- Slider mode ---------------------------------------------------------------
	const asSlider = $derived(field.options?.layout === 'slider');
	const sliderMin = $derived(field.min ?? 0);
	const sliderMax = $derived(field.max ?? 100);
	const sliderStep = $derived(field.step ?? 1);
	const unit = $derived(field.options?.unit ?? '');
	// The slider always needs a concrete position; fall back to the min when unset.
	const sliderValue = $derived(value ?? sliderMin);

	// Convert value to string for input, handle null/undefined
	let inputValue = $derived(value?.toString() || '');

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const newValue = target.value;

		// Convert to number and update
		if (newValue === '') {
			onUpdate(null);
		} else {
			let numValue = parseFloat(newValue);
			if (!isNaN(numValue)) {
				// In slider mode the value is bounded, so clamp typed input to the range.
				if (asSlider) numValue = Math.min(sliderMax, Math.max(sliderMin, numValue));
				onUpdate(numValue);
			}
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		// Allow: backspace, delete, tab, escape, enter
		if (
			[8, 9, 27, 13, 46].includes(event.keyCode) ||
			// Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
			(event.keyCode === 65 && event.ctrlKey) ||
			(event.keyCode === 67 && event.ctrlKey) ||
			(event.keyCode === 86 && event.ctrlKey) ||
			(event.keyCode === 88 && event.ctrlKey) ||
			// Allow: home, end, left, right
			(event.keyCode >= 35 && event.keyCode <= 39)
		) {
			return;
		}

		// Ensure that it's a number or decimal point and stop the keypress
		if (
			(event.shiftKey || event.keyCode < 48 || event.keyCode > 57) &&
			(event.keyCode < 96 || event.keyCode > 105) &&
			event.keyCode !== 190 &&
			event.keyCode !== 110
		) {
			event.preventDefault();
		}
	}
</script>

{#if asSlider}
	<div class="flex items-center gap-3" class:opacity-60={readonly}>
		<Slider
			type="single"
			value={sliderValue}
			onValueChange={(v) => onUpdate(v)}
			min={sliderMin}
			max={sliderMax}
			step={sliderStep}
			disabled={readonly}
			class="flex-1"
		/>
		<div class="flex shrink-0 items-center gap-1.5">
			<Input
				type="number"
				min={sliderMin}
				max={sliderMax}
				step={sliderStep}
				value={inputValue}
				oninput={handleInput}
				onkeydown={handleKeydown}
				onblur={onBlur}
				onfocus={onFocus}
				class="h-8 w-16 text-sm tabular-nums {validationClasses ?? ''}"
				disabled={readonly}
			/>
			{#if unit}<span class="text-muted-foreground text-sm">{unit}</span>{/if}
		</div>
	</div>
{:else}
	<Input
		id={field.name}
		type="number"
		step={field.step ?? 'any'}
		min={field.min}
		max={field.max}
		placeholder={field.description || `Enter ${field.title?.toLowerCase() || 'number'}`}
		value={inputValue}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onblur={onBlur}
		onfocus={onFocus}
		class={validationClasses}
		disabled={readonly}
	/>
{/if}
