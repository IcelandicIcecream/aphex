<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { page } from '$app/state';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const settings = $derived(data.settings);
	const siteTitle = $derived(settings?.title || 'Aphex');
	const tagline = $derived(settings?.tagline || 'Field notes and dispatches from the studio.');
	const nav = $derived(settings?.nav ?? []);
	const social = $derived(settings?.social ?? []);
	const isAuthed = $derived(data.isAuthed);

	// Each public route returns its own doc (post/page/author/tag). Pull it from
	// the merged page data to deep-link the edit bar straight into the editor:
	// /admin?docType=<schema>&docId=<id>.
	const TYPE_LABEL: Record<string, string> = {
		blog_post: 'post',
		page: 'page',
		author: 'author',
		tag: 'tag'
	};
	type EditableDoc = { id: string; _meta?: { type?: string } };
	const editDoc = $derived.by(() => {
		const d = page.data as {
			post?: EditableDoc;
			page?: EditableDoc;
			author?: EditableDoc;
			tag?: EditableDoc;
		};
		const doc = d.post ?? d.page ?? d.author ?? d.tag;
		const type = doc?._meta?.type;
		if (doc?.id && type) return { id: doc.id, type, label: TYPE_LABEL[type] ?? 'document' };
		return null;
	});

	const year = new Date().getFullYear();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Inter:wght@400;450;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="blog-shell">
	{#if isAuthed}
		<div class="edit-bar">
			<span class="edit-bar__dot"></span>
			{#if editDoc}
				<span>You're signed in</span>
				<a href="/admin?docType={editDoc.type}&docId={editDoc.id}">Edit this {editDoc.label} →</a>
			{:else}
				<span>You're signed in</span>
				<a href="/admin">Open Studio →</a>
			{/if}
		</div>
	{/if}

	<header class="blog-header">
		<div class="blog-header__inner">
			<a href="/blog" class="blog-wordmark">
				{siteTitle}<span class="blog-wordmark__dot">.</span>
			</a>
			<nav class="blog-nav">
				<a href="/blog">Stories</a>
				{#each nav as link}
					<a
						href={link.url}
						target={link.newTab ? '_blank' : undefined}
						rel={link.newTab ? 'noopener noreferrer' : undefined}>{link.label}</a
					>
				{/each}
			</nav>
		</div>
	</header>

	<main>
		{@render children()}
	</main>

	<footer class="blog-footer">
		<div class="blog-footer__inner">
			<div class="blog-footer__brand">
				<span class="blog-wordmark blog-wordmark--sm"
					>{siteTitle}<span class="blog-wordmark__dot">.</span></span
				>
				<p>{tagline}</p>
				{#if social.length > 0}
					<div class="blog-footer__social">
						{#each social as link}
							{#if link.url}
								<a href={link.url} target="_blank" rel="noopener noreferrer me">{link.label}</a>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
			<div class="blog-footer__meta">
				<span>© {year} {siteTitle}</span>
				<span class="blog-footer__sep">·</span>
				<a href="/admin">Powered by AphexCMS</a>
			</div>
		</div>
	</footer>
</div>

<style>
	.blog-shell {
		--paper: #faf8f3;
		--paper-raised: #ffffff;
		--ink: #1a1813;
		--ink-soft: #6f6a60;
		--ink-faint: #9a958a;
		--rule: rgba(26, 24, 19, 0.1);
		--rule-soft: rgba(26, 24, 19, 0.06);
		--accent: #c8543b;
		--accent-ink: #a63f2b;

		--font-display: 'Fraunces', Georgia, 'Times New Roman', serif;
		--font-sans: 'Inter', system-ui, -apple-system, sans-serif;

		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--paper);
		color: var(--ink);
		font-family: var(--font-sans);
		font-feature-settings: 'cv05', 'ss01';
		-webkit-font-smoothing: antialiased;
		text-rendering: optimizeLegibility;
	}

	main {
		flex: 1;
	}

	/* ---- Edit bar (signed-in only) ---- */
	.edit-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		padding: 0.5rem 1rem;
		background: var(--ink);
		color: var(--paper);
		font-size: 0.8rem;
		font-weight: 500;
	}
	.edit-bar__dot {
		width: 7px;
		height: 7px;
		border-radius: 999px;
		background: #4ade80;
		box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.25);
	}
	.edit-bar a {
		color: var(--paper);
		text-decoration: none;
		font-weight: 600;
		border-bottom: 1.5px solid color-mix(in srgb, var(--accent) 70%, transparent);
		padding-bottom: 1px;
		transition: border-color 0.18s ease;
	}
	.edit-bar a:hover {
		border-color: var(--accent);
	}

	/* ---- Header ---- */
	.blog-header {
		position: sticky;
		top: 0;
		z-index: 40;
		background: color-mix(in srgb, var(--paper) 82%, transparent);
		backdrop-filter: saturate(180%) blur(16px);
		border-bottom: 1px solid var(--rule-soft);
	}
	.blog-header__inner {
		max-width: 72rem;
		margin: 0 auto;
		padding: 1.15rem 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.blog-wordmark {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.4rem;
		letter-spacing: -0.02em;
		color: var(--ink);
		text-decoration: none;
	}
	.blog-wordmark--sm {
		font-size: 1.2rem;
	}
	.blog-wordmark__dot {
		color: var(--accent);
	}
	.blog-nav {
		display: flex;
		align-items: center;
		gap: 1.9rem;
		font-size: 0.875rem;
		font-weight: 500;
	}
	.blog-nav a {
		color: var(--ink-soft);
		text-decoration: none;
		transition: color 0.18s ease;
	}
	.blog-nav a:hover {
		color: var(--ink);
	}
	/* ---- Footer ---- */
	.blog-footer {
		margin-top: 6rem;
		border-top: 1px solid var(--rule-soft);
	}
	.blog-footer__inner {
		max-width: 72rem;
		margin: 0 auto;
		padding: 3rem 2rem;
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		align-items: flex-end;
		justify-content: space-between;
	}
	.blog-footer__brand p {
		margin: 0.55rem 0 0;
		max-width: 24rem;
		color: var(--ink-soft);
		font-size: 0.92rem;
		line-height: 1.6;
	}
	.blog-footer__meta {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.85rem;
		color: var(--ink-faint);
	}
	.blog-footer__meta a {
		color: var(--ink-soft);
		text-decoration: none;
		transition: color 0.18s ease;
	}
	.blog-footer__meta a:hover {
		color: var(--accent-ink);
	}
	.blog-footer__sep {
		opacity: 0.5;
	}

	@media (max-width: 640px) {
		.blog-header__inner,
		.blog-footer__inner {
			padding-left: 1.25rem;
			padding-right: 1.25rem;
		}
		.blog-nav {
			gap: 1.1rem;
		}
	}
</style>
