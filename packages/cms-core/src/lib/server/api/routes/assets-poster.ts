import { Hono } from 'hono';
import { cmsLogger } from '../../../utils/logger';
import { hasCapability } from '../../../types/capabilities';
import { buildPosterKey } from '../../../storage/keys';
import { validateFile } from '../../../utils/mime-detect';
import type { AphexEnv } from '../index';

/**
 * Attach a poster frame to an existing video asset.
 *
 * Separate from upload because the frame is extracted in the browser *from the
 * file being uploaded*, and the storage key it lives at (`{assetId}/poster.webp`)
 * is derived from an id that doesn't exist until the asset row does. So the
 * client uploads the video, learns the id, then posts the frame here.
 *
 * A poster is optional by construction — a codec the browser can't decode, or an
 * upload that never went through a browser at all, simply has none. Nothing here
 * should ever make a video's own upload fail.
 */

/** A frame is a thumbnail. Anything larger is not a frame we produced. */
const MAX_POSTER_BYTES = 2 * 1024 * 1024;

export const assetsPosterRouter: Hono<AphexEnv> = new Hono<AphexEnv>().post(
	'/:id/poster',
	async (c) => {
		try {
			const { assetService, storageAdapter, databaseAdapter } = c.var.aphexCMS;
			const auth = c.var.auth;

			if (!auth || auth.type === 'partial_session') {
				return c.json({ success: false, error: 'Unauthorized' }, 401);
			}
			// Writing a derivative of an asset is an asset write, not a read.
			if (!hasCapability(auth, 'asset.upload')) {
				return c.json({ success: false, error: 'Forbidden: asset.upload required' }, 403);
			}

			const id = c.req.param('id');
			const asset = await assetService.findAssetById(auth.organizationId, id);
			if (!asset) {
				return c.json({ success: false, error: 'Asset not found' }, 404);
			}
			// Media only. Without this the endpoint is a way to write an arbitrary
			// image under any asset's key prefix.
			//
			// Audio is admitted alongside video because it carries a duration and no
			// frame: a browser can read how long a WAV is, and that is worth storing
			// even though there is nothing to look at. Such a request sends no
			// poster, which is why the file below is optional.
			const isVideo = asset.mimeType?.startsWith('video/') ?? false;
			const isAudio = asset.mimeType?.startsWith('audio/') ?? false;
			if (!isVideo && !isAudio) {
				return c.json({ success: false, error: 'Asset is not video or audio' }, 400);
			}

			const formData = await c.req.formData();

			// Duration and dimensions ride along, because the browser reads all three
			// from one `loadedmetadata` and splitting them would mean decoding the
			// video twice. Bounded, not trusted — 24h and 16K.
			const bounded = (raw: FormDataEntryValue | null, max: number) => {
				const value = raw == null ? NaN : Number(raw);
				return Number.isFinite(value) && value > 0 && value <= max ? value : undefined;
			};
			const duration = bounded(formData.get('duration'), 86_400);
			const width = bounded(formData.get('width'), 16_384);
			const height = bounded(formData.get('height'), 16_384);

			const file = formData.get('poster');
			if (!(file instanceof File) && duration == null) {
				return c.json({ success: false, error: 'Nothing to store' }, 400);
			}

			let storedPoster = false;
			if (file instanceof File) {
				if (!isVideo) {
					return c.json({ success: false, error: 'Only video can carry a poster' }, 400);
				}
				if (file.size > MAX_POSTER_BYTES) {
					return c.json({ success: false, error: 'Poster too large' }, 400);
				}

				// Sniffed, not trusted: the client says "image/webp", and a route that
				// believed it would happily store anything under a name the CDN serves
				// with `Content-Type: image/webp`.
				const buffer = Buffer.from(await file.arrayBuffer());
				const validation = validateFile(buffer, file.name, file.type, {
					allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
					maxSize: MAX_POSTER_BYTES
				});
				if (!validation.valid) {
					return c.json({ success: false, error: validation.error }, 400);
				}

				await storageAdapter.store({
					buffer,
					filename: 'poster.webp',
					mimeType: 'image/webp',
					size: buffer.length,
					key: buildPosterKey(asset.id)
				});
				storedPoster = true;
			}

			// Recorded so a client knows a poster exists without probing for a 404.
			// Written through the database adapter rather than
			// `assetService.updateAssetMetadata`, which covers only the editorial
			// fields (title/alt/description) and has no `metadata` argument.
			//
			// The whole JSON object is rewritten because it is one column, so the
			// current value has to be merged onto — sending a fragment would drop
			// whatever the upload path recorded (dimensions, privacy fields).
			await databaseAdapter.updateAsset(auth.organizationId, asset.id, {
				// `??` not `||`: a caller that sends no duration must not erase one
				// recorded at upload.
				width: width ?? asset.width ?? undefined,
				height: height ?? asset.height ?? undefined,
				metadata: {
					...(asset.metadata ?? {}),
					// Only claimed when a frame was actually written — an audio asset
					// records a duration and no poster, and a flag set regardless would
					// point the grid at a URL that 404s.
					poster: storedPoster || asset.metadata?.poster === true,
					duration: duration ?? asset.metadata?.duration
				}
			});

			return c.json({ success: true });
		} catch (error) {
			cmsLogger.error('Failed to attach poster:', error);
			return c.json({ success: false, error: 'Failed to attach poster' }, 500);
		}
	}
);
