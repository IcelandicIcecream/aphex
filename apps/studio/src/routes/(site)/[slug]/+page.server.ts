import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { siteContext, getPreviewPerspective } from '$lib/server/site';
import { resolveAssets } from '$lib/blog/resolve-assets';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { orgId, context } = await siteContext(locals);
	const perspective = getPreviewPerspective(locals.auth, url);

	const result = await locals.aphexCMS.localAPI.collections.page.find(context, {
		perspective,
		limit: 1,
		where: { slug: { equals: params.slug } }
	});

	const page = result.docs[0];
	if (!page) error(404, 'Page not found');

	const refs: Array<string | null | undefined> = [
		page.coverImage?.asset?._ref,
		page.seo?.ogImage?.asset?._ref
	];
	if (Array.isArray(page.content)) {
		for (const block of page.content) {
			if (block._type === 'image' && block.asset?._ref) refs.push(block.asset._ref);
		}
	}
	const { urls: assetUrls, alts: assetAlts } = await resolveAssets(
		locals.aphexCMS.assetService,
		orgId,
		refs
	);

	return { page, assetUrls, assetAlts };
};
