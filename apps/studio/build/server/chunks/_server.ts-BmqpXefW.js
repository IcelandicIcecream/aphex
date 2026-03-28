import { c as cmsLogger } from './logger-C1WBmfZZ.js';
import { j as json } from './index-BcOZ6EV9.js';
import './storage-CxrQC-cN.js';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import { a as authToContext } from './auth-helpers--SGkLWtA.js';
import { P as PermissionError } from './permissions-CxMoW_Gg.js';
import './utils-FiC4zhrQ.js';
import 'fs/promises';
import 'path';
import './_commonjsHelpers-C1uiShF5.js';

const POST = async ({ params, locals }) => {
  try {
    const { localAPI, databaseAdapter } = locals.aphexCMS;
    const context = authToContext(locals.auth);
    const { id } = params;
    if (!id) {
      return json(
        {
          success: false,
          error: "Missing document ID",
          message: "Document ID is required"
        },
        { status: 400 }
      );
    }
    const rawDoc = await databaseAdapter.findByDocIdAdvanced(context.organizationId, id);
    if (!rawDoc) {
      return json(
        {
          success: false,
          error: "Document not found",
          message: "Document may not exist"
        },
        { status: 404 }
      );
    }
    const collection = localAPI.collections[rawDoc.type];
    if (!collection) {
      return json(
        {
          success: false,
          error: "Invalid document type",
          message: `Collection '${rawDoc.type}' not found`
        },
        { status: 400 }
      );
    }
    const publishedDocument = await collection.publish(context, id);
    if (!publishedDocument) {
      return json(
        {
          success: false,
          error: "Document not found or cannot be published",
          message: "Document may not have draft content to publish"
        },
        { status: 404 }
      );
    }
    return json({
      success: true,
      data: publishedDocument,
      message: "Document published successfully"
    });
  } catch (error) {
    cmsLogger.error("Failed to publish document:", error);
    if (error instanceof PermissionError) {
      return json(
        {
          success: false,
          error: "Forbidden",
          message: error.message
        },
        { status: 403 }
      );
    }
    if (error instanceof Error && error.message.includes("validation errors")) {
      return json(
        {
          success: false,
          error: "Cannot publish: validation errors",
          message: error.message
        },
        { status: 400 }
      );
    }
    return json(
      {
        success: false,
        error: "Failed to publish document",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};
const DELETE = async ({ params, locals }) => {
  try {
    const { localAPI, databaseAdapter } = locals.aphexCMS;
    const context = authToContext(locals.auth);
    const { id } = params;
    if (!id) {
      return json(
        {
          success: false,
          error: "Missing document ID",
          message: "Document ID is required"
        },
        { status: 400 }
      );
    }
    const rawDoc = await databaseAdapter.findByDocIdAdvanced(context.organizationId, id);
    if (!rawDoc) {
      return json(
        {
          success: false,
          error: "Document not found",
          message: `No document found with ID: ${id}`
        },
        { status: 404 }
      );
    }
    const collection = localAPI.collections[rawDoc.type];
    if (!collection) {
      return json(
        {
          success: false,
          error: "Invalid document type",
          message: `Collection '${rawDoc.type}' not found`
        },
        { status: 400 }
      );
    }
    const unpublishedDocument = await collection.unpublish(context, id);
    if (!unpublishedDocument) {
      return json(
        {
          success: false,
          error: "Document not found",
          message: `No document found with ID: ${id}`
        },
        { status: 404 }
      );
    }
    return json({
      success: true,
      data: unpublishedDocument,
      message: "Document unpublished successfully"
    });
  } catch (error) {
    cmsLogger.error("Failed to unpublish document:", error);
    if (error instanceof PermissionError) {
      return json(
        {
          success: false,
          error: "Forbidden",
          message: error.message
        },
        { status: 403 }
      );
    }
    return json(
      {
        success: false,
        error: "Failed to unpublish document",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};

export { DELETE, POST };
//# sourceMappingURL=_server.ts-BmqpXefW.js.map
