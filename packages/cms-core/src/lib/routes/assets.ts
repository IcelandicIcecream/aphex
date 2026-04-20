// Aphex CMS Asset API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { cmsLogger } from '../utils/logger';
import { validateFile } from '../utils/mime-detect';
import { listAssetsQuery } from '../api/schemas/assets';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { assetService } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type === 'partial_session') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return json({ success: false, error: 'No file provided' }, { status: 400 });
		}

		// Convert file to buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Get allowed MIME types and max size from form data (set by FileField component)
		const allowedMimeTypesRaw = formData.get('allowedMimeTypes') as string | null;
		const maxSizeRaw = formData.get('maxSize') as string | null;
		const allowedMimeTypes = allowedMimeTypesRaw ? JSON.parse(allowedMimeTypesRaw) : undefined;
		const maxSize = maxSizeRaw ? parseInt(maxSizeRaw, 10) : undefined;

		// Validate file content (magic bytes, blocked types, allowed types)
		const validation = validateFile(buffer, file.name, file.type, {
			allowedMimeTypes,
			maxSize
		});

		if (!validation.valid) {
			return json({ success: false, error: validation.error }, { status: 400 });
		}

		// Get optional metadata from form data
		const title = (formData.get('title') as string) || undefined;
		const description = (formData.get('description') as string) || undefined;
		const alt = (formData.get('alt') as string) || undefined;
		const creditLine = (formData.get('creditLine') as string) || undefined;

		// Get field metadata for privacy checking
		const schemaType = (formData.get('schemaType') as string) || undefined;
		const fieldPath = (formData.get('fieldPath') as string) || undefined;

		// Get target organization (document's org takes precedence)
		// This allows assets to belong to the document's org, not the uploader's org
		const targetOrganizationId = (formData.get('organizationId') as string) || auth.organizationId;

		// Create asset upload data
		const uploadData = {
			organizationId: targetOrganizationId, // Asset belongs to document's org
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

		// Upload asset using the service
		// The adapter will validate hierarchy access via withOrgContext
		const asset = await assetService.uploadAsset(targetOrganizationId, uploadData);

		return json({
			success: true,
			data: asset
		});
	} catch (error) {
		cmsLogger.error('Asset upload failed:', error);
		return json(
			{
				success: false,
				error: 'Asset upload failed',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const { assetService } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type === 'partial_session') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const parsedQuery = listAssetsQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
		if (!parsedQuery.success) {
			return json(
				{
					success: false,
					error: 'Invalid query parameters',
					issues: parsedQuery.error.issues
				},
				{ status: 400 }
			);
		}

		const filters = {
			assetType: parsedQuery.data.assetType,
			mimeType: parsedQuery.data.mimeType,
			search: parsedQuery.data.search,
			limit: parsedQuery.data.limit ?? 20,
			offset: parsedQuery.data.offset ?? 0
		};

		// Fetch assets and total count in parallel
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

		return json({
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
		return json(
			{
				success: false,
				error: 'Failed to fetch assets',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
