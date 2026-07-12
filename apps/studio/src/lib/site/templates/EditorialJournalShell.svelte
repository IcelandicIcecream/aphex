<script lang="ts">
	import type { SiteShellProps } from './types';
	import { Menu, X } from '@lucide/svelte';

	let {
		children,
		siteTitle,
		tagline,
		nav,
		social,
		logoUrl,
		logoHeight,
		footerLogoHeight,
		year
	}: SiteShellProps = $props();

	let navOpen = $state(false);
</script>

<header class="blog-header">
	<div class="blog-header__inner">
		<a href="/blog" class="blog-wordmark">
			{#if logoUrl}
				<img src={logoUrl} alt={siteTitle} class="blog-logo" style="height: {logoHeight}px" />
			{:else}
				{siteTitle}<span class="blog-wordmark__dot">.</span>
			{/if}
		</a>
		{#if nav.length > 0}
			<button
				type="button"
				class="blog-nav-toggle"
				aria-expanded={navOpen}
				aria-controls="blog-primary-nav"
				onclick={() => (navOpen = !navOpen)}
			>
				{#if navOpen}<X size={18} />{:else}<Menu size={18} />{/if}
				<span>{navOpen ? 'Close' : 'Menu'}</span>
			</button>
			<nav
				id="blog-primary-nav"
				class:open={navOpen}
				class="blog-nav"
				aria-label="Primary navigation"
			>
				{#each nav as link}
					<a
						href={link.url}
						target={link.newTab ? '_blank' : undefined}
						rel={link.newTab ? 'noopener noreferrer' : undefined}>{link.label}</a
					>
				{/each}
			</nav>
		{/if}
	</div>
</header>

<main class="journal-main">
	{@render children?.()}
</main>

<footer class="blog-footer">
	<div class="blog-footer__inner">
		<div class="blog-footer__brand">
			{#if logoUrl}
				<img
					src={logoUrl}
					alt={siteTitle}
					class="blog-logo blog-logo--footer"
					style="height: {footerLogoHeight}px"
				/>
			{:else}
				<span class="blog-wordmark blog-wordmark--sm"
					>{siteTitle}<span class="blog-wordmark__dot">.</span></span
				>
			{/if}
			<p>{tagline}</p>
			{#if social.length > 0}
				<div class="blog-footer__social">
					{#each social as link}
						{#if link.url}
							<a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>
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
