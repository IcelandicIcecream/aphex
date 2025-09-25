// API routes for individual documents
import { json } from '@sveltejs/kit';
import { DocumentsDB } from '$lib/db/index.js';
import type { RequestHandler } from './$types.js';

// GET /api/documents/[id] - Get document by ID
export const GET: RequestHandler = async ({ params }) => {
  try {
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

    const document = await DocumentsDB.findById(id);

    if (!document) {
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
      data: document
    });

  } catch (error) {
    console.error('Failed to fetch document:', error);
    return json(
      {
        success: false,
        error: 'Failed to fetch document',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

// PUT /api/documents/[id] - Update document by ID
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
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

    const body = await request.json();

    if (!body.data) {
      return json(
        {
          success: false,
          error: 'Missing data',
          message: 'Document data is required for updates'
        },
        { status: 400 }
      );
    }

    // Update draft data only (published version stays stable)
    const updatedDocument = await DocumentsDB.updateDraft(id, body.data);

    if (!updatedDocument) {
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
      data: updatedDocument
    });

  } catch (error) {
    console.error('Failed to update document:', error);
    return json(
      {
        success: false,
        error: 'Failed to update document',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

// DELETE /api/documents/[id] - Delete document by ID
export const DELETE: RequestHandler = async ({ params }) => {
  try {
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

    const deleted = await DocumentsDB.deleteById(id);

    if (!deleted) {
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
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete document:', error);
    return json(
      {
        success: false,
        error: 'Failed to delete document',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};