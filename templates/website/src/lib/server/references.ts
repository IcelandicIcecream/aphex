import type { DatabaseAdapter } from '@aphexcms/cms-core/server';
import type { ResolvedRef, Resolved } from '$lib/utils/reference';

/**
 * Reference resolution for the public site.
 *
 * A `reference` field stores only `{ _type: 'reference', _ref: '<id>' }`. Links,
 * categories, related posts and the archive block's hand-picked selection are
 * all references, and none of them can render without the target's `title` and
 * `slug`.
 *
 * The Local API's own `depth` option does resolve references, but it substitutes
 * the whole database row — `draftData`, `publishedData`, `publishedHash`,
 * `organizationId` and all — which is both far more than a link needs and more
 * than should ever cross into a public page's hydration payload. So this resolves
 * them explicitly into a small, fixed summary shape instead. It's the same idea
 * as Payload's `defaultPopulate: { title: true, slug: true }`.
 *
 * Every unique id is fetched once, however many times it appears.
 */

function isRawRef(value: unknown): value is { _type: 'reference'; _ref: string } {
	return (
		!!value &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		(value as Record<string, unknown>)._type === 'reference' &&
		typeof (value as Record<string, unknown>)._ref === 'string'
	);
}

/**
 * An image field's `asset` is stored as the same `{ _type: 'reference', _ref }`
 * shape, but it points at an asset, not a document — `injectAssetUrls` expands
 * it into a URL, dimensions and a srcset. Walking into it here would fetch a
 * document that doesn't exist and replace a perfectly good asset ref with null,
 * blanking every image on the page. So the key is skipped, in both passes below
 * and in the `Resolved<>` type that mirrors them.
 */
const SKIP_KEYS = new Set(['asset']);

/** Collect every `_ref` id anywhere in the value, without mutating it. */
function collectRefIds(value: unknown, into: Set<string>): void {
	if (!value || typeof value !== 'object') return;
	if (isRawRef(value)) {
		into.add(value._ref);
		return;
	}
	if (Array.isArray(value)) {
		for (const item of value) collectRefIds(item, into);
		return;
	}
	for (const [key, item] of Object.entries(value)) {
		if (SKIP_KEYS.has(key)) continue;
		collectRefIds(item, into);
	}
}

/** Rebuild the value with every reference replaced by its summary. */
function substitute(value: unknown, resolved: Map<string, ResolvedRef>): unknown {
	if (!value || typeof value !== 'object') return value;
	if (isRawRef(value)) {
		// A reference whose target is missing, unpublished, or in another org
		// resolves to nothing. Returning null (rather than leaving the raw ref)
		// means renderers only ever handle "present or absent" — see the
		// `.filter(Boolean)` calls at each call site.
		return resolved.get(value._ref) ?? null;
	}
	if (Array.isArray(value)) return value.map((item) => substitute(item, resolved));
	const out: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(value)) {
		out[key] = SKIP_KEYS.has(key) ? item : substitute(item, resolved);
	}
	return out;
}

function str(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value : null;
}

/**
 * Replace every reference in `data` with a {@link ResolvedRef}, in place of the
 * raw `{ _ref }` marker. Returns a new value; the input is untouched, and the
 * return type ({@link Resolved}) reflects the substitution — so a caller reads
 * `.slug` off a resolved reference without a cast.
 *
 * `perspective` decides which side of the document is read, so a draft preview
 * links to draft slugs and the live site links to published ones. A document
 * with no published data at all resolves to null under `'published'` — a link to
 * an unpublished page renders as plain text rather than a 404.
 */
export async function resolveReferences<T>(
	adapter: DatabaseAdapter,
	organizationId: string,
	data: T,
	perspective: 'draft' | 'published' = 'published'
): Promise<Resolved<T>> {
	const ids = new Set<string>();
	collectRefIds(data, ids);
	if (ids.size === 0) return data as Resolved<T>;

	const resolved = new Map<string, ResolvedRef>();

	await Promise.all(
		[...ids].map(async (id) => {
			const doc = await adapter.findByDocIdAdvanced(organizationId, id);
			if (!doc) return;

			const content =
				perspective === 'published' ? doc.publishedData : (doc.draftData ?? doc.publishedData);
			if (!content) return;

			const fields = content as Record<string, unknown>;
			resolved.set(id, {
				_type: 'resolvedReference',
				id: doc.id,
				docType: doc.type,
				title: str(fields.title),
				slug: str(fields.slug),
				excerpt: str(fields.excerpt),
				image: fields.heroImage ?? fields.coverImage ?? undefined
			});
		})
	);

	return substitute(data, resolved) as Resolved<T>;
}
