<script lang="ts">
	/** A responsive grid of post cards, with an honest empty state. */
	import Card from './Card.svelte';
	import type { CardData } from '$lib/utils/card';

	interface Props {
		cards: CardData[];
		/** Shown instead of the grid when there's nothing to list. */
		empty?: string;
	}

	let { cards, empty = 'Nothing published yet.' }: Props = $props();
</script>

{#if cards.length}
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each cards as card (card.id)}
			<Card
				href={card.href}
				title={card.title}
				excerpt={card.excerpt}
				image={card.image}
				tags={card.tags}
			/>
		{/each}
	</div>
{:else}
	<p class="text-muted-foreground text-sm">{empty}</p>
{/if}
