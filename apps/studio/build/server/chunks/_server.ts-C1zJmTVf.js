import { c as cmsLogger } from './logger-C1WBmfZZ.js';
import { j as json } from './index-BcOZ6EV9.js';
import './storage-CxrQC-cN.js';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import './utils-FiC4zhrQ.js';
import 'fs/promises';
import 'path';
import './_commonjsHelpers-C1uiShF5.js';

const POST = async ({ request, locals }) => {
  try {
    const { databaseAdapter } = locals.aphexCMS;
    const auth = locals.auth;
    if (!auth || auth.type === "partial_session") {
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return json({ success: true, data: {} });
    }
    if (!databaseAdapter.countDocumentReferencesForAssets) {
      const counts2 = {};
      for (const id of ids) counts2[id] = 0;
      return json({ success: true, data: counts2 });
    }
    const counts = await databaseAdapter.countDocumentReferencesForAssets(auth.organizationId, ids);
    return json({ success: true, data: counts });
  } catch (error) {
    cmsLogger.error("Failed to count asset references:", error);
    return json({ success: false, error: "Failed to count asset references" }, { status: 500 });
  }
};

export { POST };
//# sourceMappingURL=_server.ts-C1zJmTVf.js.map
