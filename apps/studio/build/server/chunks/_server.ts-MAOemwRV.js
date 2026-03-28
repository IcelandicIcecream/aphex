import { c as cmsLogger } from './logger-C1WBmfZZ.js';
import { j as json } from './index-BcOZ6EV9.js';
import './storage-CxrQC-cN.js';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import './utils-FiC4zhrQ.js';
import 'fs/promises';
import 'path';
import './_commonjsHelpers-C1uiShF5.js';

const GET = async ({ params, locals }) => {
  try {
    const { databaseAdapter } = locals.aphexCMS;
    const auth = locals.auth;
    if (!auth || auth.type === "partial_session") {
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = params;
    if (!id) {
      return json({ success: false, error: "Asset ID is required" }, { status: 400 });
    }
    if (!databaseAdapter.findDocumentsReferencingAsset) {
      return json({ success: true, data: { references: [], total: 0 } });
    }
    const references = await databaseAdapter.findDocumentsReferencingAsset(auth.organizationId, id);
    return json({
      success: true,
      data: {
        references,
        total: references.length
      }
    });
  } catch (error) {
    cmsLogger.error("Failed to find asset references:", error);
    return json({ success: false, error: "Failed to find asset references" }, { status: 500 });
  }
};

export { GET };
//# sourceMappingURL=_server.ts-MAOemwRV.js.map
