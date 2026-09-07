<script lang="ts">
	/**
	 * Search results.
	 *
	 * The form is a plain GET to this same route, so a search is a URL: it can be
	 * shared, bookmarked and reloaded, and the back button behaves. No JavaScript
	 * is required for it to work.
	 */
	import CollectionArchive from '$lib/components/CollectionArchive.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const total = $derived(data.posts.length + data.pages.length);
</script>

<Seo title="Search" siteName={data.settings?.title || 'Aphex'} />

<div class="container py-16">
	<h1 class="text-4xl font-semibold tracking-tight">Search</h1>

	<form method="GET" class="mt-8 flex max-w-lg gap-2">
		<Input name="q" value={data.query} placeholder="Search posts and pages…" autofocus />
		<Button type="submit">Search</Button>
	</form>

	{#if data.query}
		<p class="text-muted-foreground mt-6 text-sm">
			{total}
			{total === 1 ? 'result' : 'results'} for “{data.query}”
		</p>

		{#if data.posts.length}
			<section class="mt-10">
				<h2 class="text-muted-foreground mb-6 text-sm font-semibold tracking-wide uppercase">
					Posts
				</h2>
				<CollectionArchive cards={data.posts} />
			</section>
		{/if}

		{#if data.pages.length}
			<section class="mt-12">
				<h2 class="text-muted-foreground mb-4 text-sm font-semibold tracking-wide uppercase">
					Pages
				</h2>
				<ul class="divide-y border-y">
					{#each data.pages as result (result.id)}
						<li class="py-3">
							{#if result.href}
								<a href={result.href} class="underline-offset-4 hover:underline">{result.title}</a>
							{:else}
								{result.title}
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if total === 0}
			<p class="text-muted-foreground mt-10">Nothing matched. Try a different word.</p>
		{/if}
	{/if}
</div>
