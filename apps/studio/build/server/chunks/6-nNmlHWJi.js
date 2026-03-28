import './logger-C1WBmfZZ.js';
import { r as redirect } from './index-BcOZ6EV9.js';
import './storage-CxrQC-cN.js';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import './utils-FiC4zhrQ.js';
import 'fs/promises';
import 'path';
import './_commonjsHelpers-C1uiShF5.js';

function isViewer(auth) {
  if (auth.type === "partial_session") return true;
  if (auth.type === "api_key") {
    return !auth.permissions.includes("write");
  }
  return auth.organizationRole === "viewer";
}
async function load({ locals }) {
  try {
    const { cmsEngine, databaseAdapter } = locals.aphexCMS;
    const auth = locals.auth;
    if (!auth) {
      redirect(307, "/login");
    }
    const schemaError = locals.aphexCMS.schemaError;
    if (schemaError) {
      return {
        documentTypes: [],
        schemaError: {
          message: schemaError.message
        },
        graphqlSettings: null,
        isReadOnly: false,
        userPreferences: null
      };
    }
    const documentTypes = await cmsEngine.listDocumentTypes();
    const userProfile = await databaseAdapter.findUserProfileById(
      auth.type == "session" ? auth.user.id : ""
    );
    const userPreferences = userProfile?.preferences || {};
    const graphqlSettings = locals.aphexCMS?.graphqlSettings ?? null;
    const isReadOnly = auth?.type === "session" ? isViewer(auth) : false;
    return {
      documentTypes,
      schemaError: null,
      graphqlSettings,
      isReadOnly,
      userPreferences
    };
  } catch (error) {
    console.error("Failed to load schema types:", error);
    return {
      documentTypes: [],
      schemaError: {
        message: error instanceof Error ? error.message : "Unknown schema error"
      },
      graphqlSettings: null,
      isReadOnly: false,
      userPreferences: null
    };
  }
}

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 6;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-yG2AZu2z.js')).default;
const server_id = "src/routes/(protected)/admin/+page.server.ts";
const imports = ["_app/immutable/nodes/6.q201RH19.js","_app/immutable/chunks/BDCi2jMF.js","_app/immutable/chunks/CK91KPpo.js","_app/immutable/chunks/Cp5qd9Zb.js","_app/immutable/chunks/CPc8x607.js","_app/immutable/chunks/D8MlOj3o.js","_app/immutable/chunks/CcHWWnoU.js","_app/immutable/chunks/C0mwdGTf.js","_app/immutable/chunks/dt7zgPvE.js","_app/immutable/chunks/DUACBwDd.js","_app/immutable/chunks/BxkjPDAx.js","_app/immutable/chunks/DYT902qo.js","_app/immutable/chunks/o_7Dr-qM.js","_app/immutable/chunks/IhlVLgJr.js","_app/immutable/chunks/ChS4WpBa.js","_app/immutable/chunks/COl6ZeUq.js","_app/immutable/chunks/XlMopvfE.js","_app/immutable/chunks/BQvIzZR_.js","_app/immutable/chunks/Bcrdfp_K.js","_app/immutable/chunks/ngokrZaz.js","_app/immutable/chunks/CiamAUD5.js","_app/immutable/chunks/BN8Rci2r.js","_app/immutable/chunks/CCfJ1IQK.js","_app/immutable/chunks/CKQTapQa.js","_app/immutable/chunks/D1eK47qZ.js","_app/immutable/chunks/CdktuC_a.js","_app/immutable/chunks/CFr4sN49.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=6-nNmlHWJi.js.map
