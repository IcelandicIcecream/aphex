import type { LocalAPI, LocalAPIContext } from '@aphexcms/cms-core/server';
import type { BlogPost, Tag } from '$lib/generated-types';

/** The fields the frontend needs to render a tag chip / link. */
export type TagInfo = Pick<Tag, 'id' | 'title' | 'slug'>;

/**
 * Load every published tag keyed by id, so `post.tags` references (stored as
 * `{ _type: 'reference', _ref }`) can be resolved to `{ title, slug }` for
 * rendering. A blog has few tags, so one fetch + a map is plenty.
 */
export async function loadTagMap(
	localAPI: LocalAPI,
	context: LocalAPIContext,
	perspective: 'draft' | 'published' = 'published'
): Promise<Record<string, TagInfo>> {
	const res = await localAPI.collections.tag.find(context, {
		perspective,
		limit: 200
	});
	const map: Record<string, TagInfo> = {};
	for (const t of res.docs) map[t.id] = { id: t.id, title: t.title, slug: t.slug };
	return map;
}

/** Resolve a post's tag references to the tags present in the map (drops missing). */
export function postTags(tags: BlogPost['tags'], tagMap: Record<string, TagInfo>): TagInfo[] {
	if (!Array.isArray(tags)) return [];
	return tags.map((ref) => tagMap[ref._ref]).filter((t): t is TagInfo => !!t);
}
