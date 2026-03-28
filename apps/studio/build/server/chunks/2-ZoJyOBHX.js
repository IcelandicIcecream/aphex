import { r as redirect } from './index-BcOZ6EV9.js';
import cmsConfig from './aphex.config-DsKkSS9t.js';
import './utils-FiC4zhrQ.js';
import './logger-C1WBmfZZ.js';
import './storage-CxrQC-cN.js';
import 'fs/promises';
import 'path';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import './_commonjsHelpers-C1uiShF5.js';
import './index12-ZuUw5hPA.js';
import './index5-DltsKoco.js';
import './context-CAhUmS6w.js';
import './Icon-DO-BLZpI.js';
import './sheet-content-CfdNXqIw.js';
import './utils2-CVx6kO_W.js';
import './button-1bYQaKO-.js';
import './create-id-BLMzD-FL.js';
import './index3-BFl01i1Z.js';
import './states.svelte-CxCkWsnb.js';
import './events-C5y5VZ_W.js';
import './exports-Ci9YzwMm.js';
import './mail-BIlX5HQf.js';
import './index4-FTZh_aP0.js';
import './service-D_kWyptI.js';
import './instance-BV3tjq30.js';
import './index2-CZgae6HB.js';
import 'drizzle-orm/postgres-js';
import 'postgres';
import './shared-server-BmU87nph.js';
import 'drizzle-orm';
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
import './badge-DEuvdmY7.js';
import './client-BGGljB7r.js';
import './html-FW6Ia4bL.js';
import './string-BWrpxotr.js';
import '@better-auth/api-key';
import '@better-auth/drizzle-adapter';
import './auth-errors-BOr7Rsjn.js';

const load = async ({ locals, url }) => {
  try {
    const auth = locals.auth;
    if (!auth || auth.type !== "session") {
      console.error("[Layout Load] No session found");
      throw new Error("No session found");
    }
    const db = locals.aphexCMS.databaseAdapter;
    const userOrgMemberships = await db.findUserOrganizations(auth.user.id);
    if (userOrgMemberships.length === 0 && auth.user.role !== "super_admin") {
      throw redirect(302, "/invitations");
    }
    const instanceSettings = await db.getInstanceSettings();
    const organizations = userOrgMemberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.member.role,
      isActive: membership.organization.id === auth.organizationId,
      metadata: membership.organization.metadata
    }));
    const activeOrganization = organizations.find((org) => org.isActive);
    const canCreateOrganization = auth.user.role === "super_admin" || (instanceSettings.allowUserOrgCreation ?? false);
    const sidebarData = {
      user: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
        image: auth.user.image,
        role: auth.user.role
      },
      branding: {
        title: cmsConfig.customization?.branding?.title || "Aphex CMS"
      },
      // Default nav items (can be customized per app)
      navItems: [
        { href: "/admin", label: "Studio" }
        // Apps can add more: Settings, Media, etc.
      ],
      organizations,
      activeOrganization,
      canCreateOrganization
    };
    console.log("[Layout Load] Returning sidebarData:", !!sidebarData);
    return {
      sidebarData
    };
  } catch (error) {
    console.error("[Layout Load] Error:", error);
    throw error;
  }
};

var _layout_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 2;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-ul249Aab.js')).default;
const server_id = "src/routes/(protected)/admin/+layout.server.ts";
const imports = ["_app/immutable/nodes/2.hehoNq28.js","_app/immutable/chunks/BDCi2jMF.js","_app/immutable/chunks/CK91KPpo.js","_app/immutable/chunks/DYT902qo.js","_app/immutable/chunks/dt7zgPvE.js","_app/immutable/chunks/D8MlOj3o.js","_app/immutable/chunks/C0mwdGTf.js","_app/immutable/chunks/Cp5qd9Zb.js","_app/immutable/chunks/CPc8x607.js","_app/immutable/chunks/CcHWWnoU.js","_app/immutable/chunks/DUACBwDd.js","_app/immutable/chunks/BxkjPDAx.js","_app/immutable/chunks/o_7Dr-qM.js","_app/immutable/chunks/IhlVLgJr.js","_app/immutable/chunks/ChS4WpBa.js","_app/immutable/chunks/COl6ZeUq.js","_app/immutable/chunks/XlMopvfE.js","_app/immutable/chunks/BQvIzZR_.js","_app/immutable/chunks/Bcrdfp_K.js","_app/immutable/chunks/ngokrZaz.js","_app/immutable/chunks/CiamAUD5.js","_app/immutable/chunks/BN8Rci2r.js","_app/immutable/chunks/CCfJ1IQK.js","_app/immutable/chunks/CKQTapQa.js","_app/immutable/chunks/D1eK47qZ.js","_app/immutable/chunks/CdktuC_a.js","_app/immutable/chunks/DSFL3bnU.js","_app/immutable/chunks/DLJGT5E3.js","_app/immutable/chunks/CFr4sN49.js"];
const stylesheets = ["_app/immutable/assets/Sidebar.DymugIeW.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=2-ZoJyOBHX.js.map
