// Aphex CMS Asset API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { assetService } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth) {
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
		console.error('Asset upload failed:', error);
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

		if (!auth) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		// Parse query parameters
		const assetType = url.searchParams.get('assetType') as 'image' | 'file' | undefined;
		const mimeType = url.searchParams.get('mimeType') || undefined;
		const search = url.searchParams.get('search') || undefined;
		const limitParam = url.searchParams.get('limit');
		const offsetParam = url.searchParams.get('offset');

		const limit = limitParam ? parseInt(limitParam) : 20;
		const offset = offsetParam ? parseInt(offsetParam) : 0;

		const filters = {
			assetType,
			mimeType,
			search,
			limit: isNaN(limit) ? 20 : limit,
			offset: isNaN(offset) ? 0 : offset
		};

		const assets = await assetService.findAssets(auth.organizationId, filters);

		return json({
			success: true,
			data: assets
		});
	} catch (error) {
		console.error('Failed to fetch assets:', error);
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
