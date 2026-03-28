const load = async ({ locals }) => {
  const auth = locals.auth;
  if (!auth || auth.type !== "session") {
    throw new Error("No session found");
  }
  const databaseAdapter = locals.aphexCMS.databaseAdapter;
  let pendingInvitations = [];
  if (auth.organizationId) {
    const invitations = await databaseAdapter.findOrganizationInvitations(auth.organizationId);
    pendingInvitations = invitations.filter(
      (inv) => !inv.acceptedAt && inv.expiresAt && inv.expiresAt > /* @__PURE__ */ new Date()
    );
  }
  return {
    pendingInvitations
  };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 11;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-B5XPMgdB.js')).default;
const server_id = "src/routes/(protected)/admin/settings/members/+page.server.ts";
const imports = ["_app/immutable/nodes/11.DB5Kcj-X.js","_app/immutable/chunks/BDCi2jMF.js","_app/immutable/chunks/CK91KPpo.js","_app/immutable/chunks/CPc8x607.js","_app/immutable/chunks/D8MlOj3o.js","_app/immutable/chunks/CcHWWnoU.js","_app/immutable/chunks/C0mwdGTf.js","_app/immutable/chunks/dt7zgPvE.js","_app/immutable/chunks/DUACBwDd.js","_app/immutable/chunks/BxkjPDAx.js","_app/immutable/chunks/DYT902qo.js","_app/immutable/chunks/CKQTapQa.js","_app/immutable/chunks/o_7Dr-qM.js","_app/immutable/chunks/ChS4WpBa.js","_app/immutable/chunks/Cp5qd9Zb.js","_app/immutable/chunks/IhlVLgJr.js","_app/immutable/chunks/COl6ZeUq.js","_app/immutable/chunks/XlMopvfE.js","_app/immutable/chunks/BQvIzZR_.js","_app/immutable/chunks/Bcrdfp_K.js","_app/immutable/chunks/ngokrZaz.js","_app/immutable/chunks/CiamAUD5.js","_app/immutable/chunks/BN8Rci2r.js","_app/immutable/chunks/CCfJ1IQK.js","_app/immutable/chunks/D1eK47qZ.js","_app/immutable/chunks/CdktuC_a.js","_app/immutable/chunks/CkAdVJyS.js","_app/immutable/chunks/CO0YJjBl.js"];
const stylesheets = ["_app/immutable/assets/Sidebar.DymugIeW.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=11-B4KNByDp.js.map
