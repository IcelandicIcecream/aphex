import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, locals }) => {
  try {

    const { assetService } = locals.aphexCMS;
    const { id } = params;

    if (!id) {
      return json({ error: 'Asset ID is required' }, { status: 400 });
    }

    const asset = await assetService.findAssetById(id);

    if (!asset) {
      return json({ error: 'Asset not found' }, { status: 404 });
    }

    console.log('[assets-by-id] Found asset:', {
      id: asset.id,
      url: asset.url,
      path: asset.path,
      filename: asset.filename
    });

    // Return Sanity-style asset response
    return json({
      _type: asset.assetType === 'image' ? 'sanity.imageAsset' : 'sanity.fileAsset',
      _id: asset.id,
      url: asset.url,
      originalFilename: asset.originalFilename,
      mimeType: asset.mimeType,
      size: asset.size,
      metadata: {
        dimensions: asset.width && asset.height ? {
          width: asset.width,
          height: asset.height
        } : undefined,
        ...asset.metadata
      },
      title: asset.title,
      description: asset.description,
      alt: asset.alt,
      creditLine: asset.creditLine,
      _createdAt: asset.createdAt,
      _updatedAt: asset.updatedAt
    });

  } catch (error) {
    console.error('Error fetching asset:', error);
    return json({ error: 'Failed to fetch asset' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    const { id } = params;
    const { assetService } = locals.aphexCMS;

    if (!id) {
      return json({ error: 'Asset ID is required' }, { status: 400 });
    }

    const success = await assetService.deleteAsset(id);

    if (!success) {
      return json({ error: 'Asset not found or could not be deleted' }, { status: 404 });
    }

    return json({ success: true });

  } catch (error) {
    console.error('Error deleting asset:', error);
    return json({ error: 'Failed to delete asset' }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id) {
      return json({ error: 'Asset ID is required' }, { status: 400 });
    }

    const { title, description, alt, creditLine } = await request.json();

    const updatedAsset = await assetService.updateAssetMetadata(id, {
      title,
      description,
      alt,
      creditLine
    });

    if (!updatedAsset) {
      return json({ error: 'Asset not found' }, { status: 404 });
    }

    // Return Sanity-style asset response
    return json({
      _type: updatedAsset.assetType === 'image' ? 'sanity.imageAsset' : 'sanity.fileAsset',
      _id: updatedAsset.id,
      url: updatedAsset.url,
      originalFilename: updatedAsset.originalFilename,
      mimeType: updatedAsset.mimeType,
      size: updatedAsset.size,
      metadata: {
        dimensions: updatedAsset.width && updatedAsset.height ? {
          width: updatedAsset.width,
          height: updatedAsset.height
        } : undefined,
        ...updatedAsset.metadata
      },
      title: updatedAsset.title,
      description: updatedAsset.description,
      alt: updatedAsset.alt,
      creditLine: updatedAsset.creditLine,
      _createdAt: updatedAsset.createdAt,
      _updatedAt: updatedAsset.updatedAt
    });

  } catch (error) {
    console.error('Error updating asset:', error);
    return json({ error: 'Failed to update asset' }, { status: 500 });
  }
};
