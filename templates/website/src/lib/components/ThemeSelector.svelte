<script lang="ts">
	/**
	 * Auto / Light / Dark, as a segmented control in the footer.
	 *
	 * Three explicit choices rather than a two-state toggle, because "follow my
	 * system" is a real preference and a toggle can't express it — the same shape
	 * Payload's website template uses, and in the same place.
	 *
	 * `mode-watcher` owns the `.dark` class on `<html>` (the class the shadcn
	 * tokens in `@aphexcms/ui` key their dark palette off) and persists the
	 * choice; this is a thin control over `setMode`.
	 */
	import { userPrefersMode, setMode } from 'mode-watcher';
	import { Monitor, Sun, Moon } from '@lucide/svelte';

	const options = [
		{ value: 'system', label: 'Auto', icon: Monitor },
		{ value: 'light', label: 'Light', icon: Sun },
		{ value: 'dark', label: 'Dark', icon: Moon }
	] as const;

	// The stored *choice*, which includes 'system' — not `mode`, which is the
	// resolved light/dark. The control has to reflect the choice, or picking Auto
	// would immediately highlight Light or Dark instead.
	const current = $derived(userPrefersMode.current);
</script>

<div
	class="inline-flex items-center rounded-lg border p-0.5"
	role="group"
	aria-label="Colour theme"
>
	{#each options as option (option.value)}
		{@const Icon = option.icon}
		<button
			type="button"
			onclick={() => setMode(option.value)}
			aria-pressed={current === option.value}
			title={option.label}
			class="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors
				{current === option.value
				? 'bg-foreground text-background'
				: 'text-muted-foreground hover:text-foreground'}"
		>
			<Icon class="size-3.5" />
			<span class="sr-only sm:not-sr-only">{option.label}</span>
		</button>
	{/each}
</div>
