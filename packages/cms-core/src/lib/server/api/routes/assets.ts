import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import { validateFile } from '../../../utils/mime-detect';
import { listAssetsQuery } from '../../../api/schemas/assets';
import { hasCapability } from '../../../types/capabilities';
import { resolveMaxUploadBytes } from '../../../api/limits';
import { configHashFor, resolveImageConfig } from '../../../images';
import type { AphexEnv } from '../index';

export const assetsRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get(
		'/',
		zValidator('query', listAssetsQuery, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Invalid query parameters',
						issues: result.error.issues
					},
					400
				);
			}
		}),
		async (c) => {
			try {
				const { assetService } = c.var.aphexCMS;
				const auth = c.var.auth;

				if (!auth || auth.type === 'partial_session') {
					return c.json({ success: false, error: 'Unauthorized' }, 401);
				}

				if (!hasCapability(auth, 'asset.read')) {
					return c.json(
						{ success: false, error: 'Forbidden: asset.read capability required' },
						403
					);
				}

				const q = c.req.valid('query');
				const filters = {
					assetType: q.assetType,
					mimeType: q.mimeType,
					category: q.category,
					search: q.search,
					usage: q.usage,
					includeSystem: q.includeSystem ?? false,
					sort: q.sort ?? 'newest',
					limit: q.limit ?? 20,
					offset: q.offset ?? 0
				};

				const { databaseAdapter } = c.var.aphexCMS;

				// The usage filter reads the asset-reference index, which is maintained
				// as documents are saved. Content predating the index has no rows, so a
				// one-time bulk pass is needed — enqueued, never run here. That walk covers
				// every document in the org, and doing it inline meant the first editor to
				// open "Unused" wore the whole thing before their page rendered.
				//
				// The idempotency key collapses repeated clicks onto one job, and the
				// handler short-circuits once the index has rows, so this settles to a
				// no-op enqueue attempt and then nothing.
				let indexing = false;
				if (filters.usage && databaseAdapter.hasAnyAssetReferences) {
					try {
						if (!(await databaseAdapter.hasAnyAssetReferences(auth.organizationId))) {
							indexing = true;
							const { ASSET_REFERENCES_BACKFILL_JOB } =
								await import('../../../jobs/asset-reference-jobs');
							await databaseAdapter.scheduleJob({
								organizationId: auth.organizationId,
								type: ASSET_REFERENCES_BACKFILL_JOB,
								idempotencyKey: `asset-references:backfill:${auth.organizationId}`,
								payload: {
									documentTypes: (c.var.aphexCMS.config?.schemaTypes ?? [])
										.filter((schema) => schema.type === 'document')
										.map((schema) => schema.name)
								}
							});
						}
					} catch (err) {
						// Never fail a listing because indexing couldn't be scheduled.
						cmsLogger.debug('[Assets]', 'Could not enqueue reference backfill:', err);
					}
				}
				// The same filters go to both calls. `countAssets` used to receive a
				// hand-copied subset, so every filter added after it was written was
				// applied to the page but not to the total — the pager then read
				// "1–20 of 300" above eleven rows. `limit`/`offset`/`sort` are ignored
				// by the count, so passing the whole object is safe as well as correct.
				const [fetchedAssets, total] = await Promise.all([
					assetService.findAssets(auth.organizationId, filters),
					databaseAdapter.countAssets(auth.organizationId, filters)
				]);
				// Resolved once and reported, so the browser can request a derivative
				// for a thumbnail rather than the original. Grid views are where the
				// original's size hurts most: thirty full-resolution images to draw
				// thirty 200px tiles.
				const imageConfig = resolveImageConfig(c.var.aphexCMS.config?.images);

				const pageSize = filters.limit || 20;
				const currentPage = Math.floor(filters.offset / pageSize) + 1;
				const totalPages = Math.ceil(total / pageSize);

				return c.json({
					success: true,
					data: fetchedAssets,
					pagination: {
						total,
						page: currentPage,
						pageSize,
						totalPages,
						hasNextPage: currentPage < totalPages,
						hasPrevPage: currentPage > 1
					},
					// Reported so the admin UI can refuse an oversized file before
					// sending it, without hardcoding a number that drifts from the
					// server's. The browser already calls this endpoint on mount, so
					// it costs no extra request.
					// True when a usage filter was requested before the index exists, so the
					// UI can say "indexing" rather than present an empty or wholly-unused
					// library as fact.
					indexing,
					limits: {
						maxUploadBytes: resolveMaxUploadBytes(c.var.aphexCMS),
						// Reported rather than assumed: the client can't know whether
						// the adapter signs, a key is configured, or the operator
						// opted in — and guessing wrong means every upload fails.
						// Every hop optional-chained: this is a reporting field on a read
						// endpoint, and listing assets must not fail because some part
						// of the upload configuration is absent.
						directUpload: Boolean(
							c.var.aphexCMS.config?.upload?.direct &&
							c.var.aphexCMS.storageAdapter?.getSignedUploadUrl &&
							c.var.aphexCMS.storageAdapter?.resolvePath &&
							c.var.aphexCMS.config?.security?.secretEncryptionKey
						)
					},
					images: imageConfig
						? {
								widths: imageConfig.widths,
								quality: imageConfig.quality,
								configHash: configHashFor(imageConfig)
							}
						: null
				});
			} catch (error) {
				cmsLogger.error('Failed to fetch assets:', error);
				return c.json(
					{
						success: false,
						error: 'Failed to fetch assets',
						message: error instanceof Error ? error.message : 'Unknown error'
					},
					500
				);
			}
		}
	)
	.post('/', async (c) => {
		try {
			const { assetService } = c.var.aphexCMS;
			const auth = c.var.auth;

			if (!auth || auth.type === 'partial_session') {
				return c.json({ success: false, error: 'Unauthorized' }, 401);
			}

			if (!hasCapability(auth, 'asset.upload')) {
				return c.json(
					{ success: false, error: 'Forbidden: asset.upload capability required' },
					403
				);
			}

			const formData = await c.req.formData();
			const file = formData.get('file') as File;

			if (!file) {
				return c.json({ success: false, error: 'No file provided' }, 400);
			}

			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// The server's ceiling is the configured body limit, not a constant of
			// its own. This used to be a hardcoded 50MB that could never be
			// reached: the `bodyLimit` middleware rejects at 10MB by default, so
			// nothing between 10MB and 50MB ever arrived here to be checked.
			//
			// A client may ask for something *smaller* (a schema field capping its
			// own uploads); it may not ask for something larger.
			const serverMaxSize = resolveMaxUploadBytes(c.var.aphexCMS);
			const allowedMimeTypesRaw = formData.get('allowedMimeTypes') as string | null;
			const maxSizeRaw = formData.get('maxSize') as string | null;
			const allowedMimeTypes = allowedMimeTypesRaw ? JSON.parse(allowedMimeTypesRaw) : undefined;
			const clientMaxSize = maxSizeRaw ? parseInt(maxSizeRaw, 10) : undefined;
			const maxSize =
				clientMaxSize && Number.isFinite(clientMaxSize) && clientMaxSize > 0
					? Math.min(clientMaxSize, serverMaxSize)
					: serverMaxSize;

			const validation = validateFile(buffer, file.name, file.type, {
				allowedMimeTypes,
				maxSize
			});

			if (!validation.valid) {
				return c.json({ success: false, error: validation.error }, 400);
			}

			const safeMimeType = validation.detectedMimeType || 'application/octet-stream';

			const title = (formData.get('title') as string) || undefined;
			const description = (formData.get('description') as string) || undefined;
			const alt = (formData.get('alt') as string) || undefined;
			const creditLine = (formData.get('creditLine') as string) || undefined;

			// Video facts the browser read off the file. Bounded rather than trusted:
			// they arrive from a client and land in columns other code reasons about.
			// A negative or absurd value is dropped, not clamped to a wrong number.
			const boundedNumber = (raw: FormDataEntryValue | null, max: number) => {
				const value = raw == null ? NaN : Number(raw);
				return Number.isFinite(value) && value > 0 && value <= max ? value : undefined;
			};
			// 24h, and 16K — past either, something is wrong with the claim.
			const videoDuration = boundedNumber(formData.get('videoDuration'), 86_400);
			const videoWidth = boundedNumber(formData.get('videoWidth'), 16_384);
			const videoHeight = boundedNumber(formData.get('videoHeight'), 16_384);

			const schemaType = (formData.get('schemaType') as string) || undefined;
			const fieldPath = (formData.get('fieldPath') as string) || undefined;
			const system = formData.get('system') === 'true' || undefined;
			const usage = (formData.get('usage') as string) || undefined;

			const targetOrganizationId = auth.organizationId;

			const uploadData = {
				organizationId: targetOrganizationId,
				buffer,
				originalFilename: file.name,
				mimeType: safeMimeType,
				size: file.size,
				title,
				description,
				alt,
				creditLine,
				createdBy: auth.type === 'session' ? auth.user.id : undefined,
				// Dimensions are columns the image pipeline fills; for video they sit
				// null, so the browser's reading is the only source there is.
				width: videoWidth,
				height: videoHeight,
				metadata: {
					schemaType,
					fieldPath,
					system,
					usage,
					duration: videoDuration
				}
			};

			const asset = await assetService.uploadAsset(targetOrganizationId, uploadData);

			return c.json({ success: true, data: asset });
		} catch (error) {
			cmsLogger.error('Asset upload failed:', error);
			return c.json(
				{
					success: false,
					error: 'Asset upload failed',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	});
