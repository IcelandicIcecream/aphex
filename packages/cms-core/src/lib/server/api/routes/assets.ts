import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import { validateFile } from '../../../utils/mime-detect';
import { listAssetsQuery } from '../../../api/schemas/assets';
import { hasCapability } from '../../../types/capabilities';
import type { AphexEnv } from '../index';

export const assetsRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/', zValidator('query', listAssetsQuery, (result, c) => {
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
	}), async (c) => {
		try {
			const { assetService } = c.var.aphexCMS;
			const auth = c.var.auth;

			if (!auth || auth.type === 'partial_session') {
				return c.json({ success: false, error: 'Unauthorized' }, 401);
			}

			const q = c.req.valid('query');
			const filters = {
				assetType: q.assetType,
				mimeType: q.mimeType,
				search: q.search,
				limit: q.limit ?? 20,
				offset: q.offset ?? 0
			};

			const [fetchedAssets, totalAssets] = await Promise.all([
				assetService.findAssets(auth.organizationId, filters),
				assetService.findAssets(auth.organizationId, {
					...filters,
					limit: 999999,
					offset: 0
				})
			]);

			const total = totalAssets.length;
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
				}
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
	})
	.post('/', async (c) => {
		try {
			const { assetService } = c.var.aphexCMS;
			const auth = c.var.auth;

			if (!auth || auth.type === 'partial_session') {
				return c.json({ success: false, error: 'Unauthorized' }, 401);
			}

			if (!hasCapability(auth, 'asset.upload')) {
				return c.json({ success: false, error: 'Forbidden: asset.upload capability required' }, 403);
			}

			const formData = await c.req.formData();
			const file = formData.get('file') as File;

			if (!file) {
				return c.json({ success: false, error: 'No file provided' }, 400);
			}

			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			const allowedMimeTypesRaw = formData.get('allowedMimeTypes') as string | null;
			const maxSizeRaw = formData.get('maxSize') as string | null;
			const allowedMimeTypes = allowedMimeTypesRaw ? JSON.parse(allowedMimeTypesRaw) : undefined;
			const maxSize = maxSizeRaw ? parseInt(maxSizeRaw, 10) : undefined;

			const validation = validateFile(buffer, file.name, file.type, {
				allowedMimeTypes,
				maxSize
			});

			if (!validation.valid) {
				return c.json({ success: false, error: validation.error }, 400);
			}

			const title = (formData.get('title') as string) || undefined;
			const description = (formData.get('description') as string) || undefined;
			const alt = (formData.get('alt') as string) || undefined;
			const creditLine = (formData.get('creditLine') as string) || undefined;

			const schemaType = (formData.get('schemaType') as string) || undefined;
			const fieldPath = (formData.get('fieldPath') as string) || undefined;

			const targetOrganizationId = auth.organizationId;

			const uploadData = {
				organizationId: targetOrganizationId,
				buffer,
				originalFilename: file.name,
				mimeType: file.type,
				size: file.size,
				title,
				description,
				alt,
				creditLine,
				createdBy: auth.type === 'session' ? auth.user.id : undefined,
				metadata: {
					schemaType,
					fieldPath
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
