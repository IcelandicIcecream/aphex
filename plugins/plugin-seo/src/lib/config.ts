/**
 * SEO generator config — the functions the plugin uses to auto-fill meta from a
 * document. `seoPlugin(options)` sets these once at registration; the Generate
 * action, the audit tool, and the search preview read them. Provide your own to
 * change how titles, descriptions, images, and URLs are derived (like Payload's
 * `generateTitle` etc.).
 *
 * Each generator receives the document AND a context object carrying the schema
 * and its type name, so one function can serve many collections — e.g.
 * `generateURL: (doc, { typeName }) => typeName === 'author' ? ... : ...`. The
 * defaults are schema-aware: they read each type's own `preview` config, so a
 * blog post (title/excerpt), an author (name/bio), and a tag (title/description)
 * all resolve correctly with zero config.
 */
import type { SchemaType } from '@aphexcms/cms-core';
import { readPath, resolvePreviewSubtitle } from '@aphexcms/cms-core';

/** Context passed to every generator alongside the document data. */
export interface SeoGenContext {
	/** The document's schema — lets defaults read its `preview` config. */
	schema?: SchemaType;
	/** The document type name (e.g. `'author'`) — for per-type branching. */
	typeName?: string;
}

export interface SeoGenerators {
	generateTitle: (doc: Record<string, any>, ctx: SeoGenContext) => string;
	generateDescription: (doc: Record<string, any>, ctx: SeoGenContext) => string;
	generateImage?: (doc: Record<string, any>, ctx: SeoGenContext) => unknown;
	generateURL: (doc: Record<string, any>, ctx: SeoGenContext) => string;
}

/** Conventional field names to scan when a schema doesn't pin one down. */
const TITLE_FIELDS = ['title', 'heading', 'name', 'label'];
const DESCRIPTION_FIELDS = ['excerpt', 'description', 'summary', 'bio', 'tagline', 'abstract'];
const IMAGE_FIELDS = ['coverImage', 'mainImage', 'image', 'avatar', 'photo'];

function str(value: unknown): string {
	return typeof value === 'string' && value.trim() ? value.trim() : '';
}

/**
 * Best-effort title for a document, honoring the schema's `preview` config first
 * (the canonical "what represents this doc" declaration), then conventional field
 * names. Returns `''` when nothing real is found — so callers can detect a
 * genuinely missing title rather than a placeholder.
 */
export function resolveTitle(doc: Record<string, any>, schema?: SchemaType): string {
	const path = schema?.preview?.select?.title;
	if (path) {
		const fromPreview = str(readPath(doc, path));
		if (fromPreview) return fromPreview;
	}
	for (const name of TITLE_FIELDS) {
		const value = str(doc[name]);
		if (value) return value;
	}
	return '';
}

/**
 * Best-effort meta description: conventional description-ish fields, then the
 * schema's preview subtitle as a last resort. Returns `''` when none apply.
 */
export function resolveDescription(doc: Record<string, any>, schema?: SchemaType): string {
	for (const name of DESCRIPTION_FIELDS) {
		const value = str(doc[name]);
		if (value) return value;
	}
	const subtitle = schema ? resolvePreviewSubtitle(doc, schema) : null;
	return subtitle ?? '';
}

/** Whether the document has a usable social/preview image (uploaded asset). */
export function hasSocialImage(doc: Record<string, any>, schema?: SchemaType): boolean {
	const seo = (doc.seo ?? {}) as Record<string, any>;
	if (seo.ogImage?.asset) return true;
	const path = schema?.preview?.select?.media;
	if (path) {
		const media = readPath(doc, path) as { asset?: unknown } | undefined;
		if (media?.asset) return true;
	}
	return IMAGE_FIELDS.some((name) => (doc[name] as { asset?: unknown } | undefined)?.asset);
}

const defaults: SeoGenerators = {
	generateTitle: (doc, ctx) => resolveTitle(doc, ctx?.schema),
	generateDescription: (doc, ctx) => resolveDescription(doc, ctx?.schema),
	generateURL: (doc) => (typeof doc.slug === 'string' ? `/${doc.slug}` : '/')
};

let current: SeoGenerators = defaults;

export function configureSeo(overrides: Partial<SeoGenerators>): void {
	current = { ...defaults, ...overrides };
}

export function seoGenerators(): SeoGenerators {
	return current;
}
