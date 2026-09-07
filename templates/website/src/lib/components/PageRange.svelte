<script lang="ts">
	/** "Showing 1–12 of 47 posts" — the line above a paginated list. */
	interface Props {
		page: number;
		limit: number;
		total: number;
		noun?: string;
	}

	let { page, limit, total, noun = 'post' }: Props = $props();

	const from = $derived(total === 0 ? 0 : (page - 1) * limit + 1);
	const to = $derived(Math.min(page * limit, total));
</script>

{#if total > 0}
	<p class="text-muted-foreground text-sm">
		Showing {from}–{to} of {total}
		{noun}{total === 1 ? '' : 's'}
	</p>
{/if}
