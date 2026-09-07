<script lang="ts">
	/**
	 * The `<head>` for a content page.
	 *
	 * Everything falls back rather than requiring the editor to fill in the SEO
	 * tab: the meta title falls back to the page title, the description to the
	 * excerpt, the social image to the page's own image. An empty SEO tab
	 * therefore still produces correct, complete tags — which is the only way
	 * optional SEO fields stay optional in practice.
	 *
	 * The `seo` object comes from `@aphexcms/plugin-seo`, injected into the
	 * page/post/category schemas by `plugins.ts`.
	 */
	import { page as pageStore } from '$app/state';
	import { control } from '$lib/utils/stega';

	interface SeoValue {
		metaTitle?: string;
		metaDescription?: string;
		ogImage?: { asset?: { url?: string } };
		noIndex?: boolean;
	}

	interface Props {
		seo?: SeoValue | null;
		/** The document's own title, used when no meta title is set. */
		title?: string | null;
		description?: string | null;
		/** The document's own image URL, used when no social image is set. */
		image?: string | null;
		siteName?: string;
		type?: 'website' | 'article';
	}

	let { seo, title, description, image, siteName, type = 'website' }: Props = $props();

	/**
	 * Everything here is cleaned of preview markers, because none of it is text on
	 * the page — it is read by crawlers, share-card scrapers and the browser's own
	 * title bar. Invisible characters in a `<title>` are merely untidy; in a
	 * canonical URL or an `og:image` they produce a broken link. Nothing in a
	 * `<head>` is click-to-edit, so there is nothing to preserve.
	 */
	const metaTitle = $derived(
		control(seo?.metaTitle)?.trim() || control(title) || control(siteName) || ''
	);
	const metaDescription = $derived(
		control(seo?.metaDescription)?.trim() || control(description) || ''
	);
	const ogImage = $derived(control(seo?.ogImage?.asset?.url) || control(image) || null);

	// Absolute URLs: a relative og:image is ignored by most scrapers, and the
	// canonical has to be absolute by definition.
	const canonical = $derived(new URL(pageStore.url.pathname, pageStore.url.origin).href);
	const absoluteImage = $derived(ogImage ? new URL(ogImage, pageStore.url.origin).href : null);
</script>

<svelte:head>
	<title>{metaTitle}{siteName && metaTitle !== siteName ? ` — ${siteName}` : ''}</title>
	<link rel="canonical" href={canonical} />

	{#if metaDescription}
		<meta name="description" content={metaDescription} />
	{/if}

	{#if seo?.noIndex}
		<!-- Still publicly reachable — this only asks crawlers not to index it. -->
		<meta name="robots" content="noindex" />
	{/if}

	<meta property="og:type" content={type} />
	<meta property="og:title" content={metaTitle} />
	<meta property="og:url" content={canonical} />
	{#if siteName}<meta property="og:site_name" content={siteName} />{/if}
	{#if metaDescription}<meta property="og:description" content={metaDescription} />{/if}
	{#if absoluteImage}<meta property="og:image" content={absoluteImage} />{/if}

	<meta name="twitter:card" content={absoluteImage ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={metaTitle} />
	{#if metaDescription}<meta name="twitter:description" content={metaDescription} />{/if}
	{#if absoluteImage}<meta name="twitter:image" content={absoluteImage} />{/if}
</svelte:head>
