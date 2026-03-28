import { r as redirect } from './index-BcOZ6EV9.js';
import './utils-FiC4zhrQ.js';

const load = async ({ params, locals }) => {
  const { databaseAdapter } = locals.aphexCMS;
  const auth = locals.auth;
  const { token } = params;
  const invitation = await databaseAdapter.findInvitationByToken(token);
  if (!invitation) {
    return { error: "invalid", invitation: null, organization: null };
  }
  if (invitation.acceptedAt) {
    return { error: "already_accepted", invitation: null, organization: null };
  }
  if (new Date(invitation.expiresAt) < /* @__PURE__ */ new Date()) {
    return { error: "expired", invitation: null, organization: null };
  }
  const org = await databaseAdapter.findOrganizationById(invitation.organizationId);
  if (auth && auth.type === "session") {
    if (auth.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return {
        error: "email_mismatch",
        invitation: {
          email: invitation.email,
          role: invitation.role
        },
        organization: org ? { name: org.name, slug: org.slug } : null
      };
    }
    await databaseAdapter.acceptInvitation(token, auth.user.id);
    await databaseAdapter.updateUserSession(auth.user.id, invitation.organizationId);
    throw redirect(302, "/admin");
  }
  return {
    error: null,
    invitation: {
      email: invitation.email,
      role: invitation.role
    },
    organization: org ? { name: org.name, slug: org.slug } : null
  };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 15;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-DLIb60hR.js')).default;
const server_id = "src/routes/invite/[token]/+page.server.ts";
const imports = ["_app/immutable/nodes/15.CfXqiWeU.js","_app/immutable/chunks/BDCi2jMF.js","_app/immutable/chunks/CK91KPpo.js","_app/immutable/chunks/CPc8x607.js","_app/immutable/chunks/D8MlOj3o.js","_app/immutable/chunks/C0mwdGTf.js","_app/immutable/chunks/dt7zgPvE.js","_app/immutable/chunks/DUACBwDd.js","_app/immutable/chunks/BxkjPDAx.js","_app/immutable/chunks/BQvIzZR_.js","_app/immutable/chunks/Bcrdfp_K.js","_app/immutable/chunks/ngokrZaz.js","_app/immutable/chunks/IhlVLgJr.js","_app/immutable/chunks/ChS4WpBa.js","_app/immutable/chunks/DYT902qo.js","_app/immutable/chunks/o_7Dr-qM.js","_app/immutable/chunks/CiamAUD5.js","_app/immutable/chunks/CKQTapQa.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=15-BHmrx95-.js.map
