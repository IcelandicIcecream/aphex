<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import { stegaClean, usePreview } from '@aphexcms/visual-editing';
	import type { SiteSettings } from '$lib/generated-types';
	import { resolveSiteTemplate } from '$lib/site/templates';
	import '$lib/site/templates/shells.css';

	let { data, children } = $props();
	const ve = usePreview();

	const settings = $derived(ve.live<SiteSettings>(data.settings!, { type: 'siteSettings' }));
	// Draft preview strings carry invisible stega metadata. Strip it before matching
	// the template registry, otherwise every in-editor selection falls back to default.
	const template = $derived(resolveSiteTemplate(stegaClean(settings?.template ?? '')));
	const TemplateShell = $derived(template.component);
	const siteTitle = $derived(settings?.title || 'Aphex');
	const tagline = $derived(settings?.tagline || 'Field notes and dispatches from the studio.');
	const nav = $derived(settings?.nav ?? []);
	const social = $derived(settings?.social ?? []);
	const logo = $derived(ve.image(settings?.logo));
	const favicon = $derived(ve.image(settings?.favicon));
	const logoUrl = $derived(logo.src ?? data.logoUrl);
	const faviconUrl = $derived(favicon.src ?? data.faviconUrl);
	const isAuthed = $derived(data.isAuthed);
	// Header logo height is editor-controlled (Site Settings → Branding); the footer
	// logo tracks it at a slightly smaller size.
	const logoHeight = $derived(settings?.logoHeight ?? 28);
	const footerLogoHeight = $derived(Math.round(logoHeight * 0.78));

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

	// In the editor iframe the article sits in a narrow panel, so full-bleed (100vw)
	// covers/images overflow it — cap them to the content column. Key this on "am I
	// inside the editor iframe", NOT on `?aphex-preview`: the Published perspective
	// strips that marker (to render the real page), so keying on it made the cover
	// full-bleed under Published and capped under Draft — the same image, two paddings.
	// `window.top` check is client-only (a brief first-paint reflow on the published
	// iframe is acceptable); `?aphex-preview` keeps it server-correct for Draft.
	const isFramed = typeof window !== 'undefined' && window.self !== window.top;
	const isPreview = $derived(page.url.searchParams.has('aphex-preview') || isFramed);

	const year = new Date().getFullYear();
</script>

<svelte:head>
	{#if faviconUrl}<link rel="icon" href={faviconUrl} />{/if}
</svelte:head>

<div class="blog-shell site-template--{template.id}" class:is-preview={isPreview}>
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

	<TemplateShell
		{siteTitle}
		{tagline}
		{nav}
		{social}
		{logoUrl}
		{logoHeight}
		{footerLogoHeight}
		{year}
	>
		{@render children()}
	</TemplateShell>
</div>

<style>
	.blog-shell {
		/* Template shells use a shared baseline; individual templates may override it. */
		--paper: #ffffff;
		--ink: #15171a;
		--accent: #3eb0ef;
		--accent-contrast: #ffffff;
		--font-display: 'Inter', system-ui, -apple-system, sans-serif;
		--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
		--base-size: 18px;
		--heading-weight: 700;
		--content-width: 720px;
		--radius-base: 8px;

		--paper-raised: color-mix(in srgb, var(--ink) 2%, var(--paper));
		--ink-soft: color-mix(in srgb, var(--ink) 58%, var(--paper));
		--ink-faint: color-mix(in srgb, var(--ink) 38%, var(--paper));
		--rule: color-mix(in srgb, var(--ink) 12%, transparent);
		--rule-soft: color-mix(in srgb, var(--ink) 7%, transparent);
		--accent-ink: color-mix(in srgb, var(--accent) 82%, var(--ink));

		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--paper);
		color: var(--ink);
		font-family: var(--font-sans);
		font-size: var(--base-size);
		font-feature-settings: 'cv05', 'ss01';
		-webkit-font-smoothing: antialiased;
		text-rendering: optimizeLegibility;
	}

	.blog-shell :global(h1),
	.blog-shell :global(h2),
	.blog-shell :global(h3),
	.blog-shell :global(h4) {
		font-family: var(--font-display);
		font-weight: var(--heading-weight);
	}

	/* In preview, neutralise full-bleed so covers/inline images stay within the panel. */
	.blog-shell.is-preview :global(.cover),
	.blog-shell.is-preview :global(.blog-figure) {
		width: 100%;
		max-width: 100%;
		margin-left: 0;
		transform: none;
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
	.blog-logo {
		height: 1.7rem;
		width: auto;
		display: block;
	}
	.blog-logo--footer {
		height: 1.4rem;
		margin-bottom: 0.55rem;
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

	/* ---- Minimal Index shell ---- */
	.index-layout {
		min-height: 100vh;
		display: grid;
		grid-template-columns: minmax(15rem, 22rem) minmax(0, 1fr);
	}
	.index-rail {
		position: sticky;
		top: 0;
		height: 100vh;
		display: flex;
		flex-direction: column;
		padding: 2.25rem;
		border-right: 1px solid var(--rule-soft);
		background: var(--paper-raised);
	}
	.index-wordmark {
		display: inline-flex;
		align-items: center;
		width: fit-content;
		font-family: var(--font-display);
		font-size: 1.45rem;
		font-weight: 700;
		letter-spacing: -0.045em;
		color: var(--ink);
		text-decoration: none;
	}
	.index-wordmark span {
		color: var(--accent);
	}
	.index-logo {
		width: auto;
		display: block;
	}
	.index-tagline {
		max-width: 16rem;
		margin: 1.15rem 0 0;
		color: var(--ink-soft);
		font-size: 0.9rem;
		line-height: 1.55;
	}
	.index-nav {
		display: grid;
		gap: 0.7rem;
		margin-top: 3.5rem;
	}
	.index-nav a {
		color: var(--ink-soft);
		font-size: 0.92rem;
		font-weight: 600;
		letter-spacing: 0.015em;
		text-decoration: none;
		transition:
			color 0.18s ease,
			transform 0.18s ease;
	}
	.index-nav a:hover {
		color: var(--accent-ink);
		transform: translateX(0.2rem);
	}
	.index-rail__meta {
		margin-top: auto;
		color: var(--ink-faint);
		font-size: 0.73rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.index-main {
		min-width: 0;
		padding-bottom: 4rem;
	}

	/* ---- Brutalist Ledger shell ---- */
	.site-template--brutalist-ledger {
		--paper: #f6f5f0;
		--ink: #151515;
		--accent: #ff4f00;
		--accent-contrast: #f6f5f0;
		--font-display: 'Helvetica Neue', Helvetica, Arial, sans-serif;
		--font-sans: 'Helvetica Neue', Helvetica, Arial, sans-serif;
		--radius-base: 0px;
		--paper-raised: #ecebe5;
		--ink-soft: #4e4e4b;
		--ink-faint: #73736e;
		--rule: #c7c6bf;
		--rule-soft: #ddddd6;
		--accent-ink: #d63f00;
	}
	.brutalist-layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
	.brutalist-wordmark {
		display: flex;
		align-items: center;
		min-height: 3.5rem;
		padding: 0.75rem 1rem;
		color: var(--ink);
		font-family: var(--font-display);
		font-size: 0.82rem;
		font-weight: 600;
		letter-spacing: -0.025em;
		line-height: 1;
		text-decoration: none;
	}
	.brutalist-logo {
		width: auto;
		max-width: 12rem;
		object-fit: contain;
	}
	.brutalist-header {
		display: grid;
		grid-template-columns: minmax(10rem, 1fr) auto;
		align-items: center;
		border-bottom: 1px solid var(--rule);
	}
	.brutalist-nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1.25rem;
		padding: 0.75rem 1rem;
	}
	.brutalist-nav a {
		color: var(--ink);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		text-decoration: none;
	}
	.brutalist-nav a:hover {
		color: var(--accent-ink);
		text-decoration: underline;
		text-underline-offset: 0.24em;
	}
	.brutalist-main {
		flex: 1;
		min-width: 0;
		padding-bottom: 5rem;
	}
	.brutalist-stamp {
		padding: 0.65rem 1rem;
		border-bottom: 1px solid var(--rule-soft);
		color: var(--ink-faint);
		font-size: 0.68rem;
		letter-spacing: 0.03em;
	}
	.brutalist-footer {
		display: flex;
		justify-content: space-between;
		gap: 2rem;
		padding: 1rem;
		border-top: 1px solid var(--rule);
	}
	.brutalist-footer span {
		max-width: 26rem;
		color: var(--ink-faint);
		font-size: 0.68rem;
		line-height: 1.4;
	}
	.site-template--brutalist-ledger :global(.masthead) {
		max-width: none;
		padding: clamp(4rem, 11vw, 10rem) 1rem clamp(2.5rem, 6vw, 5rem);
		border-bottom: 1px solid var(--rule);
	}
	.site-template--brutalist-ledger :global(.masthead h1) {
		max-width: 14ch;
		font-family: var(--font-display);
		font-size: clamp(3rem, 8vw, 7.5rem);
		font-weight: 400;
		letter-spacing: -0.075em;
		line-height: 0.84;
	}
	.site-template--brutalist-ledger :global(.masthead__sub) {
		max-width: 25rem;
		margin-left: min(42vw, 34rem);
		font-size: 0.9rem;
	}
	.site-template--brutalist-ledger :global(.eyebrow) {
		color: var(--ink-faint);
		font-size: 0.65rem;
		font-weight: 500;
		letter-spacing: 0.02em;
	}
	.site-template--brutalist-ledger :global(.featured) {
		max-width: none;
		grid-template-columns: minmax(0, 1.45fr) minmax(16rem, 0.55fr);
		gap: 1rem;
		padding: 1rem;
	}
	.site-template--brutalist-ledger :global(.featured__media) {
		border-radius: 0;
		aspect-ratio: 16 / 10;
	}
	.site-template--brutalist-ledger :global(.featured__body) {
		align-self: end;
		padding: 0 0 0.5rem;
	}
	.site-template--brutalist-ledger :global(.featured__body h2) {
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 3vw, 3.4rem);
		font-weight: 400;
		letter-spacing: -0.06em;
		line-height: 0.92;
	}
	.site-template--brutalist-ledger :global(.grid) {
		max-width: none;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
		padding: 1rem;
	}
	.site-template--brutalist-ledger :global(.rule) {
		max-width: none;
		margin: 4rem 1rem 0;
	}
	/* ---- Hero image, Brutalist: hard edges, hairline frame, no rounding ---- */
	.site-template--brutalist-ledger :global(.masthead__media) {
		border-radius: 0;
		border: 1px solid var(--ink);
		background: var(--paper-raised);
	}
	.site-template--brutalist-ledger :global(.masthead--split) {
		gap: 1rem;
		align-items: stretch;
	}
	.site-template--brutalist-ledger :global(.masthead--split .masthead__sub),
	.site-template--brutalist-ledger :global(.masthead--banner .masthead__sub) {
		margin-left: 0;
	}
	.site-template--brutalist-ledger :global(.masthead--banner .masthead__media) {
		aspect-ratio: 21 / 8;
	}
	.site-template--brutalist-ledger :global(.masthead--overlay) {
		margin: 0;
		border-radius: 0;
		border-bottom: 1px solid var(--ink);
	}
	.site-template--brutalist-ledger :global(.masthead--overlay .masthead__media) {
		border: 0;
	}

	/* ---- Hero image, Minimal Index: restrained, small radius, hairline ---- */
	.site-template--minimal-index :global(.masthead) {
		max-width: 56rem;
		margin-left: 0;
		padding-top: 3.5rem;
	}
	.site-template--minimal-index :global(.masthead__media) {
		border-radius: 6px;
		border: 1px solid var(--rule-soft);
	}
	.site-template--minimal-index :global(.masthead--split) {
		gap: 2.5rem;
	}
	.site-template--minimal-index :global(.masthead--overlay) {
		border-radius: 8px;
		min-height: min(60vh, 26rem);
	}
	.site-template--minimal-index :global(.masthead--overlay .masthead__media) {
		border: 0;
	}

	@media (max-width: 640px) {
		.blog-header__inner,
		.blog-footer__inner {
			padding-left: 1.25rem;
			padding-right: 1.25rem;
		}
		.blog-header__inner {
			gap: 1rem;
		}
		.blog-wordmark {
			flex-shrink: 0;
		}
		/* Let the nav take the remaining width and scroll instead of overflowing
		   the page or crushing the wordmark when there are several links. */
		.blog-nav {
			flex-wrap: nowrap;
			gap: 1.1rem;
			min-width: 0;
			overflow-x: auto;
			scrollbar-width: none;
			-webkit-overflow-scrolling: touch;
		}
		.blog-nav::-webkit-scrollbar {
			display: none;
		}
		.blog-nav a {
			white-space: nowrap;
		}
		.index-layout {
			display: block;
		}
		.index-rail {
			position: static;
			height: auto;
			padding: 1.35rem 1.25rem;
			border-right: 0;
			border-bottom: 1px solid var(--rule-soft);
		}
		.index-tagline,
		.index-rail__meta {
			display: none;
		}
		.index-nav {
			display: flex;
			gap: 1rem;
			margin-top: 1.25rem;
			overflow-x: auto;
		}
		.index-nav a {
			white-space: nowrap;
		}
		.brutalist-header {
			display: block;
		}
		.brutalist-wordmark {
			min-height: 3.5rem;
			border-bottom: 1px solid var(--rule-soft);
		}
		.brutalist-nav {
			gap: 0.8rem 1.1rem;
			padding-top: 0.7rem;
			padding-bottom: 0.7rem;
		}
		.brutalist-footer {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.35rem;
		}
		.site-template--brutalist-ledger :global(.masthead) {
			padding-top: 4rem;
			padding-bottom: 2.5rem;
		}
		.site-template--brutalist-ledger :global(.masthead__sub) {
			margin-left: 0;
		}
		.site-template--brutalist-ledger :global(.featured),
		.site-template--brutalist-ledger :global(.grid) {
			grid-template-columns: 1fr;
		}
		.site-template--brutalist-ledger :global(.featured__body) {
			padding-bottom: 0;
		}
	}
</style>
