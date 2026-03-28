import { d as drizzleDb, b as apikey } from './index2-CZgae6HB.js';
import { eq } from 'drizzle-orm';
import 'drizzle-orm/postgres-js';
import 'postgres';
import './shared-server-BmU87nph.js';
import './logger-C1WBmfZZ.js';
import './utils-FiC4zhrQ.js';
import './storage-CxrQC-cN.js';
import 'fs/promises';
import 'path';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import './_commonjsHelpers-C1uiShF5.js';
import './content-hash-AOe_NOqf.js';
import 'drizzle-orm/pg-core';

const load = async ({ locals }) => {
  const auth = locals.auth;
  if (!auth || auth.type !== "session") {
    throw new Error("No session found");
  }
  const userApiKeys = await drizzleDb.query.apikey.findMany({
    where: eq(apikey.referenceId, auth.user.id),
    columns: {
      id: true,
      name: true,
      metadata: true,
      expiresAt: true,
      lastRequest: true,
      createdAt: true
    },
    orderBy: (apikey2, { desc }) => [desc(apikey2.createdAt)]
  });
  const apiKeysWithPermissions = userApiKeys.map((key) => {
    let metadata = key.metadata;
    if (typeof metadata === "string") {
      metadata = JSON.parse(metadata);
      if (typeof metadata === "string") {
        metadata = JSON.parse(metadata);
      }
    }
    metadata = metadata || null;
    return {
      ...key,
      permissions: metadata?.permissions || [],
      organizationId: metadata?.organizationId
    };
  }).filter((key) => auth.type === "session" && key.organizationId === auth.organizationId);
  return {
    apiKeys: apiKeysWithPermissions
  };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 10;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-DUsw9Fqu.js')).default;
const server_id = "src/routes/(protected)/admin/settings/api-keys/+page.server.ts";
const imports = ["_app/immutable/nodes/10.nKmEJCeo.js","_app/immutable/chunks/BDCi2jMF.js","_app/immutable/chunks/CK91KPpo.js","_app/immutable/chunks/BxkjPDAx.js","_app/immutable/chunks/CPc8x607.js","_app/immutable/chunks/D8MlOj3o.js","_app/immutable/chunks/CcHWWnoU.js","_app/immutable/chunks/C0mwdGTf.js","_app/immutable/chunks/dt7zgPvE.js","_app/immutable/chunks/DUACBwDd.js","_app/immutable/chunks/DYT902qo.js","_app/immutable/chunks/o_7Dr-qM.js","_app/immutable/chunks/IhlVLgJr.js","_app/immutable/chunks/ChS4WpBa.js","_app/immutable/chunks/COl6ZeUq.js","_app/immutable/chunks/XlMopvfE.js","_app/immutable/chunks/CiamAUD5.js","_app/immutable/chunks/Cp5qd9Zb.js","_app/immutable/chunks/BQvIzZR_.js","_app/immutable/chunks/Bcrdfp_K.js","_app/immutable/chunks/ngokrZaz.js","_app/immutable/chunks/BN8Rci2r.js","_app/immutable/chunks/CCfJ1IQK.js","_app/immutable/chunks/CKQTapQa.js","_app/immutable/chunks/D1eK47qZ.js","_app/immutable/chunks/CdktuC_a.js","_app/immutable/chunks/BdKD1BlL.js"];
const stylesheets = ["_app/immutable/assets/Sidebar.DymugIeW.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=10-tt0N2rdq.js.map
