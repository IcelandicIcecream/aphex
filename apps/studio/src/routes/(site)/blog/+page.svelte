<script lang="ts">
	import { readingTime } from '$lib/blog/reading-time';
	import PostCard from '$lib/blog/PostCard.svelte';
	import Seo from '$lib/blog/Seo.svelte';

	let { data } = $props();

	const posts = $derived(data.posts);
	const featured = $derived(posts[0] ?? null);
	const rest = $derived(posts.slice(1));

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return null;
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function coverUrl(ref: string | null | undefined) {
		return ref ? (data.assetUrls[ref] ?? null) : null;
	}

	// Effective alt: per-placement override → asset default → post title.
	function coverAlt(post: (typeof posts)[number]) {
		const ref = post.coverImage?.asset?._ref;
		return post.coverImage?.alt || (ref ? (data.assetAlts[ref] ?? '') : '') || post.title;
	}
</script>

<Seo
	title="Stories"
	description={data.settings?.tagline ?? 'Field notes, essays, and dispatches from the studio.'}
/>

<section class="masthead">
	<p class="eyebrow">The Journal</p>
	<h1>Stories from<br />the studio.</h1>
	<p class="masthead__sub">
		Essays on craft, process, and the work in progress — written by the people making it.
	</p>
</section>

{#if posts.length === 0}
	<div class="empty">
		<p>No published stories yet.</p>
		<a href="/admin">Open the studio to write one →</a>
	</div>
{:else}
	{#if featured}
		{@const cover = coverUrl(featured.coverImage?.asset?._ref)}
		<a class="featured" href="/blog/{featured.slug}">
			{#if cover}
				<div class="featured__media">
					<img src={cover} alt={coverAlt(featured)} loading="eager" />
				</div>
			{/if}
			<div class="featured__body">
				<p class="meta">
					<span class="meta__tag">Featured</span>
					{#if featured.postDate}<time datetime={featured.postDate}
							>{formatDate(featured.postDate)}</time
						>{/if}
					<span class="meta__dot">·</span>
					<span>{readingTime(featured.content)}</span>
				</p>
				<h2>{featured.title ?? 'Untitled'}</h2>
				{#if featured.excerpt}<p class="featured__excerpt">{featured.excerpt}</p>{/if}
				<span class="readlink">Read story</span>
			</div>
		</a>
	{/if}

	{#if rest.length > 0}
		<div class="rule"></div>
		<div class="grid">
			{#each rest as post}
				<PostCard
					{post}
					assetUrls={data.assetUrls}
					assetAlts={data.assetAlts}
					tagMap={data.tagMap}
				/>
			{/each}
		</div>
	{/if}
{/if}

<style>
	.masthead {
		max-width: 72rem;
		margin: 0 auto;
		padding: 5rem 2rem 3.5rem;
	}
	.eyebrow {
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--accent-ink);
		margin: 0 0 1.25rem;
	}
	.masthead h1 {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(2.75rem, 7vw, 5rem);
		line-height: 0.98;
		letter-spacing: -0.035em;
		margin: 0;
		color: var(--ink);
	}
	.masthead__sub {
		margin: 1.5rem 0 0;
		max-width: 32rem;
		font-size: 1.18rem;
		line-height: 1.55;
		color: var(--ink-soft);
	}

	/* ---- Featured ---- */
	.featured {
		max-width: 72rem;
		margin: 0 auto;
		padding: 1rem 2rem 0;
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		gap: 3.5rem;
		align-items: center;
		text-decoration: none;
		color: inherit;
	}
	.featured__media {
		overflow: hidden;
		border-radius: 12px;
		aspect-ratio: 4 / 3;
		background: var(--rule-soft);
	}
	.featured__media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.featured:hover .featured__media img {
		transform: scale(1.03);
	}
	.featured__body h2 {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(2rem, 3.6vw, 3rem);
		line-height: 1.04;
		letter-spacing: -0.03em;
		margin: 0.9rem 0 0;
		color: var(--ink);
	}
	.featured__excerpt {
		margin: 1.1rem 0 0;
		font-size: 1.08rem;
		line-height: 1.6;
		color: var(--ink-soft);
		max-width: 30rem;
	}
	.readlink {
		display: inline-block;
		margin-top: 1.6rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--accent-ink);
		border-bottom: 1.5px solid color-mix(in srgb, var(--accent) 35%, transparent);
		padding-bottom: 2px;
		transition: border-color 0.2s ease;
	}
	.featured:hover .readlink {
		border-color: var(--accent);
	}

	/* ---- Meta line ---- */
	.meta {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.82rem;
		color: var(--ink-faint);
		margin: 0;
	}
	.meta__dot {
		opacity: 0.5;
	}
	.meta__tag {
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-size: 0.68rem;
		color: var(--accent-ink);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		padding: 0.2rem 0.5rem;
		border-radius: 999px;
	}

	/* ---- Rule ---- */
	.rule {
		max-width: 72rem;
		margin: 4.5rem auto 0;
		border-top: 1px solid var(--rule-soft);
	}

	/* ---- Grid ---- */
	.grid {
		max-width: 72rem;
		margin: 0 auto;
		padding: 3.5rem 2rem 0;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 3rem 3.5rem;
	}

	/* ---- Empty ---- */
	.empty {
		max-width: 72rem;
		margin: 0 auto;
		padding: 2rem;
		text-align: center;
	}
	.empty p {
		color: var(--ink-soft);
		font-size: 1.1rem;
	}
	.empty a {
		display: inline-block;
		margin-top: 0.75rem;
		color: var(--accent-ink);
		font-weight: 600;
		text-decoration: none;
	}

	@media (max-width: 820px) {
		.featured {
			grid-template-columns: 1fr;
			gap: 1.75rem;
		}
		.grid {
			grid-template-columns: 1fr;
			gap: 2.75rem;
		}
	}
	@media (max-width: 640px) {
		.masthead,
		.featured,
		.grid,
		.rule {
			padding-left: 1.25rem;
			padding-right: 1.25rem;
		}
		.masthead {
			padding-top: 3.5rem;
		}
	}
</style>
