import { c as cmsLogger } from './logger-C1WBmfZZ.js';
import './utils-FiC4zhrQ.js';
import './storage-CxrQC-cN.js';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import 'fs/promises';
import 'path';
import './_commonjsHelpers-C1uiShF5.js';

const GET = async ({ locals, params }) => {
  const { type } = params;
  const { cmsEngine } = locals.aphexCMS;
  if (!type) {
    return new Response(JSON.stringify({ error: "Schema type is required" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }
  cmsLogger.debug("GETTING SCHEMA TYPE FROM: ", type);
  const schema = cmsEngine.getSchemaTypeByName(type);
  cmsLogger.debug("SCHEMA: ", schema);
  if (!schema) {
    return new Response(JSON.stringify({ error: `Schema type '${type}' not found` }), {
      status: 404,
      headers: { "content-type": "application/json" }
    });
  }
  return new Response(
    JSON.stringify({
      success: true,
      data: schema
    }),
    {
      headers: { "content-type": "application/json" }
    }
  );
};

export { GET };
//# sourceMappingURL=_server.ts-BzFHNVEc.js.map
