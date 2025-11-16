import './utils-gGoUUMc2.js';
import './storage-_ubboXxO.js';
import 'sharp';
import 'fs/promises';
import 'path';

function isViewer(auth) {
  if (auth.type === "api_key") {
    return !auth.permissions.includes("write");
  }
  return auth.organizationRole === "viewer";
}
async function load({ locals }) {
  try {
    const { cmsEngine, config } = locals.aphexCMS;
    const auth = locals.auth;
    console.log("[Admin Page] Schema types count:", config.schemaTypes?.length);
    console.log(
      "[Admin Page] Schema types:",
      config.schemaTypes?.map((s) => s.name)
    );
    const documentTypes = await cmsEngine.listDocumentTypes();
    console.log("[Admin Page] Document types count:", documentTypes.length);
    const graphqlPlugin = config.plugins?.find((p) => p.name === "@aphexcms/graphql-plugin");
    let graphqlSettings = null;
    if (graphqlPlugin && graphqlPlugin.config) {
      graphqlSettings = {
        endpoint: graphqlPlugin.config.endpoint,
        enableGraphiQL: graphqlPlugin.config.enableGraphiQL
      };
    }
    const isReadOnly = auth?.type === "session" ? isViewer(auth) : false;
    return {
      documentTypes,
      schemaError: null,
      graphqlSettings,
      isReadOnly
    };
  } catch (error) {
    console.error("Failed to load schema types:", error);
    return {
      documentTypes: [],
      schemaError: {
        message: error instanceof Error ? error.message : "Unknown schema error"
      },
      graphqlSettings: null
    };
  }
}

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 4;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-CLpFd4B3.js')).default;
const server_id = "src/routes/(protected)/admin/+page.server.ts";
const imports = ["_app/immutable/nodes/4.BTpbX4fv.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DWBROaph.js","_app/immutable/chunks/Da8QwHVz.js","_app/immutable/chunks/zhm3sqsy.js","_app/immutable/chunks/CrQaW3DA.js","_app/immutable/chunks/CI7EuJFJ.js","_app/immutable/chunks/CMwlA4jW.js","_app/immutable/chunks/CC2su3ap.js","_app/immutable/chunks/D4agE4Ng.js","_app/immutable/chunks/CQxSK_kJ.js","_app/immutable/chunks/CgH_2WnA.js","_app/immutable/chunks/D8BKmG1w.js","_app/immutable/chunks/DL8tdTp6.js","_app/immutable/chunks/CrOXdnIQ.js","_app/immutable/chunks/AHJMyVxs.js","_app/immutable/chunks/DJpeLsgd.js","_app/immutable/chunks/BVXJ_ZUV.js","_app/immutable/chunks/Cpo51NEr.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=4-Di0Lu3Jy.js.map
