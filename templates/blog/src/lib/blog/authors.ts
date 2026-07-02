import type { LocalAPI, LocalAPIContext, AssetService } from '@aphexcms/cms-core/server';
import type { BlogPost } from '$lib/generated-types';

/** What a byline / author card needs. */
export type AuthorInfo = {
	id: string;
	name: string;
	slug: string;
	role?: string;
	avatarUrl?: string;
};

/** Load every published author keyed by id, for resolving `post.author` references.
 *  Avatar URLs are injected up front so the byline can read them directly. */
export async function loadAuthorMap(
	localAPI: LocalAPI,
	context: LocalAPIContext,
	assetService: AssetService,
	organizationId: string,
	perspective: 'draft' | 'published' = 'published'
): Promise<Record<string, AuthorInfo>> {
	const res = await localAPI.collections.author.find(context, {
		perspective,
		limit: 200
	});
	await assetService.injectAssetUrls(organizationId, ...res.docs);
	const map: Record<string, AuthorInfo> = {};
	for (const a of res.docs) {
		map[a.id] = {
			id: a.id,
			name: a.name,
			slug: a.slug,
			role: a.role,
			avatarUrl: a.avatar?.asset?.url
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
