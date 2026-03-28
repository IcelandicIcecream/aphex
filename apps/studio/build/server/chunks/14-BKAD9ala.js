import { r as redirect } from './index-BcOZ6EV9.js';
import './utils-FiC4zhrQ.js';

const load = async ({ locals }) => {
  const auth = locals.auth;
  if (!auth || auth.type === "api_key") {
    throw redirect(302, "/login");
  }
  const { databaseAdapter } = locals.aphexCMS;
  const allInvitations = await databaseAdapter.findInvitationsByEmail(auth.user.email);
  const now = /* @__PURE__ */ new Date();
  const pending = allInvitations.filter((inv) => inv.acceptedAt === null && new Date(inv.expiresAt) > now).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const enriched = await Promise.all(
    pending.map(async (inv) => {
      const org = await databaseAdapter.findOrganizationById(inv.organizationId);
      return {
        id: inv.id,
        organizationId: inv.organizationId,
        organizationName: org?.name ?? "Unknown",
        organizationSlug: org?.slug ?? "",
        role: inv.role,
        email: inv.email,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt
      };
    })
  );
  return {
    pendingInvitations: enriched,
    hasOrganization: auth.type === "session",
    user: {
      email: auth.user.email,
      name: auth.user.name
    }
  };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 14;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-D2JwwrIq.js')).default;
const server_id = "src/routes/invitations/+page.server.ts";
const imports = ["_app/immutable/nodes/14.D7L7pgOE.js","_app/immutable/chunks/BDCi2jMF.js","_app/immutable/chunks/CK91KPpo.js","_app/immutable/chunks/CPc8x607.js","_app/immutable/chunks/D8MlOj3o.js","_app/immutable/chunks/CcHWWnoU.js","_app/immutable/chunks/C0mwdGTf.js","_app/immutable/chunks/dt7zgPvE.js","_app/immutable/chunks/BxkjPDAx.js","_app/immutable/chunks/Bcrdfp_K.js","_app/immutable/chunks/ngokrZaz.js","_app/immutable/chunks/DLJGT5E3.js","_app/immutable/chunks/IhlVLgJr.js","_app/immutable/chunks/ChS4WpBa.js","_app/immutable/chunks/DYT902qo.js","_app/immutable/chunks/o_7Dr-qM.js","_app/immutable/chunks/CiamAUD5.js","_app/immutable/chunks/Cp5qd9Zb.js","_app/immutable/chunks/DUACBwDd.js","_app/immutable/chunks/COl6ZeUq.js","_app/immutable/chunks/XlMopvfE.js","_app/immutable/chunks/BQvIzZR_.js","_app/immutable/chunks/BN8Rci2r.js","_app/immutable/chunks/CCfJ1IQK.js","_app/immutable/chunks/CKQTapQa.js","_app/immutable/chunks/D1eK47qZ.js","_app/immutable/chunks/CdktuC_a.js","_app/immutable/chunks/DSFL3bnU.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=14-BKAD9ala.js.map
