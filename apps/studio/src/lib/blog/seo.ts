import { stegaClean } from '@aphexcms/visual-editing';

/** The shared `seo` object shape (see schemaTypes/_seo.ts). */
type SeoBlock =
	| {
			metaTitle?: string;
			metaDescription?: string;
			ogImage?: { asset?: { _ref?: string } };
			noIndex?: boolean;
	  }
	| undefined;

/** Meta title: the SEO override, else the document title. Stega-cleaned for <head>. */
export function seoTitle(seo: SeoBlock, fallback?: string): string {
	return (stegaClean(seo?.metaTitle ?? '') || stegaClean(fallback ?? '') || '').trim();
}

/** Meta description: the SEO override, else the excerpt. Stega-cleaned for <head>. */
export function seoDescription(seo: SeoBlock, fallback?: string): string {
	return (stegaClean(seo?.metaDescription ?? '') || stegaClean(fallback ?? '') || '').trim();
}

/** Asset ref for the SEO social image, if set. Resolve to a URL via assetUrls. */
export function seoOgImageRef(seo: SeoBlock): string | undefined {
	return seo?.ogImage?.asset?._ref;
}
