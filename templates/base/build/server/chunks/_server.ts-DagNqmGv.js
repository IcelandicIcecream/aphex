import { j as json } from './index-CpeNL06-.js';
import './storage-_ubboXxO.js';
import 'sharp';
import { a as authToContext } from './auth-helpers-D0NRVV-P.js';
import { a as PermissionError } from './permissions-CiX-uXr2.js';
import './utils-gGoUUMc2.js';
import 'fs/promises';
import 'path';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE = 1;
const GET = async ({ url, locals }) => {
  try {
    const { localAPI } = locals.aphexCMS;
    const context = authToContext(locals.auth);
    const docType = url.searchParams.get("type") || url.searchParams.get("docType");
    const status = url.searchParams.get("status");
    const pageParam = url.searchParams.get("page");
    const pageSizeParam = url.searchParams.get("pageSize") || url.searchParams.get("limit");
    const depthParam = url.searchParams.get("depth");
    const sortParam = url.searchParams.get("sort");
    const perspective = url.searchParams.get("perspective") || "draft";
    const page = pageParam ? Math.max(1, parseInt(pageParam)) : DEFAULT_PAGE;
    const pageSize = pageSizeParam ? parseInt(pageSizeParam) : DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * pageSize;
    const depth = depthParam ? Math.max(0, Math.min(parseInt(depthParam), 5)) : 0;
    if (!docType) {
      return json({
        success: false,
        error: "Bad Request",
        message: "Document type is required. Use ?type=page or ?docType=page"
      }, { status: 400 });
    }
    const collection = localAPI.collections[docType];
    if (!collection) {
      return json({
        success: false,
        error: "Invalid document type",
        message: `Collection '${docType}' not found. Available: ${localAPI.getCollectionNames().join(", ")}`
      }, { status: 400 });
    }
    const where = {};
    if (status) {
      where.status = { equals: status };
    }
    const result = await collection.find(context, {
      where: Object.keys(where).length > 0 ? where : void 0,
      limit: pageSize,
      offset,
      depth,
      sort: sortParam || void 0,
      perspective
    });
    return json({
      success: true,
      data: result.docs,
      pagination: {
        total: result.totalDocs,
        page: result.page,
        pageSize: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      }
    });
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    if (error instanceof PermissionError) {
      return json({
        success: false,
        error: "Forbidden",
        message: error.message
      }, { status: 403 });
    }
    return json({
      success: false,
      error: "Failed to fetch documents",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
};
const POST = async ({ request, locals }) => {
  try {
    const { localAPI } = locals.aphexCMS;
    const context = authToContext(locals.auth);
    const body = await request.json();
    const documentType = body.type;
    const documentData = body.draftData || body.data;
    const shouldPublish = body.publish || false;
    if (!documentType || !documentData) {
      return json({
        success: false,
        error: "Missing required fields",
        message: "Document type and data are required"
      }, { status: 400 });
    }
    const collection = localAPI.collections[documentType];
    if (!collection) {
      return json({
        success: false,
        error: "Invalid document type",
        message: `Collection '${documentType}' not found. Available: ${localAPI.getCollectionNames().join(", ")}`
      }, { status: 400 });
    }
    const newDocument = await collection.create(context, documentData, {
      publish: shouldPublish
    });
    return json({
      success: true,
      data: newDocument
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create document:", error);
    if (error instanceof PermissionError) {
      return json({
        success: false,
        error: "Forbidden",
        message: error.message
      }, { status: 403 });
    }
    return json({
      success: false,
      error: "Failed to create document",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
};

export { GET, POST };
//# sourceMappingURL=_server.ts-DagNqmGv.js.map
