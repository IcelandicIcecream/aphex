/**
 * Everything a page's `<head>` needs from a document, resolved once: the title, the
 * description, the canonical address, robots, and the share card. It uses the same
 * fallbacks as the admin's search preview and the Generate action (`config.ts`), so
 * what the editor sees is what the page says.
 *
 * Plain TypeScript, safe in a `load` function or a server route. Render the result
 * with `<SeoHead meta={…} />`, or write the tags yourself from it.
 */
import type { SchemaType } from '@aphexcms/cms-core';
import { stegaClean } from '@aphexcms/cms-core';
import { shareImage } from './audit';
import { seoGenerators } from './config';

export interface SeoHeadOptions {
	/** The page's address. The canonical is this without its query and fragment. */
	url: URL | string;
	/** The document type's name, passed to the generators (per-type fallbacks). */
	typeName?: string;
	/** The document's schema, when you have it: fallbacks then read its `preview`. */
	schema?: SchemaType;
	/** The site's name: added to the title and sent as `og:site_name`. */
	siteName?: string;
	/** `article` for a post, `website` (the default) for anything else. */
	type?: 'website' | 'article';
	/**
	 * The full `<title>`. Default: `Title — Site name`, or the title alone when
	 * it already is the site's name.
	 */
	titleTemplate?: (title: string, siteName: string | undefined) => string;
	/** An address to use as the canonical instead (a page shown at two addresses). */
	canonical?: string;
	/** A share image to fall back to when the document has none (the site's logo). */
	fallbackImage?: unknown;
}

export interface SeoImage {
	url: string;
	width: number | null;
	height: number | null;
	alt: string | null;
}

export interface SeoMeta {
	/** The `<title>`, with the site's name. */
	title: string;
	/** The title alone, for `og:title`. */
	headline: string;
	description: string;
	canonical: string;
	/** `noindex` when the editor hid the page from search, else `null`. */
	robots: string | null;
	type: 'website' | 'article';
	siteName: string | null;
	image: SeoImage | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const clean = (value: unknown): string =>
	typeof value === 'string' ? stegaClean(value).trim() : '';

const num = (value: unknown): number | null =>
	typeof value === 'number' && Number.isFinite(value) ? value : null;

/** An image value with its address filled in (`injectAssetUrls`), as a share image. */
function imageOf(value: unknown, base: URL): SeoImage | null {
	if (!isRecord(value) || !isRecord(value.asset)) return null;
	const src = clean(value.asset.url);
	if (!src) return null;
	return {
		url: new URL(src, base).href,
		width: num(value.asset.width),
		height: num(value.asset.height),
		alt: clean(value.alt) || clean(value.asset.alt) || null
	};
}

const defaultTemplate = (title: string, siteName: string | undefined) =>
	siteName && title && title !== siteName ? `${title} — ${siteName}` : title || siteName || '';

/**
 * Resolve a document's head tags. Pass the document as the page loaded it, with
 * image addresses filled in; preview markers are removed here, since nothing in a
 * `<head>` is click-to-edit and a marked canonical is a broken link.
 */
export function resolveSeo(doc: Record<string, unknown>, options: SeoHeadOptions): SeoMeta {
	const url = new URL(options.url);
	const seo = isRecord(doc.seo) ? doc.seo : {};
	const generators = seoGenerators();
	const ctx = { schema: options.schema, typeName: options.typeName };
	const siteName = clean(options.siteName) || undefined;

	const headline =
		clean(seo.metaTitle) || clean(generators.generateTitle(doc, ctx)) || siteName || '';
	const description = clean(seo.metaDescription) || clean(generators.generateDescription(doc, ctx));
	const generated = generators.generateImage?.(doc, ctx);

	const canonical = options.canonical
		? new URL(options.canonical, url).href
		: new URL(url.pathname, url.origin).href;

	return {
		title: (options.titleTemplate ?? defaultTemplate)(headline, siteName),
		headline,
		description,
		canonical,
		robots: seo.noIndex === true ? 'noindex' : null,
		type: options.type ?? 'website',
		siteName: siteName ?? null,
		image:
			imageOf(seo.ogImage, url) ??
			imageOf(generated, url) ??
			imageOf(shareImage(doc, options.schema), url) ??
			imageOf(options.fallbackImage, url)
	};
}
