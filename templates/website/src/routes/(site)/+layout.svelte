<script lang="ts">
	/**
	 * The public site's shell: header, page, footer.
	 *
	 * Styling is Tailwind over the shadcn tokens from `@aphexcms/ui` — the same
	 * palette the admin uses, so `bg-background` / `text-muted-foreground` and the
	 * shadcn components all work here with nothing to keep in sync by hand.
	 *
	 * ## Theme
	 *
	 * Light by default, dark available — the same choice Payload's website
	 * template makes, down to putting the selector in the footer rather than the
	 * header. `defaultMode="light"` matters: mode-watcher's own default is
	 * `system`, which would open the site in dark for anyone whose OS is set that
	 * way, and a starter should look the same for everyone on first load.
	 *
	 * ## Why the header knows about the hero
	 *
	 * When a page opens with a high-impact hero, the hero pulls itself up under the
	 * header and the header has to render light-on-dark to stay legible on it. The
	 * hero renders inside `{@render children()}`, well below the header in the DOM,
	 * so it can't tell the header anything directly.
	 *
	 * Payload solves this with a React context the hero writes to on mount, which
	 * costs a client round trip and a flash of the wrong theme. Reading the page's
	 * own loaded data instead (`page.data`, which SvelteKit merges from every
	 * `load` in the route) decides it during SSR: correct in the first paint, no
	 * store, no context, no prop drilling through the renderers.
	 */
	import { ModeWatcher } from 'mode-watcher';
	import { page } from '$app/state';
	import AdminBar from '$lib/components/AdminBar.svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const settings = $derived(data.settings);
	const siteName = $derived(settings?.title || 'Aphex');
	const faviconUrl = $derived(settings?.favicon?.asset?.url ?? null);

	// A high-impact hero pulls itself up under the header and is dark, so the
	// header has to switch to the dark region palette to stay legible on it.
	const headerTheme = $derived(page.data.page?.hero?.variant === 'highImpact' ? 'dark' : null);

	/**
	 * What the admin bar offers to edit.
	 *
	 * Read from `page.data` for the same reason the header theme is: the routes
	 * already loaded the document, so asking them to also announce it would be
	 * duplicate plumbing. A route that renders neither (the archive, search) gets
	 * `null` and the bar simply omits the edit link.
	 */
	const editingDoc = $derived.by(() => {
		const data = page.data as { page?: { id?: string }; post?: { id?: string } };
		if (data.post?.id) return { id: data.post.id, type: 'post', label: 'post' };
		if (data.page?.id) return { id: data.page.id, type: 'page', label: 'page' };
		return null;
	});
</script>

<svelte:head>
	<!-- Page-level titles override this; it's the fallback for anything that
	     doesn't set its own. -->
	<title>{siteName}</title>
	{#if settings?.description}
		<meta name="description" content={settings.description} />
	{/if}
	<!-- The favicon from site settings, when one has been uploaded. Same
	     conditional-override shape the admin layout uses, so the public tab and
	     the studio tab show the same icon; with nothing uploaded the bundled
	     default in `app.html` stands. -->
	{#if faviconUrl}<link rel="icon" href={faviconUrl} />{/if}
</svelte:head>

<ModeWatcher defaultMode="light" />

<div class="site bg-background text-foreground flex min-h-screen flex-col">
	{#if data.signedIn}
		<AdminBar email={data.email} doc={editingDoc} />
	{/if}

	<Header
		{siteName}
		logo={settings?.logo}
		logoHeight={settings?.logoHeight ?? 28}
		navItems={data.header?.navItems ?? []}
		theme={headerTheme}
	/>

	<main class="flex-1">
		{@render children?.()}
	</main>

	<Footer
		{siteName}
		navItems={data.footer?.navItems ?? []}
		note={data.footer?.note}
		signedIn={data.signedIn}
	/>
</div>

<style>
	/*
	 * A white page, not the admin's off-white one.
	 *
	 * `@aphexcms/ui` sets `--background` to a very light grey, which is right
	 * behind an admin full of panels and cards and wrong behind an article. This
	 * overrides only that one token, and only for the public site: custom
	 * properties resolve from the nearest ancestor that defines them, so
	 * everything inside `.site` reads white while the admin is untouched.
	 *
	 * `:global(.dark) .site` puts the dark background back when the reader has
	 * chosen dark from the footer — without it, dark mode would render dark text
	 * on this white.
	 */
	.site {
		--background: #ffffff;
		--card: #ffffff;

		/*
		 * Black, not the Aphex orange the shared `@aphexcms/ui` palette ships.
		 * That orange is the *product's* brand, and a starter site is not the
		 * product — inheriting it would put someone else's brand on every button
		 * of every site scaffolded from this template. Black is the neutral
		 * default: correct on its own, and one token to change once you have a
		 * brand colour of your own.
		 */
		--primary: oklch(0.18 0 0);
		--primary-foreground: #ffffff;
		--ring: oklch(0.18 0 0);
	}
	:global(.dark) .site {
		--background: oklch(0.2188 0.0148 248.507);
		--card: oklch(0.2617 0.0197 254.8441);
		/* Inverted, for the same reason: white on dark, still not the brand orange. */
		--primary: oklch(0.97 0 0);
		--primary-foreground: oklch(0.18 0 0);
		--ring: oklch(0.85 0 0);
	}

	/*
	 * `body` has to be painted too: `@aphexcms/ui` colours it for the admin, and a
	 * background on the shell alone would leave that showing wherever the shell
	 * doesn't reach — below the fold on a short page, or behind overscroll.
	 *
	 * `:has(.site)` scopes it to the moments a public page is actually mounted.
	 * This stylesheet stays loaded after a client-side navigation into /admin, and
	 * an unqualified `:global(body)` rule would pin the admin's background too and
	 * break its dark mode.
	 */
	:global(body:has(.site)) {
		background: #ffffff;
	}
	:global(.dark body:has(.site)) {
		background: oklch(0.2188 0.0148 248.507);
	}
</style>
