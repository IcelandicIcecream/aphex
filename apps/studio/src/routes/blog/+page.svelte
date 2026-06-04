<script lang="ts">
	let { data } = $props();

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return null;
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Blog</title>
	<meta name="description" content="Thoughts, ideas, and stories." />
	<meta property="og:title" content="Blog" />
	<meta property="og:type" content="website" />
</svelte:head>

<div class="mx-auto max-w-3xl px-6 py-16">
	<h1 class="mb-2 text-4xl font-bold tracking-tight text-gray-900">Latest Posts</h1>
	<p class="mb-12 text-gray-500">Thoughts, ideas, and stories.</p>

	{#if data.posts.length === 0}
		<div class="rounded-xl border border-dashed border-gray-200 py-20 text-center">
			<p class="text-gray-400">No published posts yet.</p>
			<a
				href="/admin"
				class="mt-3 inline-block text-sm text-gray-500 underline underline-offset-2 hover:text-gray-900"
			>
				Go to admin to create one
			</a>
		</div>
	{:else}
		<div class="divide-y divide-gray-100">
			{#each data.posts as post}
				{@const p = post as any}
				{@const coverUrl = p.coverImage?.asset?._ref
					? (data.assetUrls[p.coverImage.asset._ref] ?? null)
					: null}
				<article class="group py-10">
					<a href="/blog/{p.slug}" class="block">
						{#if coverUrl}
							<div class="mb-5 overflow-hidden rounded-xl">
								<img
									src={coverUrl}
									alt={p.title ?? ''}
									class="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
								/>
							</div>
						{/if}

						<div class="mb-3 flex items-center gap-3 text-sm text-gray-400">
							{#if p.postDate}
								<time datetime={p.postDate}>{formatDate(p.postDate)}</time>
							{/if}
							{#if p.postDate && p.author}
								<span>·</span>
							{/if}
							{#if p.author}
								<span>{p.author}</span>
							{/if}
						</div>

						<h2
							class="mb-3 text-2xl font-semibold text-gray-900 transition-colors group-hover:text-gray-600"
						>
							{p.title ?? 'Untitled'}
						</h2>
						{#if p.excerpt}
							<p class="line-clamp-3 leading-relaxed text-gray-500">{p.excerpt}</p>
						{/if}
					</a>

					{#if p.tags?.length > 0}
						<div class="mt-4 flex flex-wrap gap-2">
							{#each p.tags as tag}
								<span class="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
									{tag}
								</span>
							{/each}
						</div>
					{/if}

					<a
						href="/blog/{p.slug}"
						class="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 transition-all hover:gap-2.5"
					>
						Read more
						<span aria-hidden="true">→</span>
					</a>
				</article>
			{/each}
		</div>
	{/if}
</div>
