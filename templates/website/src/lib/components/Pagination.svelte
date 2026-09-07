<script lang="ts">
	/**
	 * Page-number navigation for the post archive.
	 *
	 * Real links, not buttons: each page is its own URL (`/posts/page/3`), which
	 * is what makes the archive crawlable, shareable and back-button-correct. A
	 * click handler swapping content in place would give up all three.
	 *
	 * The window is "first, current ± 1, last" with ellipses, so the control stays
	 * a fixed width whether there are 5 pages or 500.
	 */
	interface Props {
		page: number;
		totalPages: number;
		/** Builds the href for a page number. */
		href: (page: number) => string;
	}

	let { page, totalPages, href }: Props = $props();

	const pages = $derived.by(() => {
		if (totalPages <= 1) return [];
		const window = new Set<number>([1, totalPages, page - 1, page, page + 1]);
		const shown = [...window].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);

		// Insert a gap marker wherever the sequence skips.
		const out: Array<number | 'gap'> = [];
		let previous = 0;
		for (const n of shown) {
			if (previous && n - previous > 1) out.push('gap');
			out.push(n);
			previous = n;
		}
		return out;
	});
</script>

{#if pages.length}
	<nav class="mt-12 flex items-center justify-center gap-1 text-sm" aria-label="Pagination">
		{#if page > 1}
			<a href={href(page - 1)} class="hover:bg-muted rounded-md px-3 py-2" rel="prev">Previous</a>
		{/if}

		{#each pages as entry, i (i)}
			{#if entry === 'gap'}
				<span class="text-muted-foreground px-2" aria-hidden="true">…</span>
			{:else if entry === page}
				<span class="bg-foreground text-background rounded-md px-3 py-2" aria-current="page">
					{entry}
				</span>
			{:else}
				<a href={href(entry)} class="hover:bg-muted rounded-md px-3 py-2">{entry}</a>
			{/if}
		{/each}

		{#if page < totalPages}
			<a href={href(page + 1)} class="hover:bg-muted rounded-md px-3 py-2" rel="next">Next</a>
		{/if}
	</nav>
{/if}
