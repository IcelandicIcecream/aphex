import './utils-gGoUUMc2.js';
import './storage-_ubboXxO.js';
import 'sharp';
import 'fs/promises';
import 'path';

const GET = async ({ locals }) => {
  const { cmsEngine } = locals.aphexCMS;
  const schemas = cmsEngine.config.schemaTypes;
  return new Response(JSON.stringify({
    success: true,
    data: schemas
  }), {
    headers: { "content-type": "application/json" }
  });
};

export { GET };
//# sourceMappingURL=_server.ts-monPx8jd.js.map
