<script lang="ts">
	import { Image } from '@aphexcms/cms-core/image';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const settings = $derived(data.settings);
	const siteName = $derived(settings?.title || 'Aphex');
	const hasLogo = $derived(!!settings?.logo?.asset?.url);
	// Editor-controlled, with the schema's own default as the fallback so a
	// settings row that predates the field still renders sensibly.
	const logoHeight = $derived(settings?.logoHeight ?? 40);
</script>

<svelte:head>
	<!-- Page-level titles override this; it is the fallback for anything that
	     doesn't set its own. -->
	<title>{siteName}</title>
	{#if settings?.description}
		<meta name="description" content={settings.description} />
	{/if}
</svelte:head>

<div class="site-shell">
	<header class="site-header">
		<a class="site-header__brand" href="/">
			{#if hasLogo}
				<Image
					value={settings?.logo}
					alt={siteName}
					sizes="{logoHeight * 6}px"
					priority
					style="height: {logoHeight}px"
				/>
			{:else}
				<span class="site-header__name">{siteName}</span>
			{/if}
		</a>
	</header>

	{@render children?.()}
</div>

<style>
	/*
	 * The public site's design tokens and page paint, owned by the (site) group so
	 * every public route gets them — a token block living in one page's <style>
	 * leaves any other route loaded directly with unresolved vars.
	 *
	 * Aphex's look: a white page, near-black ink, one accent used sparingly, and
	 * typography carrying the hierarchy. Committed to a single light treatment on
	 * purpose — a starter that hedges between two themes teaches neither.
	 */
	/* Token *definitions* are safe globally: nothing in the admin reads --paper or
	   --ink, and they must live above body for the paint rule below to see them —
	   custom properties inherit down, never up. It was the paint that leaked, not
	   these. */
	:global(html) {
		--paper: #ffffff;
		--ink: #111111;
		--smoke: #6b6b6b;
		--mist: #bdbdbd;
		--accent: #ff7a22;
		--line: color-mix(in srgb, var(--ink) 14%, transparent);
		--gutter: clamp(1.5rem, 5vw, 6rem);
		--mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
	}

	.site-header {
		max-width: 78rem;
		margin: 0 auto;
		padding: 1.75rem var(--gutter) 0;
	}
	.site-header__brand {
		display: inline-block;
		text-decoration: none;
		color: var(--ink);
	}
	.site-header__name {
		font-size: 0.95rem;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	/* Cap the logo's height and let width follow, so a wide lockup and a square
	   mark both sit on the same baseline. */
	.site-header__brand :global(img) {
		display: block;
		width: auto;
	}

	/*
	 * The page paint has to land on `body`: @aphexcms/ui colours body with
	 * `bg-background` for the admin, and a background only on the shell would
	 * leave that showing wherever the shell doesn't reach.
	 *
	 * But `:global` rules are document-wide once this stylesheet is loaded, and it
	 * stays loaded after a client-side navigation into /admin — an unqualified
	 * `:global(body) { color: … }` therefore pinned the admin's text colour too and
	 * broke its dark mode. `:has(.site-shell)` limits it to the moments a public
	 * page is actually mounted, and unsets itself on the way out.
	 */
	:global(body:has(.site-shell)) {
		background: var(--paper);
		color: var(--ink);
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			sans-serif;
		-webkit-font-smoothing: antialiased;
	}
</style>
