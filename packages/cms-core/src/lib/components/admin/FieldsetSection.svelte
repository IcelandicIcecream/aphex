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
	// Side by side, as many as fit (see .grid-cols).
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
	<!-- A section reads as a heading over its fields, not as one more field: small
	     capitals, a rule above, and more room around it than between fields. -->
	<section class="border-border space-y-4 border-t pt-4 first:border-t-0 first:pt-0">
		<div class="space-y-1">
			<h3 class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
				{fieldset.title}
			</h3>
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
		/* Never wider than the form: a wide control wraps or scrolls in its own box. */
		grid-template-columns: minmax(0, 1fr);
		gap: 1.5rem;
	}
	/* Up to --cols side by side, but only as many as fit at 14rem each, so a narrow
	   panel (an open preview, a phone) drops to fewer columns by itself. */
	.fields.grid-cols {
		grid-template-columns: repeat(
			auto-fill,
			minmax(max(min(14rem, 100%), calc((100% - (var(--cols) - 1) * 1rem) / var(--cols))), 1fr)
		);
		column-gap: 1rem;
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
