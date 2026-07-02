<script lang="ts">
	import PostCard from '$lib/blog/PostCard.svelte';
	import Seo from '$lib/blog/Seo.svelte';
	import { seoTitle, seoDescription, seoOgImageUrl } from '$lib/blog/seo';
	import { usePreview } from '@aphexcms/visual-editing';
	import type { Tag } from '$lib/generated-types';

	let { data } = $props();
	const ve = usePreview();
	// Live preview doc (stega-encoded) so the title/description get overlays.
	const tag = $derived(ve.live<Tag>(data.tag));
	const posts = $derived(data.posts);

	const seoImage = $derived(seoOgImageUrl(tag.seo));
</script>

<Seo
	title={seoTitle(tag.seo, `${tag.title} — Stories`)}
	description={seoDescription(tag.seo, tag.description)}
	image={seoImage}
	noindex={tag.seo?.noIndex}
/>

<section class="tag-head">
	<a href="/blog" class="back">← All stories</a>
	<p class="eyebrow">Topic</p>
	<h1>{tag.title}</h1>
	{#if tag.description}<p class="sub">{tag.description}</p>{/if}
	<p class="count">{posts.length} {posts.length === 1 ? 'story' : 'stories'}</p>
</section>

{#if posts.length === 0}
	<div class="empty"><p>No stories tagged “{tag.title}” yet.</p></div>
{:else}
	<div class="grid">
		{#each posts as post}
			<PostCard {post} tagMap={data.tagMap} />
		{/each}
	</div>
{/if}

<style>
	.tag-head {
		max-width: 72rem;
		margin: 0 auto;
		padding: 4rem 2rem 0;
	}
	.back {
		display: inline-block;
		font-size: 0.86rem;
		font-weight: 500;
		color: var(--ink-soft);
		text-decoration: none;
		transition: color 0.18s ease;
	}
	.back:hover {
		color: var(--accent-ink);
	}
	.eyebrow {
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--accent-ink);
		margin: 1.75rem 0 0.9rem;
	}
	.tag-head h1 {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(2.5rem, 6vw, 4rem);
		line-height: 1;
		letter-spacing: -0.035em;
		margin: 0;
		color: var(--ink);
	}
	.sub {
		margin: 1.1rem 0 0;
		max-width: 34rem;
		font-size: 1.15rem;
		line-height: 1.55;
		color: var(--ink-soft);
	}
	.count {
		margin: 1.25rem 0 0;
		font-size: 0.85rem;
		color: var(--ink-faint);
	}
	.grid {
		max-width: 72rem;
		margin: 0 auto;
		padding: 3rem 2rem 0;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 3rem 3.5rem;
	}
	.empty {
		max-width: 72rem;
		margin: 0 auto;
		padding: 3rem 2rem 0;
		color: var(--ink-soft);
	}
	@media (max-width: 820px) {
		.grid {
			grid-template-columns: 1fr;
			gap: 2.75rem;
		}
	}
	@media (max-width: 640px) {
		.tag-head,
		.grid,
		.empty {
			padding-left: 1.25rem;
			padding-right: 1.25rem;
		}
	}
</style>
