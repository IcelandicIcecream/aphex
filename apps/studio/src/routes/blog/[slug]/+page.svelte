<script lang="ts">
	import { PortableText } from '@portabletext/svelte';
	import BlogImage from '$lib/blog/BlogImage.svelte';
	import BlogCallout from '$lib/blog/BlogCallout.svelte';
	import BlogCodeBlock from '$lib/blog/BlogCodeBlock.svelte';
	import BlogLinkMark from '$lib/blog/BlogLinkMark.svelte';

	let { data } = $props();
	let liveDocument = $state<Record<string, unknown> | null>(null);
	const post = $derived((liveDocument ?? data.post) as any);

	const coverUrl = $derived(
		post.coverImage?.asset?._ref ? (data.assetUrls[post.coverImage.asset._ref] ?? null) : null
	);

	$effect(() => {
		const handler = (e: MessageEvent) => {
			if (e.data?.type === 'aphex:data' && e.data.document) {
				liveDocument = e.data.document;
			}
		};
		window.addEventListener('message', handler);
		window.parent.postMessage({ type: 'aphex:ready' }, '*');
		return () => window.removeEventListener('message', handler);
	});

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return null;
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	const components = {
		types: {
			image: BlogImage,
			callout: BlogCallout,
			codeBlock: BlogCodeBlock
		},
		marks: {
			link: BlogLinkMark
		}
	};
</script>

<svelte:head>
	<title>{post.title ?? 'Blog Post'}</title>
	{#if post.excerpt}
		<meta name="description" content={post.excerpt} />
		<meta property="og:description" content={post.excerpt} />
		<meta name="twitter:description" content={post.excerpt} />
	{/if}
	<meta property="og:title" content={post.title ?? 'Blog Post'} />
	<meta property="og:type" content="article" />
	{#if coverUrl}
		<meta property="og:image" content={coverUrl} />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:image" content={coverUrl} />
	{:else}
		<meta name="twitter:card" content="summary" />
	{/if}
	{#if post.postDate}
		<meta property="article:published_time" content={post.postDate} />
	{/if}
	{#if post.author}
		<meta property="article:author" content={post.author} />
	{/if}
</svelte:head>

<div class="mx-auto max-w-3xl px-6 py-16">
	<a
		href="/blog"
		class="mb-10 inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-900"
	>
		<span aria-hidden="true">←</span> All posts
	</a>

	<div class="mb-6 flex items-center gap-3 text-sm text-gray-400">
		{#if post.postDate}
			<time datetime={post.postDate}>{formatDate(post.postDate)}</time>
		{/if}
		{#if post.postDate && post.author}
			<span>·</span>
		{/if}
		{#if post.author}
			<span>{post.author}</span>
		{/if}
	</div>

	<h1
		data-aphex-field="title"
		class="mb-6 text-4xl font-bold tracking-tight text-gray-900 lg:text-5xl"
	>
		{post.title ?? 'Untitled'}
	</h1>

	{#if post.excerpt}
		<p data-aphex-field="excerpt" class="mb-8 text-xl leading-relaxed text-gray-500">
			{post.excerpt}
		</p>
	{/if}

	{#if post.tags?.length > 0}
		<div class="mb-8 flex flex-wrap gap-2">
			{#each post.tags as tag}
				<span class="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
					>{tag}</span
				>
			{/each}
		</div>
	{/if}

	{#if coverUrl}
		<figure class="mb-12 overflow-hidden rounded-xl">
			<img src={coverUrl} alt={post.title ?? ''} class="w-full object-cover" />
		</figure>
	{/if}

	<hr class="mb-12 border-gray-100" />

	{#if post.content && Array.isArray(post.content)}
		<div data-aphex-field="content" class="blog-content leading-relaxed text-gray-700">
			<PortableText value={post.content} {components} onMissingComponent={false} />
		</div>
	{:else}
		<p class="text-gray-400 italic">No content.</p>
	{/if}
</div>

<style>
	.blog-content :global(p) {
		margin-bottom: 1.5rem;
		font-size: 1.0625rem;
		line-height: 1.8;
		color: #374151;
	}
	.blog-content :global(h1),
	.blog-content :global(h2),
	.blog-content :global(h3),
	.blog-content :global(h4) {
		font-weight: 700;
		color: #111827;
		margin-top: 2.5rem;
		margin-bottom: 1rem;
		line-height: 1.3;
	}
	.blog-content :global(h1) {
		font-size: 2rem;
	}
	.blog-content :global(h2) {
		font-size: 1.5rem;
	}
	.blog-content :global(h3) {
		font-size: 1.25rem;
	}
	.blog-content :global(h4) {
		font-size: 1.125rem;
	}
	.blog-content :global(blockquote) {
		border-left: 3px solid #e5e7eb;
		padding-left: 1.25rem;
		margin: 2rem 0;
		color: #6b7280;
		font-style: italic;
	}
	.blog-content :global(ul),
	.blog-content :global(ol) {
		margin: 1.5rem 0;
		padding-left: 1.5rem;
	}
	.blog-content :global(li) {
		margin-bottom: 0.5rem;
		line-height: 1.7;
	}
	.blog-content :global(ul) {
		list-style-type: disc;
	}
	.blog-content :global(ol) {
		list-style-type: decimal;
	}
	.blog-content :global(code) {
		background: #f3f4f6;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.875em;
		font-family: ui-monospace, monospace;
		color: #1f2937;
	}
	.blog-content :global(strong) {
		font-weight: 600;
		color: #111827;
	}
	.blog-content :global(em) {
		font-style: italic;
	}
</style>
