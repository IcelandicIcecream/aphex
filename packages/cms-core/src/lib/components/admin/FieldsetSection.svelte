<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChevronRight } from '@lucide/svelte';
	import type { Fieldset } from '../../types/schemas';

	/**
	 * A titled section of a form (`fieldsets` on a type or an object). A collapsible
	 * one is a native <details>, so its fields stay mounted while folded: their own
	 * validation keeps running, and a problem inside shows on the folded header
	 * rather than going unseen.
	 */
	let {
		fieldset,
		filled = 0,
		children
	}: {
		fieldset: Pick<Fieldset, 'title' | 'description' | 'options'>;
		/** How many of its fields have a value, shown on the folded header. */
		filled?: number;
		children: Snippet;
	} = $props();

	const collapsible = $derived(!!(fieldset.options?.collapsible || fieldset.options?.collapsed));
	// Read once: after that the author's own toggling decides.
	// svelte-ignore state_referenced_locally
	let open = $state(!fieldset.options?.collapsed);
	// Side by side from tablet width up; one column on a phone.
	const columns = $derived(Math.max(1, Math.min(4, Math.floor(fieldset.options?.columns ?? 1))));
</script>

{#if collapsible}
	<details class="fieldset border-border rounded-md border" bind:open>
		<summary
			class="hover:bg-muted/50 flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2.5 select-none [&::-webkit-details-marker]:hidden"
		>
			<ChevronRight
				class="text-muted-foreground size-4 shrink-0 transition-transform {open ? 'rotate-90' : ''}"
			/>
			<span class="text-sm font-medium">{fieldset.title}</span>
			<span class="flag text-destructive ml-auto text-xs font-medium">Needs attention</span>
			{#if !open && filled > 0}
				<span class="filled text-muted-foreground ml-auto text-xs tabular-nums">
					{filled} set
				</span>
			{/if}
		</summary>
		<div class="space-y-4 px-3 pt-1 pb-4">
			{#if fieldset.description}
				<p class="text-muted-foreground text-sm">{fieldset.description}</p>
			{/if}
			{@render fields()}
		</div>
	</details>
{:else}
	<section class="space-y-4">
		<div class="space-y-1">
			<h3 class="text-sm font-medium">{fieldset.title}</h3>
			{#if fieldset.description}
				<p class="text-muted-foreground text-sm">{fieldset.description}</p>
			{/if}
		</div>
		{@render fields()}
	</section>
{/if}

{#snippet fields()}
	<div class="fields" class:grid-cols={columns > 1} style:--cols={columns}>
		{@render children()}
	</div>
{/snippet}

<style>
	.fields {
		display: grid;
		gap: 1.5rem;
	}
	@media (min-width: 640px) {
		.fields.grid-cols {
			grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
			column-gap: 1rem;
		}
	}
	.flag {
		display: none;
	}
	.fieldset:has(:global([data-field-error])) .flag {
		display: inline;
	}
	.fieldset:has(:global([data-field-error])) .filled {
		display: none;
	}
</style>
