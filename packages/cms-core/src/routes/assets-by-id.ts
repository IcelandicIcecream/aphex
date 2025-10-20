import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const { assetService } = locals.aphexCMS;
		const auth = locals.auth;
		const { id } = params;

		if (!auth) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		if (!id) {
			return json({ success: false, error: 'Asset ID is required' }, { status: 400 });
		}

		const asset = await assetService.findAssetById(auth.organizationId, id);

		if (!asset) {
			return json({ success: false, error: 'Asset not found' }, { status: 404 });
		}

		console.log('[assets-by-id] Found asset:', {
			id: asset.id,
			url: asset.url,
			path: asset.path,
			filename: asset.filename
		});

		// Return API response with success wrapper
		return json({
			success: true,
			data: {
				_type: asset.assetType === 'image' ? 'sanity.imageAsset' : 'sanity.fileAsset',
				_id: asset.id,
				url: asset.url,
				originalFilename: asset.originalFilename,
				mimeType: asset.mimeType,
				size: asset.size,
				metadata: {
					dimensions:
						asset.width && asset.height
							? {
									width: asset.width,
									height: asset.height
								}
							: undefined,
					...asset.metadata
				},
				title: asset.title,
				description: asset.description,
				alt: asset.alt,
				creditLine: asset.creditLine,
				_createdAt: asset.createdAt,
				_updatedAt: asset.updatedAt
			}
		});
	} catch (error) {
		console.error('Error fetching asset:', error);
		return json({ success: false, error: 'Failed to fetch asset' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const { id } = params;
		const { assetService } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		if (!id) {
			return json({ success: false, error: 'Asset ID is required' }, { status: 400 });
		}

		const result = await assetService.deleteAsset(auth.organizationId, id);

		if (!result) {
			return json({ success: false, error: 'Asset not found or could not be deleted' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting asset:', error);
		return json({ success: false, error: 'Failed to delete asset' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	try {
		const { assetService } = locals.aphexCMS;
		const auth = locals.auth;
		const { id } = params;

		if (!auth) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		if (!id) {
			return json({ success: false, error: 'Asset ID is required' }, { status: 400 });
		}

		const { title, description, alt, creditLine } = await request.json();

		const updatedAsset = await assetService.updateAssetMetadata(auth.organizationId, id, {
			title,
			description,
			alt,
			creditLine,
			updatedBy: auth.user.id
		});

		if (!updatedAsset) {
			return json({ success: false, error: 'Asset not found' }, { status: 404 });
		}

		// Return API response with success wrapper
		return json({
			success: true,
			data: {
				_type: updatedAsset.assetType === 'image' ? 'sanity.imageAsset' : 'sanity.fileAsset',
				_id: updatedAsset.id,
				url: updatedAsset.url,
				originalFilename: updatedAsset.originalFilename,
				mimeType: updatedAsset.mimeType,
				size: updatedAsset.size,
				metadata: {
					dimensions:
						updatedAsset.width && updatedAsset.height
							? {
									width: updatedAsset.width,
									height: updatedAsset.height
								}
							: undefined,
					...updatedAsset.metadata
				},
				title: updatedAsset.title,
				description: updatedAsset.description,
				alt: updatedAsset.alt,
				creditLine: updatedAsset.creditLine,
				_createdAt: updatedAsset.createdAt,
				_updatedAt: updatedAsset.updatedAt
			}
		});
	} catch (error) {
		console.error('Error updating asset:', error);
		return json({ success: false, error: 'Failed to update asset' }, { status: 500 });
	}
};
