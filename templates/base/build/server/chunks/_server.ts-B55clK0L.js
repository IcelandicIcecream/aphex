import './utils-gGoUUMc2.js';
import './storage-_ubboXxO.js';
import 'sharp';
import 'fs/promises';
import 'path';

const GET = async ({ locals, params }) => {
  const { type } = params;
  const { cmsEngine } = locals.aphexCMS;
  if (!type) {
    return new Response(JSON.stringify({ error: "Schema type is required" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }
  console.log("GETTING SCHEMA TYPE FROM: ", type);
  const schema = cmsEngine.getSchemaTypeByName(type);
  console.log("SCHEMA: ", schema);
  if (!schema) {
    return new Response(JSON.stringify({ error: `Schema type '${type}' not found` }), {
      status: 404,
      headers: { "content-type": "application/json" }
    });
  }
  return new Response(JSON.stringify({
    success: true,
    data: schema
  }), {
    headers: { "content-type": "application/json" }
  });
};

export { GET };
//# sourceMappingURL=_server.ts-B55clK0L.js.map
