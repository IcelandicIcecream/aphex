import { getContext, setContext } from 'svelte';
import { getLivePreviewDocument } from './live-preview.svelte.js';
import { stegaEncode, type StegaPayload } from './stega.js';

const PT_FIELD_KEY = Symbol('aphex:pt-field');

/**
 * Declare which document field a Portable Text body belongs to (e.g. `'content'`), so inline
 * blocks rendered by your Portable Text library can encode click-to-edit markers without
 * defining their own context plumbing. Call it in the component that renders the body.
 * Accepts a value or a getter (use a getter to stay reactive to a prop).
 */
export function setPortableTextField(field: string | (() => string)): void {
	setContext(PT_FIELD_KEY, typeof field === 'function' ? field : () => field);
}

/** A payload like {@link StegaPayload} but with `field` optional — it falls back to the
 * Portable Text field context, so inline blocks can omit it. */
export type EncodePayload = Partial<StegaPayload>;

type ImageLike =
	| { alt?: string; asset?: { _ref?: string; url?: string; alt?: string } }
	| null
	| undefined;

/** An image field resolved for rendering. */
export interface ResolvedImage {
	/** Public URL, or `null` if the image/asset is unset. */
	src: string | null;
	/** Effective alt text: per-placement override → asset default → `''`. */
	alt: string;
}

export interface PreviewApi {
	/** True while the visual editor is driving this page (a live document has been received). */
	readonly inPreview: boolean;
	/** The live document pushed by the editor, or `null` outside preview. */
	readonly document: Record<string, unknown> | null;
	/** The live document merged over your server fallback: `const post = $derived(ve.live(data.post))`. */
	live<T>(fallback: T, options?: { type?: string; id?: string }): T;
	/**
	 * Make a value click-to-edit. In preview it returns the value stega-encoded with the
	 * navigation payload; outside preview it returns the value unchanged. `field` defaults to
	 * the Portable Text field context when omitted (for inline blocks).
	 */
	encode(value: string | null | undefined, payload?: EncodePayload): string;
	/**
	 * Make any element click-to-edit a *specific* document — for app-level references
	 * that aren't stored in the current document (e.g. an app-queried "list of posts"
	 * block). Spread the returned attributes onto the element; clicking it in preview
	 * opens that document in the studio. Returns `{}` outside preview.
	 *
	 * @example
	 * // {#each posts as post}
	 * //   <a href="/blog/{post.slug}" {...ve.edit({ id: post.id, type: 'blog_post' })}>…</a>
	 */
	edit(target: { id: string; type: string; field?: string }): Record<string, string>;
	/**
	 * Resolve an image field to `{ src, alt }` in one call — destructure it:
	 * `const { src, alt } = $derived(ve.image(post.coverImage))`. Reads `asset.url`/`asset.alt`,
	 * which the server injects at load time and the editor injects into the live document, so
	 * the same call works for SSR and for newly-added/swapped images in preview.
	 */
	image(img: ImageLike): ResolvedImage;
}

/**
 * One-call visual-editing helper for a page or component. Reads the context set by
 * `<AphexVisualOverlay>` (and any Portable Text field context). Call once during init.
 *
 * @example
 * const ve = usePreview();
 * const post = $derived(ve.live(data.post));
 * const cover = $derived(ve.image(post.coverImage));
 * // <time datetime={ve.encode(post.postDate, { field: 'postDate' })}>
 * // <img src={cover.src} alt={ve.encode(cover.alt, { field: 'coverImage' })} />
 */
export function usePreview(): PreviewApi {
	const ctx = getLivePreviewDocument();
	const ptField = getContext<(() => string) | undefined>(PT_FIELD_KEY);

	return {
		get inPreview() {
			return ctx.current != null;
		},
		get document() {
			return ctx.current;
		},
		live<T>(fallback: T, options: { type?: string; id?: string } = {}): T {
			if (options.type && ctx.currentType !== options.type) return fallback;
			if (options.id && ctx.currentId !== options.id) return fallback;
			return (ctx.current as T | null) ?? fallback;
		},
		encode(value, payload = {}) {
			const raw = value ?? '';
			if (ctx.current == null) return raw; // not in preview — leave the value clean
			const field = payload.field ?? ptField?.();
			if (!field) return raw; // nothing to navigate to
			return stegaEncode(raw || ' ', { ...payload, field });
		},
		edit(target) {
			const attrs: Record<string, string> = {};
			if (ctx.current == null) return attrs; // not in preview — no attributes
			// `data-aphex-field` is what the overlay keys on to make an element clickable;
			// the id/type route the click to that document (the studio opens it).
			attrs['data-aphex-field'] = target.field ?? 'title';
			attrs['data-aphex-document-id'] = target.id;
			attrs['data-aphex-document-type'] = target.type;
			return attrs;
		},
		image(img) {
			return {
				src: img?.asset?.url ?? null, // injected at load (server) or into the live doc (editor)
				alt: img?.alt || img?.asset?.alt || '' // per-placement override → asset default
			};
		}
	};
}
