// Aphex CMS Document API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// Default values for API
const DEFAULT_API_LIMIT = 20;
const DEFAULT_API_OFFSET = 0;

// GET /api/documents - List documents with filtering
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const { documentRepository } = locals.aphexCMS;

    const docType = url.searchParams.get('docType');
    const status = url.searchParams.get('status') || undefined;
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');
    const depthParam = url.searchParams.get('depth');

    // Parse with defaults
    const limit = limitParam ? parseInt(limitParam) : DEFAULT_API_LIMIT;
    const offset = offsetParam ? parseInt(offsetParam) : DEFAULT_API_OFFSET;
    const depth = depthParam ? parseInt(depthParam) : 0;

    const filters = {
      ...(docType && { type: docType }),
      ...(status && { status }),
      limit: isNaN(limit) ? DEFAULT_API_LIMIT : limit,
      offset: isNaN(offset) ? DEFAULT_API_OFFSET : offset,
      depth: isNaN(depth) ? 0 : Math.max(0, Math.min(depth, 5)) // Clamp between 0-5 for safety
    };

    const documents = await documentRepository.findMany(filters);

    return json({
      success: true,
      data: documents,
      meta: {
        count: documents.length,
        limit: filters.limit,
        offset: filters.offset,
        filters: {
          docType,
          status
        }
      }
    });

  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return json(
      {
        success: false,
        error: 'Failed to fetch documents',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

// POST /api/documents - Create new document
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const { documentRepository } = locals.aphexCMS;
    const body = await request.json();

    // Validate required fields (support both old and new format)
    const documentType = body.type;
    const documentData = body.draftData || body.data;

    if (!documentType || !documentData) {
      return json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'Document type and data are required'
        },
        { status: 400 }
      );
    }

    // Create document (always starts as draft)
    const newDocument = await documentRepository.create({
      type: documentType,
      draftData: documentData
    });

    return json({
      success: true,
      data: newDocument
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create document:', error);
    return json(
      {
        success: false,
        error: 'Failed to create document',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};
