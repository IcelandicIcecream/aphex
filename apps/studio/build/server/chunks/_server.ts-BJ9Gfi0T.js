import { j as json } from './index-BcOZ6EV9.js';
import { a as authToContext } from './auth-helpers--SGkLWtA.js';
import { P as PermissionError } from './permissions-CxMoW_Gg.js';
import { c as cmsLogger } from './logger-C1WBmfZZ.js';
import './utils-FiC4zhrQ.js';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE = 1;
const POST = async ({ request, locals }) => {
  try {
    const { localAPI } = locals.aphexCMS;
    const context = authToContext(locals.auth);
    const body = await request.json();
    const documentType = body.type;
    if (!documentType) {
      return json(
        {
          success: false,
          error: "Bad Request",
          message: "Document type is required in request body"
        },
        { status: 400 }
      );
    }
    if (!localAPI.hasCollection(documentType)) {
      return json(
        {
          success: false,
          error: "Invalid document type",
          message: `Collection '${documentType}' not found. Available: ${localAPI.getCollectionNames().join(", ")}`
        },
        { status: 400 }
      );
    }
    const page = body.page ? Math.max(1, parseInt(body.page)) : DEFAULT_PAGE;
    const pageSize = body.pageSize || body.limit || DEFAULT_PAGE_SIZE;
    const offset = body.offset !== void 0 ? body.offset : (page - 1) * pageSize;
    const findOptions = {
      where: body.where,
      limit: pageSize,
      offset,
      sort: body.sort,
      depth: body.depth !== void 0 ? Math.max(0, Math.min(body.depth, 5)) : 0,
      select: body.select,
      perspective: body.perspective || "draft",
      includeChildOrganizations: body.includeChildOrganizations,
      filterOrganizationIds: body.filterOrganizationIds
    };
    const result = await localAPI.collections[documentType].find(context, findOptions);
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
    cmsLogger.error("Failed to query documents:", error);
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
        error: "Failed to query documents",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};

export { POST };
//# sourceMappingURL=_server.ts-BJ9Gfi0T.js.map
