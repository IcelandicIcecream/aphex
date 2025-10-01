// Aphex CMS Document Publish API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// POST /api/documents/[id]/publish - Publish document
export const POST: RequestHandler = async ({ params, locals }) => {
  try {
    const { documentRepository } = locals.aphexCMS;
    const { id } = params;

    if (!id) {
      return json(
        {
          success: false,
          error: 'Missing document ID',
          message: 'Document ID is required'
        },
        { status: 400 }
      );
    }

    const publishedDocument = await documentRepository.publish(id);

    if (!publishedDocument) {
      return json(
        {
          success: false,
          error: 'Document not found or cannot be published',
          message: 'Document may not exist or may not have draft content'
        },
        { status: 404 }
      );
    }

    return json({
      success: true,
      data: publishedDocument,
      message: 'Document published successfully'
    });

  } catch (error) {
    console.error('Failed to publish document:', error);
    return json(
      {
        success: false,
        error: 'Failed to publish document',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

// DELETE /api/documents/[id]/publish - Unpublish document
export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    const { documentRepository } = locals.aphexCMS;
    const { id } = params;

    if (!id) {
      return json(
        {
          success: false,
          error: 'Missing document ID',
          message: 'Document ID is required'
        },
        { status: 400 }
      );
    }

    const unpublishedDocument = await documentRepository.unpublish(id);

    if (!unpublishedDocument) {
      return json(
        {
          success: false,
          error: 'Document not found',
          message: `No document found with ID: ${id}`
        },
        { status: 404 }
      );
    }

    return json({
      success: true,
      data: unpublishedDocument,
      message: 'Document unpublished successfully'
    });

  } catch (error) {
    console.error('Failed to unpublish document:', error);
    return json(
      {
        success: false,
        error: 'Failed to unpublish document',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};