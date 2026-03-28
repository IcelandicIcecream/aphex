import './logger-C1WBmfZZ.js';
import './utils-FiC4zhrQ.js';
import './storage-CxrQC-cN.js';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import 'fs/promises';
import 'path';
import './_commonjsHelpers-C1uiShF5.js';

const GET = async ({ locals }) => {
  const { cmsEngine } = locals.aphexCMS;
  const schemas = cmsEngine.config.schemaTypes;
  return new Response(
    JSON.stringify({
      success: true,
      data: schemas
    }),
    {
      headers: { "content-type": "application/json" }
    }
  );
};

export { GET };
//# sourceMappingURL=_server.ts-C90dPOIu.js.map
