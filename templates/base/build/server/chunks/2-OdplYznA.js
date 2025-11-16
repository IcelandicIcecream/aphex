import { c as cmsConfig } from './aphex.config-m9M2q4ce.js';
import './utils-gGoUUMc2.js';
import './storage-_ubboXxO.js';
import 'fs/promises';
import 'path';
import 'sharp';
import './index6-BnUmswa-.js';
import './list-todo-oKtgC1b1.js';
import './index2-PlYtOn9l.js';
import './context-DL4CYGHS.js';
import './Icon-DHGqHCBy.js';
import './index4-DKPpYvdn.js';
import './service-CEhtyGUm.js';
import './instance-CdYwVbs3.js';
import './index3-D3XGwzxA.js';
import 'drizzle-orm/postgres-js';
import 'postgres';
import './shared-server-DaWdgxVh.js';
import '@aphexcms/postgresql-adapter';
import '@aphexcms/postgresql-adapter/schema';
import 'drizzle-orm/pg-core';
import './instance2-stPrjck3.js';
import 'better-auth';
import 'better-auth/plugins';
import 'better-auth/adapters/drizzle';
import 'better-auth/api';
import '@aphexcms/resend-adapter';
import 'drizzle-orm';

const load = async ({ locals }) => {
  try {
    const auth = locals.auth;
    if (!auth || auth.type !== "session") {
      console.error("[Layout Load] No session found");
      throw new Error("No session found");
    }
    const db = locals.aphexCMS.databaseAdapter;
    const userOrgMemberships = await db.findUserOrganizations(auth.user.id);
    const organizations = userOrgMemberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.member.role,
      isActive: membership.organization.id === auth.organizationId,
      metadata: membership.organization.metadata
    }));
    const activeOrganization = organizations.find((org) => org.isActive);
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
      activeOrganization
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
const component = async () => component_cache ??= (await import('./_layout.svelte-DMjiRUDe.js')).default;
const server_id = "src/routes/(protected)/admin/+layout.server.ts";
const imports = ["_app/immutable/nodes/2.Edb3IFZK.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DWBROaph.js","_app/immutable/chunks/CrQaW3DA.js","_app/immutable/chunks/Da8QwHVz.js","_app/immutable/chunks/zhm3sqsy.js","_app/immutable/chunks/CI7EuJFJ.js","_app/immutable/chunks/CMwlA4jW.js","_app/immutable/chunks/CC2su3ap.js","_app/immutable/chunks/D4agE4Ng.js","_app/immutable/chunks/CQxSK_kJ.js","_app/immutable/chunks/CgH_2WnA.js","_app/immutable/chunks/D8BKmG1w.js","_app/immutable/chunks/DL8tdTp6.js","_app/immutable/chunks/CrOXdnIQ.js","_app/immutable/chunks/AHJMyVxs.js","_app/immutable/chunks/DJpeLsgd.js","_app/immutable/chunks/BSYjuwBa.js","_app/immutable/chunks/Cpo51NEr.js","_app/immutable/chunks/BegLjn8u.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=2-OdplYznA.js.map
