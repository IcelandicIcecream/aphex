<script lang="ts">
	import { page as appPage } from '$app/state';

	type Props = {
		/** Plain (stega-cleaned) title — the site name is appended automatically. */
		title: string;
		description?: string;
		/** OG/Twitter image URL (relative or absolute). */
		image?: string | null;
		type?: 'website' | 'article';
		noindex?: boolean;
		publishedTime?: string;
		modifiedTime?: string;
		authorName?: string;
		siteName?: string;
	};

	let {
		title,
		description = '',
		image = null,
		type = 'website',
		noindex = false,
		publishedTime,
		modifiedTime,
		authorName,
		siteName
	}: Props = $props();

	// Default the site name from the siteSettings singleton (loaded in the (site)
	// layout, merged into page data) so the wordmark and <head> stay in sync.
	const pageData = $derived(appPage.data as { settings?: { title?: string } | null });
	const site = $derived(siteName || pageData.settings?.title || 'Aphex');

	const origin = $derived(appPage.url.origin);
	const canonical = $derived(origin + appPage.url.pathname);
	const absImage = $derived(image ? (image.startsWith('http') ? image : origin + image) : null);
	const fullTitle = $derived(title ? `${title} · ${site}` : site);

	// Article structured data — escape "<" so JSON can't break out of the script tag.
	const jsonLd = $derived(
		type === 'article'
			? JSON.stringify({
					'@context': 'https://schema.org',
					'@type': 'BlogPosting',
					headline: title,
					description: description || undefined,
					image: absImage || undefined,
					datePublished: publishedTime || undefined,
					dateModified: modifiedTime || publishedTime || undefined,
					author: authorName ? { '@type': 'Person', name: authorName } : undefined,
					publisher: { '@type': 'Organization', name: site },
					mainEntityOfPage: { '@type': 'WebPage', '@id': canonical }
				}).replace(/</g, '\\u003c')
			: null
	);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	{#if description}<meta name="description" content={description} />{/if}
	<link rel="canonical" href={canonical} />
	{#if noindex}<meta name="robots" content="noindex, nofollow" />{/if}

	<meta property="og:site_name" content={site} />
	<meta property="og:type" content={type} />
	<meta property="og:title" content={title || site} />
	{#if description}<meta property="og:description" content={description} />{/if}
	<meta property="og:url" content={canonical} />
	{#if absImage}<meta property="og:image" content={absImage} />{/if}

	<meta name="twitter:card" content={absImage ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={title || site} />
	{#if description}<meta name="twitter:description" content={description} />{/if}
	{#if absImage}<meta name="twitter:image" content={absImage} />{/if}

	{#if type === 'article'}
		{#if publishedTime}<meta property="article:published_time" content={publishedTime} />{/if}
		{#if modifiedTime}<meta property="article:modified_time" content={modifiedTime} />{/if}
		{#if authorName}<meta property="article:author" content={authorName} />{/if}
	{/if}
</svelte:head>

<!--
	JSON-LD lives in the body, not <svelte:head>: `{@html}` inside <svelte:head>
	crashes Svelte 5 hydration. application/ld+json is never executed and crawlers
	read it anywhere in the document, so body placement is fine.
-->
{#if jsonLd}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
{/if}
