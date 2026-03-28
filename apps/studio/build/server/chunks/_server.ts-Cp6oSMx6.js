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

const GET = async ({ params, url, locals }) => {
  try {
    const { localAPI, databaseAdapter } = locals.aphexCMS;
    const context = authToContext(locals.auth);
    const { id } = params;
    if (!id) {
      return json({ success: false, error: "Document ID is required" }, { status: 400 });
    }
    const depthParam = url.searchParams.get("depth");
    const depth = depthParam ? Math.max(0, Math.min(parseInt(depthParam), 5)) : 0;
    const perspective = url.searchParams.get("perspective") || "draft";
    const rawDoc = await databaseAdapter.findByDocIdAdvanced(context.organizationId, id);
    if (!rawDoc) {
      return json({ success: false, error: "Document not found" }, { status: 404 });
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
    const document = await collection.findByID(context, id, {
      depth,
      perspective
    });
    if (!document) {
      return json({ success: false, error: "Document not found" }, { status: 404 });
    }
    return json({
      success: true,
      data: document
    });
  } catch (error) {
    cmsLogger.error("Failed to fetch document:", error);
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
        error: "Failed to fetch document",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};
const PUT = async ({ params, request, locals }) => {
  try {
    const { localAPI, databaseAdapter } = locals.aphexCMS;
    const context = authToContext(locals.auth);
    const { id } = params;
    const body = await request.json();
    if (!id) {
      return json({ success: false, error: "Document ID is required" }, { status: 400 });
    }
    const documentData = body.draftData || body.data;
    const shouldPublish = body.publish || false;
    const rawDoc = await databaseAdapter.findByDocIdAdvanced(context.organizationId, id);
    if (!rawDoc) {
      return json({ success: false, error: "Document not found" }, { status: 404 });
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
    const result = await collection.update(context, id, documentData, {
      publish: shouldPublish
    });
    if (!result) {
      return json({ success: false, error: "Document not found" }, { status: 404 });
    }
    return json({
      success: true,
      data: result.document,
      validation: result.validation
    });
  } catch (error) {
    cmsLogger.error("Failed to update document:", error);
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
          error: "Validation failed",
          message: error.message
        },
        { status: 400 }
      );
    }
    return json(
      {
        success: false,
        error: "Failed to update document",
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
      return json({ success: false, error: "Document ID is required" }, { status: 400 });
    }
    const rawDoc = await databaseAdapter.findByDocIdAdvanced(context.organizationId, id);
    if (!rawDoc) {
      return json({ success: false, error: "Document not found" }, { status: 404 });
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
    const success = await collection.delete(context, id);
    if (!success) {
      return json({ success: false, error: "Document not found" }, { status: 404 });
    }
    return json({
      success: true,
      message: "Document deleted successfully"
    });
  } catch (error) {
    cmsLogger.error("Failed to delete document:", error);
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
        error: "Failed to delete document",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};

export { DELETE, GET, PUT };
//# sourceMappingURL=_server.ts-Cp6oSMx6.js.map
