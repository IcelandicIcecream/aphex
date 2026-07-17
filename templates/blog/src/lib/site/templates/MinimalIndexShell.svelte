<script lang="ts">
	import type { SiteShellProps } from './types';
	import { Menu, X } from '@lucide/svelte';

	let { children, siteTitle, tagline, nav, logoUrl, logoHeight, year }: SiteShellProps = $props();
	let navOpen = $state(false);
</script>

<div class="index-layout">
	<aside class="index-rail">
		<div class="index-rail__header">
			<a href="/blog" class="index-wordmark">
				{#if logoUrl}
					<img src={logoUrl} alt={siteTitle} class="index-logo" style="height: {logoHeight}px" />
				{:else}
					{siteTitle}<span>.</span>
				{/if}
			</a>
			<button
				type="button"
				class="index-nav-toggle"
				aria-expanded={navOpen}
				aria-controls="index-primary-nav"
				onclick={() => (navOpen = !navOpen)}
			>
				{#if navOpen}<X size={18} />{:else}<Menu size={18} />{/if}
				<span>{navOpen ? 'Close' : 'Menu'}</span>
			</button>
		</div>
		<p class="index-tagline">{tagline}</p>
		<nav
			id="index-primary-nav"
			class:open={navOpen}
			class="index-nav"
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
		<div class="index-rail__meta">© {year} {siteTitle}</div>
	</aside>
	<main class="index-main">
		{@render children?.()}
	</main>
</div>
