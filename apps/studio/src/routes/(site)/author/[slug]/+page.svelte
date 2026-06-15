<script lang="ts">
	import PostCard from '$lib/blog/PostCard.svelte';
	import Seo from '$lib/blog/Seo.svelte';
	import { seoTitle, seoDescription, seoOgImageRef } from '$lib/blog/seo';
	import { getLivePreviewDocument } from '@aphexcms/visual-editing';
	import type { Author } from '$lib/generated-types';

	let { data } = $props();
	const preview = getLivePreviewDocument();
	const author = $derived((preview.current as Author | null) ?? data.author);
	const posts = $derived(data.posts);

	const avatarUrl = $derived(
		author.avatar?.asset?._ref ? (data.assetUrls[author.avatar.asset._ref] ?? null) : null
	);
	const ogRef = $derived(seoOgImageRef(author.seo));
	const seoImage = $derived((ogRef ? data.assetUrls[ogRef] : null) ?? avatarUrl);
</script>

<Seo
	title={seoTitle(author.seo, author.name)}
	description={seoDescription(author.seo, author.bio)}
	image={seoImage}
	noindex={author.seo?.noIndex}
/>

<section class="author-head">
	<a href="/blog" class="back">← All stories</a>

	<div class="ident">
		{#if avatarUrl}
			<img class="avatar" src={avatarUrl} alt={author.name} />
		{/if}
		<div>
			<p class="eyebrow">Author</p>
			<h1>{author.name}</h1>
			{#if author.role}<p class="role">{author.role}</p>{/if}
		</div>
	</div>

	{#if author.bio}<p class="bio">{author.bio}</p>{/if}

	{#if (author.links?.length ?? 0) > 0}
		<div class="links">
			{#each author.links ?? [] as link}
				{#if link.url}
					<a href={link.url} target="_blank" rel="noopener noreferrer me">
						{link.label ?? link.url}
					</a>
				{/if}
			{/each}
		</div>
	{/if}

	<p class="count">{posts.length} {posts.length === 1 ? 'story' : 'stories'}</p>
</section>

{#if posts.length === 0}
	<div class="empty"><p>No stories by {author.name} yet.</p></div>
{:else}
	<div class="grid">
		{#each posts as post}
			<PostCard {post} assetUrls={data.assetUrls} assetAlts={data.assetAlts} tagMap={data.tagMap} />
		{/each}
	</div>
{/if}

<style>
	.author-head {
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
	.ident {
		display: flex;
		align-items: center;
		gap: 1.4rem;
		margin-top: 2rem;
	}
	.avatar {
		width: 5rem;
		height: 5rem;
		border-radius: 999px;
		object-fit: cover;
		flex-shrink: 0;
	}
	.eyebrow {
		font-size: 0.74rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--accent-ink);
		margin: 0 0 0.5rem;
	}
	.ident h1 {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(2.2rem, 5vw, 3.2rem);
		line-height: 1;
		letter-spacing: -0.03em;
		margin: 0;
		color: var(--ink);
	}
	.role {
		margin: 0.4rem 0 0;
		font-size: 1rem;
		color: var(--ink-soft);
	}
	.bio {
		margin: 1.6rem 0 0;
		max-width: 36rem;
		font-size: 1.15rem;
		line-height: 1.6;
		color: var(--ink-soft);
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 1.2rem;
		margin-top: 1.4rem;
	}
	.links a {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--accent-ink);
		text-decoration: none;
		border-bottom: 1.5px solid color-mix(in srgb, var(--accent) 30%, transparent);
		padding-bottom: 1px;
		transition: border-color 0.18s ease;
	}
	.links a:hover {
		border-color: var(--accent);
	}
	.count {
		margin: 1.75rem 0 0;
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
		.author-head,
		.grid,
		.empty {
			padding-left: 1.25rem;
			padding-right: 1.25rem;
		}
	}
</style>
