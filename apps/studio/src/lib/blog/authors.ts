import type { LocalAPI, LocalAPIContext } from '@aphexcms/cms-core/server';
import type { BlogPost } from '$lib/generated-types';

/** What a byline / author card needs. */
export type AuthorInfo = {
	id: string;
	name: string;
	slug: string;
	role?: string;
	avatarRef?: string;
};

/** Load every published author keyed by id, for resolving `post.author` references. */
export async function loadAuthorMap(
	localAPI: LocalAPI,
	context: LocalAPIContext,
	perspective: 'draft' | 'published' = 'published'
): Promise<Record<string, AuthorInfo>> {
	const res = await localAPI.collections.author.find(context, {
		perspective,
		limit: 200
	});
	const map: Record<string, AuthorInfo> = {};
	for (const a of res.docs) {
		map[a.id] = {
			id: a.id,
			name: a.name,
			slug: a.slug,
			role: a.role,
			avatarRef: a.avatar?.asset?._ref
		};
	}
	return map;
}

/** Resolve a post's author reference against the map (null if missing). */
export function postAuthor(
	ref: BlogPost['author'],
	authorMap: Record<string, AuthorInfo>
): AuthorInfo | null {
	return ref ? (authorMap[ref._ref] ?? null) : null;
}
