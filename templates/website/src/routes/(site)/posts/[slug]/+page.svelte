<script lang="ts">
	import { usePreview } from '@aphexcms/visual-editing';
	import PostHero from '$lib/heros/PostHero.svelte';
	import RichText from '$lib/components/RichText.svelte';
	import CollectionArchive from '$lib/components/CollectionArchive.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Swaps in the draft being edited when the studio opens this URL via the
	// schema's `previewUrl`; a passthrough otherwise.
	const ve = usePreview();
	const post = $derived(ve.live(data.post, { type: 'post' }));
	const hero = $derived(ve.image(post.heroImage));

	const siteName = $derived(data.settings?.title || 'Aphex');
</script>

<Seo
	seo={post.seo}
	title={post.title}
	description={post.excerpt}
	image={hero.src}
	{siteName}
	type="article"
/>

<article>
	<PostHero
		title={post.title ?? 'Untitled'}
		excerpt={post.excerpt}
		heroImage={post.heroImage}
		categories={post.categories}
		publishedAt={post._meta?.publishedAt}
	/>

	<div class="container py-12">
		<RichText value={post.content} narrow class="mx-auto" />
	</div>
</article>

{#if data.related.length}
	<aside class="container border-t pt-12 pb-4">
		<h2 class="mb-8 text-2xl font-semibold tracking-tight">Related posts</h2>
		<CollectionArchive cards={data.related} />
	</aside>
{/if}

<div class="text-muted-foreground container mt-12 flex flex-wrap justify-between gap-4 text-sm">
	<a href="/posts" class="hover:text-foreground">← All posts</a>
	{#if data.signedIn}
		<a href="/admin?docType=post&docId={post.id}" class="hover:text-foreground">
			Edit this post →
		</a>
	{/if}
</div>
