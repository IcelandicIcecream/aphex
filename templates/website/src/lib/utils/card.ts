import type { ImageValue } from '@aphexcms/cms-core/image';
import { isResolvedRef, type ResolvedRef } from './reference';
import { docHref } from './link';

/**
 * The one shape `Card.svelte` renders.
 *
 * Posts reach a card from three directions — a full document from the archive
 * query, a resolved reference from `relatedPosts`, a resolved reference from the
 * archive block's hand-picked selection — and they don't agree on field names
 * (`heroImage` vs `image`). These two functions are where that's reconciled, so
 * the card itself never has to ask which kind of thing it was handed.
 */
export interface CardData {
	id: string;
	href: string | null;
	title: string;
	excerpt: string | null;
	image: ImageValue | null;
	tags: string[];
}

/** A post document, as it comes back from the Local API. */
interface PostLike {
	id?: string;
	title?: string;
	slug?: string;
	excerpt?: string;
	heroImage?: ImageValue;
	categories?: unknown[];
}

/** Category names off a post's resolved `categories` array. */
function categoryNames(categories: unknown[] | undefined): string[] {
	if (!Array.isArray(categories)) return [];
	return categories
		.filter(isResolvedRef)
		.map((category) => category.title)
		.filter((title): title is string => !!title);
}

export function postToCard(post: PostLike): CardData {
	return {
		id: post.id ?? post.slug ?? '',
		href: docHref('post', post.slug),
		title: post.title ?? 'Untitled',
		excerpt: post.excerpt ?? null,
		image: post.heroImage ?? null,
		tags: categoryNames(post.categories)
	};
}

/**
 * A resolved reference to a post. It carries less than a full document — no
 * categories, since resolution stops at one level on purpose — so the card comes
 * out without tags. That's the trade for not fetching every post's categories to
 * render a "related" strip.
 */
export function refToCard(ref: ResolvedRef): CardData {
	return {
		id: ref.id,
		href: docHref(ref.docType, ref.slug),
		title: ref.title ?? 'Untitled',
		excerpt: ref.excerpt ?? null,
		image: (ref.image as ImageValue | undefined) ?? null,
		tags: []
	};
}
