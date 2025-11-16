import { j as json } from './index-CpeNL06-.js';
import './storage-_ubboXxO.js';
import 'sharp';
import { a as authToContext } from './auth-helpers-D0NRVV-P.js';
import { a as PermissionError } from './permissions-CiX-uXr2.js';
import './utils-gGoUUMc2.js';
import 'fs/promises';
import 'path';

const POST = async ({ params, locals }) => {
  try {
    const { localAPI, databaseAdapter } = locals.aphexCMS;
    const context = authToContext(locals.auth);
    const { id } = params;
    if (!id) {
      return json({
        success: false,
        error: "Missing document ID",
        message: "Document ID is required"
      }, { status: 400 });
    }
    const rawDoc = await databaseAdapter.findByDocId(context.organizationId, id, 0);
    if (!rawDoc) {
      return json({
        success: false,
        error: "Document not found",
        message: "Document may not exist"
      }, { status: 404 });
    }
    const collection = localAPI.collections[rawDoc.type];
    if (!collection) {
      return json({
        success: false,
        error: "Invalid document type",
        message: `Collection '${rawDoc.type}' not found`
      }, { status: 400 });
    }
    const publishedDocument = await collection.publish(context, id);
    if (!publishedDocument) {
      return json({
        success: false,
        error: "Document not found or cannot be published",
        message: "Document may not have draft content to publish"
      }, { status: 404 });
    }
    return json({
      success: true,
      data: publishedDocument,
      message: "Document published successfully"
    });
  } catch (error) {
    console.error("Failed to publish document:", error);
    if (error instanceof PermissionError) {
      return json({
        success: false,
        error: "Forbidden",
        message: error.message
      }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes("validation errors")) {
      return json({
        success: false,
        error: "Cannot publish: validation errors",
        message: error.message
      }, { status: 400 });
    }
    return json({
      success: false,
      error: "Failed to publish document",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
};
const DELETE = async ({ params, locals }) => {
  try {
    const { localAPI, databaseAdapter } = locals.aphexCMS;
    const context = authToContext(locals.auth);
    const { id } = params;
    if (!id) {
      return json({
        success: false,
        error: "Missing document ID",
        message: "Document ID is required"
      }, { status: 400 });
    }
    const rawDoc = await databaseAdapter.findByDocId(context.organizationId, id, 0);
    if (!rawDoc) {
      return json({
        success: false,
        error: "Document not found",
        message: `No document found with ID: ${id}`
      }, { status: 404 });
    }
    const collection = localAPI.collections[rawDoc.type];
    if (!collection) {
      return json({
        success: false,
        error: "Invalid document type",
        message: `Collection '${rawDoc.type}' not found`
      }, { status: 400 });
    }
    const unpublishedDocument = await collection.unpublish(context, id);
    if (!unpublishedDocument) {
      return json({
        success: false,
        error: "Document not found",
        message: `No document found with ID: ${id}`
      }, { status: 404 });
    }
    return json({
      success: true,
      data: unpublishedDocument,
      message: "Document unpublished successfully"
    });
  } catch (error) {
    console.error("Failed to unpublish document:", error);
    if (error instanceof PermissionError) {
      return json({
        success: false,
        error: "Forbidden",
        message: error.message
      }, { status: 403 });
    }
    return json({
      success: false,
      error: "Failed to unpublish document",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
};

export { DELETE, POST };
//# sourceMappingURL=_server.ts-CoJGxTaP.js.map
