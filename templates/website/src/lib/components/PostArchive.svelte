<script lang="ts">
	/**
	 * The post archive's body — shared by `/posts` and `/posts/page/[n]`, which
	 * differ only in which slice they were handed.
	 */
	import CollectionArchive from './CollectionArchive.svelte';
	import Pagination from './Pagination.svelte';
	import PageRange from './PageRange.svelte';
	import Seo from './Seo.svelte';
	import type { CardData } from '$lib/utils/card';

	interface Props {
		cards: CardData[];
		page: number;
		totalPages: number;
		total: number;
		limit: number;
		category: string | null;
		truncated?: boolean;
		siteName: string;
	}

	let {
		cards,
		page,
		totalPages,
		total,
		limit,
		category,
		truncated = false,
		siteName
	}: Props = $props();

	// The category filter has to survive pagination, or clicking "2" silently
	// widens the list back to everything.
	function href(n: number) {
		const path = n === 1 ? '/posts' : `/posts/page/${n}`;
		return category ? `${path}?category=${encodeURIComponent(category)}` : path;
	}

	const title = $derived(category ? `Posts in ${category}` : 'Posts');
</script>

<Seo title={page > 1 ? `${title} — page ${page}` : title} {siteName} />

<div class="container py-16">
	<header class="mb-10 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-4xl font-semibold tracking-tight">{title}</h1>
			{#if category}
				<a
					href="/posts"
					class="text-muted-foreground hover:text-foreground mt-2 inline-block text-sm"
				>
					← All posts
				</a>
			{/if}
		</div>
		<PageRange {page} {limit} {total} />
	</header>

	{#if truncated}
		<!-- Honest rather than silent: filtering happens in memory above a cap, so
		     a very large archive would otherwise quietly under-report. See
		     FILTER_SCAN_CAP in $lib/server/posts.ts. -->
		<p class="bg-muted text-muted-foreground mb-6 rounded-md border px-4 py-3 text-sm">
			Showing the most recent posts only — this filter scans a bounded window.
		</p>
	{/if}

	<CollectionArchive {cards} empty="No posts published yet." />

	<Pagination {page} {totalPages} {href} />
</div>
