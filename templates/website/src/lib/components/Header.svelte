<script lang="ts">
	/**
	 * The site header: the logo (or site name) from `siteSettings`, the nav from
	 * the `header` singleton, and search.
	 *
	 * Both singletons are read once in `(site)/+layout.server.ts`, so every public
	 * route gets them without repeating the query.
	 *
	 * ## How it sits over a full-bleed hero
	 *
	 * The header is in **normal flow** — not fixed, not absolute — and a
	 * high-impact hero pulls itself up underneath it with a negative top margin
	 * (see `HighImpact.svelte`). Only `z-20` keeps it on top. This is how Payload's
	 * website template does it, and it beats positioning the header out of flow: an
	 * absolute header has to be undone on every page that *doesn't* have a
	 * full-bleed hero, and a sticky one peels off the hero mid-scroll and then
	 * floats, white-on-white, over the article below.
	 *
	 * `theme` switches the region palette rather than any individual colour. The
	 * layout passes `'dark'` when the page opens with a high-impact hero; the
	 * `[data-theme='dark']` block in `app.css` redefines the shadcn tokens for this
	 * subtree, so `text-muted-foreground` and friends resolve to their
	 * light-on-dark values with no conditional classes anywhere below.
	 */
	import { Image } from '@aphexcms/cms-core/image';
	import { Search, Menu, X } from '@lucide/svelte';
	import CMSLink from './CMSLink.svelte';
	import type { CMSLinkValue } from '$lib/utils/link';
	import type { ImageValue } from '@aphexcms/cms-core/image';

	interface Props {
		siteName: string;
		logo?: ImageValue | null;
		logoHeight?: number;
		navItems?: CMSLinkValue[];
		/** `'dark'` renders the header light-on-dark, for sitting over a hero image. */
		theme?: 'dark' | null;
	}

	let { siteName, logo, logoHeight = 28, navItems = [], theme = null }: Props = $props();

	let open = $state(false);
</script>

<!-- `text-foreground` is re-applied here for the same reason it is on the hero:
     `color` inherits as an already-computed value, so switching the region's
     tokens only takes effect where the class is set again. -->
<header class="text-foreground relative z-20" data-theme={theme}>
	<div class="container flex h-24 items-center justify-between gap-6">
		<a
			href="/"
			class="text-foreground flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight"
			aria-label={siteName}
		>
			{#if logo?.asset?.url}
				<!--
					The logo is stored dark, so it needs inverting wherever the background
					behind it is dark. Two independent things can make it so, and the
					invert has to answer both:

					  - a dark *region* — a high-impact hero the header floats on, which is
					    dark whatever the site's colour mode is;
					  - the site's own dark mode.

					Hence the branch rather than a plain `dark:invert`. Inside a dark
					region the background is already dark, so it inverts unconditionally;
					anywhere else it inverts only when the site is in dark mode. Applying
					both at once would double-invert in a dark hero on a dark site and put
					the logo back to black-on-black.

					This assumes what the field's description asks for: a monochrome logo
					on a transparent background, authored dark. On one of those `invert` is
					exactly right; on a full-colour logo it is exactly wrong. (An opaque
					logo — a JPG, say — inverts to a solid rectangle, so the transparency
					is the part that matters.)
				-->
				<Image
					value={logo}
					alt={siteName}
					sizes="{logoHeight * 6}px"
					priority
					style="height: {logoHeight}px; width: auto;"
					class={theme === 'dark' ? 'invert' : 'dark:invert'}
				/>
			{:else}
				{siteName}
			{/if}
		</a>

		<nav class="hidden items-center gap-7 text-sm md:flex">
			{#each navItems as link, i (i)}
				<CMSLink
					{link}
					appearance="link"
					class="text-muted-foreground hover:text-foreground transition-colors"
				/>
			{/each}
			<a
				href="/search"
				class="text-muted-foreground hover:text-foreground transition-colors"
				aria-label="Search"
			>
				<Search class="size-[18px]" />
			</a>
		</nav>

		<button
			type="button"
			class="text-foreground hover:bg-foreground/10 cursor-pointer rounded-md p-2 transition-colors md:hidden"
			aria-expanded={open}
			aria-label={open ? 'Close menu' : 'Open menu'}
			onclick={() => (open = !open)}
		>
			{#if open}<X class="size-5" />{:else}<Menu class="size-5" />{/if}
		</button>
	</div>

	{#if open}
		<!-- The panel renders the same links rather than duplicating them into a
		     second data source. Positioned absolutely so opening it can't push the
		     hero down — the hero's negative margin is measured against a header of a
		     known, fixed height. -->
		<nav class="bg-background absolute inset-x-0 top-full border-y md:hidden">
			<div class="container flex flex-col py-2 text-sm">
				{#each navItems as link, i (i)}
					<CMSLink
						{link}
						appearance="link"
						class="hover:bg-muted rounded-md px-2 py-2.5 transition-colors"
					/>
				{/each}
				<a
					href="/search"
					class="hover:bg-muted rounded-md px-2 py-2.5"
					onclick={() => (open = false)}
				>
					Search
				</a>
			</div>
		</nav>
	{/if}
</header>
