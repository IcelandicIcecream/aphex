<script lang="ts">
	import type { SiteShellProps } from './types';

	let { children, siteTitle, tagline, nav, logoUrl, logoHeight, year }: SiteShellProps = $props();
</script>

<div class="index-layout">
	<aside class="index-rail">
		<a href="/blog" class="index-wordmark">
			{#if logoUrl}
				<img src={logoUrl} alt={siteTitle} class="index-logo" style="height: {logoHeight}px" />
			{:else}
				{siteTitle}<span>.</span>
			{/if}
		</a>
		<p class="index-tagline">{tagline}</p>
		<nav class="index-nav" aria-label="Primary navigation">
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
