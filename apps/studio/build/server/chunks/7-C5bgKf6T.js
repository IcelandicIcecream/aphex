import { a as authService } from './service-D_kWyptI.js';
import './instance-BV3tjq30.js';
import './index2-CZgae6HB.js';
import 'drizzle-orm/postgres-js';
import 'postgres';
import './shared-server-BmU87nph.js';
import 'drizzle-orm';
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
import './index8-DrQ5zxy0.js';
import 'events';
import 'url';
import 'util';
import 'fs';
import 'http';
import 'https';
import 'zlib';
import 'stream';
import 'net';
import 'dns';
import 'os';
import 'crypto';
import 'tls';
import 'child_process';
import 'node:crypto';
import './button-1bYQaKO-.js';
import './index5-DltsKoco.js';
import './context-CAhUmS6w.js';
import './utils2-CVx6kO_W.js';
import './badge-DEuvdmY7.js';
import './sheet-content-CfdNXqIw.js';
import './create-id-BLMzD-FL.js';
import './index3-BFl01i1Z.js';
import './states.svelte-CxCkWsnb.js';
import './events-C5y5VZ_W.js';
import './exports-Ci9YzwMm.js';
import './client-BGGljB7r.js';
import './html-FW6Ia4bL.js';
import './string-BWrpxotr.js';
import '@better-auth/api-key';
import '@better-auth/drizzle-adapter';
import './auth-errors-BOr7Rsjn.js';

const load = async ({ locals }) => {
  const { databaseAdapter } = locals.aphexCMS;
  const auth = locals.auth;
  if (!auth || auth.type !== "session") {
    return { organizations: [] };
  }
  const memberships = await databaseAdapter.findUserOrganizations(auth.user.id);
  const orgs = await Promise.all(
    memberships.map(async (membership) => {
      const members = await databaseAdapter.findOrganizationMembers(membership.organization.id);
      const owner = members.find((m) => m.role === "owner");
      let ownerEmail;
      if (owner) {
        const ownerUser = await authService.getUserById(owner.userId);
        ownerEmail = ownerUser?.email;
      }
      return {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: membership.member.role,
        isActive: membership.organization.id === auth.organizationId,
        memberCount: members.length,
        ownerEmail
      };
    })
  );
  return { organizations: orgs };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 7;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-zDvx_K4A.js')).default;
const server_id = "src/routes/(protected)/admin/organizations/+page.server.ts";
const imports = ["_app/immutable/nodes/7.Did6OHvq.js","_app/immutable/chunks/BDCi2jMF.js","_app/immutable/chunks/CK91KPpo.js","_app/immutable/chunks/C0mwdGTf.js","_app/immutable/chunks/dt7zgPvE.js","_app/immutable/chunks/BxkjPDAx.js","_app/immutable/chunks/BQvIzZR_.js","_app/immutable/chunks/Bcrdfp_K.js","_app/immutable/chunks/ngokrZaz.js","_app/immutable/chunks/CPc8x607.js","_app/immutable/chunks/D8MlOj3o.js","_app/immutable/chunks/DUACBwDd.js","_app/immutable/chunks/o_7Dr-qM.js","_app/immutable/chunks/IhlVLgJr.js","_app/immutable/chunks/ChS4WpBa.js","_app/immutable/chunks/DYT902qo.js","_app/immutable/chunks/COl6ZeUq.js","_app/immutable/chunks/XlMopvfE.js","_app/immutable/chunks/Cp5qd9Zb.js","_app/immutable/chunks/CcHWWnoU.js","_app/immutable/chunks/CiamAUD5.js","_app/immutable/chunks/BN8Rci2r.js","_app/immutable/chunks/CCfJ1IQK.js","_app/immutable/chunks/CKQTapQa.js","_app/immutable/chunks/D1eK47qZ.js","_app/immutable/chunks/CdktuC_a.js","_app/immutable/chunks/BdKD1BlL.js","_app/immutable/chunks/BA8ioc0K.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=7-C5bgKf6T.js.map
