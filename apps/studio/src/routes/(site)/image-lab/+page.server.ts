import type { PageServerLoad } from './$types';
import type { ImageValue } from '@aphexcms/cms-core/image';
import { siteContext } from '$lib/server/site';

/**
 * A harness for seeing what the image pipeline actually produces.
 *
 * It deliberately goes through the same path a real page does — wrap each asset
 * as an image *field value* and hand it to `injectAssetUrls` — rather than
 * building variant URLs itself. A demo that constructs its own URLs proves only
 * that the demo works; this one breaks when the pipeline breaks.
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	const { orgId } = await siteContext(locals);

	const assets = await locals.aphexCMS.assetService.findAssets(orgId, {
		assetType: 'image',
		limit: 24
	});

	/**
	 * `?id=<uuid>` addresses one asset directly.
	 *
	 * Looked up on its own when it isn't in the recent 24, rather than just
	 * selecting from the list: an id you paste in is usually an *older* asset —
	 * the one you're actually investigating — and a lab that could only inspect
	 * whatever happened to be recent would be useless for exactly that.
	 * Org-scoped, so a valid id belonging to another organization reads as
	 * absent.
	 */
	const requestedId = url.searchParams.get('id');
	if (requestedId && !assets.some((a) => a.id === requestedId)) {
		const requested = await locals.aphexCMS.assetService.findAssetById(orgId, requestedId);
		if (requested?.assetType === 'image') assets.unshift(requested);
	}

	// The shape an `image` field holds in a document: `{ asset: { _ref } }`.
	// Injection fills in url/alt/width/height/srcset in place.
	// Annotated as the *injected* shape, not the literal being written. Injection
	// mutates in place, so the value a `{ _ref }` literal infers is the shape
	// before the load finishes — accurate for one line and wrong for the page.
	const items: {
		id: string;
		filename: string;
		mimeType: string;
		bytes: number;
		pages: number;
		value: ImageValue;
	}[] = assets.map((asset) => ({
		id: asset.id,
		filename: asset.originalFilename,
		mimeType: asset.mimeType,
		bytes: asset.size,
		// `pages > 1` means an animated source, which the pipeline refuses to
		// resize — worth surfacing, since it explains a missing srcset.
		pages: asset.metadata?.pages ?? 1,
		value: { asset: { _ref: asset.id } }
	}));

	await locals.aphexCMS.assetService.injectAssetUrls(orgId, items);

	return {
		items,
		/** Null when absent or unresolvable — the client falls back to the first. */
		requestedId: requestedId && items.some((i) => i.id === requestedId) ? requestedId : null,
		// Echoed rather than re-derived, so a disagreement between what's
		// configured and what's being served is visible instead of hidden.
		imageConfig: locals.aphexCMS.config?.images ?? null,
		storageAdapter: locals.aphexCMS.storageAdapter?.name ?? 'unknown',
		/**
		 * Reported as its three separate preconditions, not one boolean.
		 *
		 * "Direct upload: off" when you have just set `direct: true` tells you
		 * nothing about which of the three is missing, and they fail for
		 * completely different reasons — a config flag, an adapter capability,
		 * and an env var.
		 */
		directUpload: {
			configured: Boolean(locals.aphexCMS.config?.upload?.direct),
			adapterCanSign: Boolean(locals.aphexCMS.storageAdapter?.getSignedUploadUrl),
			adapterCanResolvePath: Boolean(locals.aphexCMS.storageAdapter?.resolvePath),
			encryptionKey: Boolean(locals.aphexCMS.config?.security?.secretEncryptionKey)
		}
	};
};
