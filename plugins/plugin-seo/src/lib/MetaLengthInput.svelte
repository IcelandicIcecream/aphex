<script lang="ts">
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Textarea } from '@aphexcms/ui/shadcn/textarea';
	import type { FieldComponentProps } from '@aphexcms/cms-core';

	// Same prop contract as the built-in field renderers — a drop-in replacement.
	let {
		field,
		value,
		onUpdate,
		readonly = false,
		validationClasses
	}: FieldComponentProps = $props();

	const text = $derived(typeof value === 'string' ? value : '');
	const len = $derived(text.length);

	// Title vs. meta-description guidance (chars): titles aim ~60, descriptions ~155.
	const isDescription = $derived(field.type === 'text');
	const ideal = $derived(isDescription ? 155 : 60);
	const max = $derived(isDescription ? 165 : 70);
	const tone = $derived(len === 0 ? 'idle' : len <= ideal ? 'good' : len <= max ? 'warn' : 'over');
	const toneClass = $derived(
		tone === 'good'
			? 'text-emerald-600 dark:text-emerald-500'
			: tone === 'warn'
				? 'text-amber-600 dark:text-amber-500'
				: tone === 'over'
					? 'text-destructive'
					: 'text-muted-foreground'
	);
</script>

<div class="relative">
	{#if isDescription}
		<Textarea
			value={text}
			oninput={(e) => onUpdate(e.currentTarget.value)}
			disabled={readonly}
			rows={3}
			class="pr-14 {validationClasses ?? ''}"
		/>
	{:else}
		<Input
			type="text"
			value={text}
			oninput={(e) => onUpdate(e.currentTarget.value)}
			disabled={readonly}
			class="pr-14 {validationClasses ?? ''}"
		/>
	{/if}
	<span
		class="pointer-events-none absolute right-3 font-mono text-[11px] tabular-nums {toneClass} {isDescription
			? 'top-2.5'
			: 'top-1/2 -translate-y-1/2'}"
		title="Ideal ≤ {ideal} characters"
	>
		{len}/{ideal}
	</span>
</div>
