<script lang="ts">
	import type { SiteShellProps } from './types';
	import { Menu, X } from '@lucide/svelte';

	let { children, siteTitle, tagline, nav, logoUrl, logoHeight, year }: SiteShellProps = $props();
	let navOpen = $state(false);
</script>

<div class="brutalist-layout">
	<header class="brutalist-header">
		<a href="/blog" class="brutalist-wordmark">
			{#if logoUrl}
				<img src={logoUrl} alt={siteTitle} class="brutalist-logo" style="height: {logoHeight}px" />
			{:else}
				{siteTitle}
			{/if}
		</a>
		<button
			type="button"
			class="brutalist-nav-toggle"
			aria-expanded={navOpen}
			aria-controls="brutalist-primary-nav"
			onclick={() => (navOpen = !navOpen)}
		>
			{#if navOpen}<X size={18} />{:else}<Menu size={18} />{/if}
			<span>{navOpen ? 'Close' : 'Menu'}</span>
		</button>
		<nav
			id="brutalist-primary-nav"
			class:open={navOpen}
			class="brutalist-nav"
			aria-label="Primary navigation"
		>
			<a href="/blog">Journal</a>
			{#each nav as link}
				<a
					href={link.url}
					target={link.newTab ? '_blank' : undefined}
					rel={link.newTab ? 'noopener noreferrer' : undefined}>{link.label}</a
				>
			{/each}
		</nav>
	</header>
	<main class="brutalist-main">
		<div class="brutalist-stamp">Index / {year}</div>
		{@render children?.()}
	</main>
	<footer class="brutalist-footer">
		<span>{tagline}</span>
		<span>© {year} {siteTitle}</span>
	</footer>
</div>
