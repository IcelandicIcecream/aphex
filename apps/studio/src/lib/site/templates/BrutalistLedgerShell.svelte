<script lang="ts">
	import type { SiteShellProps } from './types';

	let { children, siteTitle, tagline, nav, logoUrl, logoHeight, year }: SiteShellProps = $props();
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
		<nav class="brutalist-nav" aria-label="Primary navigation">
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
