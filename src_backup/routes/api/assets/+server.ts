import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assetService } from '$lib/cms/services';
import type { AssetUploadData } from '$lib/cms/services';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get optional metadata from form data
    const title = formData.get('title') as string || undefined;
    const description = formData.get('description') as string || undefined;
    const alt = formData.get('alt') as string || undefined;
    const creditLine = formData.get('creditLine') as string || undefined;

    // Prepare upload data
    const uploadData: AssetUploadData = {
      buffer,
      originalFilename: file.name,
      mimeType: file.type,
      size: file.size,
      title,
      description,
      alt,
      creditLine
    };

    // Upload using the asset service
    const asset = await assetService.uploadAsset(uploadData);

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
    console.error('Error uploading asset:', error);
    
    if (error instanceof Error) {
      return json({ error: error.message }, { status: 400 });
    }
    
    return json({ error: 'Failed to upload asset' }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const assetType = url.searchParams.get('type') as 'image' | 'file' | undefined;
    const search = url.searchParams.get('search') || undefined;

    const assets = await assetService.findAssets({
      assetType,
      search,
      limit,
      offset
    });

    // Transform to Sanity-style response
    const transformedAssets = assets.map(asset => ({
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
    }));

    return json({
      assets: transformedAssets,
      hasMore: assets.length === limit
    });

  } catch (error) {
    console.error('Error fetching assets:', error);
    return json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
};