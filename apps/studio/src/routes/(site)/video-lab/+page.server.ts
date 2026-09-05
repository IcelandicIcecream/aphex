import type { PageServerLoad } from './$types';
import { siteContext } from '$lib/server/site';

/**
 * One probe's answer. `error` is present-but-undefined on success so the two
 * shapes form a discriminated union — without it `'error' in probe` cannot
 * narrow, and every field read in the template is an error on the failure half.
 */
export interface ProbeResult {
	status?: number;
	contentType?: string | null;
	contentLength?: string | null;
	contentRange?: string | null;
	acceptRanges?: string | null;
	cacheControl?: string | null;
	disposition?: string | null;
	error?: string;
}

/**
 * A harness for the video delivery path, mirroring `image-lab`.
 *
 * Video's failure modes are almost all invisible in the markup: a player that
 * works locally and stalls in production, a seek that silently refetches from
 * byte zero, a `Content-Length` that disagrees with the body. So this page reports
 * what the *server* said rather than what the player looks like — it probes
 * `/media/:id/:filename` with and without a `Range` header and shows the answers
 * side by side.
 *
 * The URL is resolved the same way a real page resolves it (wrap the asset as a
 * file field value, hand it to `injectAssetUrls`) rather than being constructed
 * here. A demo that builds its own URLs only proves the demo works.
 */
export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	const { orgId } = await siteContext(locals);

	const assets = await locals.aphexCMS.assetService.findAssets(orgId, {
		category: 'video',
		limit: 24
	});

	const requestedId = url.searchParams.get('id');
	const selected = requestedId
		? ((await locals.aphexCMS.assetService.findAssetById(orgId, requestedId)) ?? assets[0])
		: assets[0];

	// Same path a rendered document takes: a file field value, URL injected.
	let playbackUrl: string | undefined;
	if (selected) {
		const field = { _type: 'file', asset: { _type: 'reference', _ref: selected.id } };
		await locals.aphexCMS.assetService.injectAssetUrls(orgId, field);
		playbackUrl = (field.asset as { url?: string }).url;
	}

	/**
	 * Ask the media route the two questions that decide whether video works:
	 * does it serve a whole file, and does it honour a byte range?
	 *
	 * `HEAD` is deliberately not used — the route is only ever exercised with GET
	 * by a player, and a HEAD-only check can pass while GET behaves differently.
	 * The bodies are never read — see the abort below.
	 */
	async function probe(headers?: Record<string, string>): Promise<ProbeResult | null> {
		if (!playbackUrl) return null;
		// Abort as soon as the headers land. `fetch` resolves on headers, so the body
		// is never read — without this the no-Range probe would pull the entire file
		// on every page load, which for a 34MB clip makes the diagnostic page more
		// expensive than the thing it is diagnosing. Cancelling the stream afterwards
		// is not equivalent: by then the server has already started sending.
		const abort = new AbortController();
		try {
			const response = await fetch(playbackUrl, { headers, signal: abort.signal });
			const result = {
				status: response.status,
				contentType: response.headers.get('content-type'),
				contentLength: response.headers.get('content-length'),
				contentRange: response.headers.get('content-range'),
				acceptRanges: response.headers.get('accept-ranges'),
				cacheControl: response.headers.get('cache-control'),
				disposition: response.headers.get('content-disposition')
			};
			abort.abort();
			return result;
		} catch (err) {
			return { error: err instanceof Error ? err.message : String(err) };
		}
	}

	const full = await probe();
	const ranged = await probe({ Range: 'bytes=0-1023' });
	const suffix = await probe({ Range: 'bytes=-500' });
	const past = await probe({ Range: 'bytes=999999999-' });

	return {
		assets: assets.map((asset) => ({
			id: asset.id,
			originalFilename: asset.originalFilename,
			mimeType: asset.mimeType,
			size: asset.size
		})),
		selected: selected
			? {
					id: selected.id,
					originalFilename: selected.originalFilename,
					mimeType: selected.mimeType,
					size: selected.size,
					width: selected.width,
					height: selected.height,
					createdAt: selected.createdAt,
					metadata: selected.metadata ?? null
				}
			: null,
		playbackUrl,
		probes: { full, ranged, suffix, past }
	};
};
