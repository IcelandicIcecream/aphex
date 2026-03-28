const load = async ({ locals }) => {
  const auth = locals.auth;
  if (!auth || auth.type !== "session") {
    throw new Error("No session found");
  }
  const databaseAdapter = locals.aphexCMS.databaseAdapter;
  const userProfile = await databaseAdapter.findUserProfileById(auth.user.id);
  const userPreferences = userProfile?.preferences || {};
  let hasChildOrganizations = false;
  if (auth.organizationId && databaseAdapter.hierarchyEnabled) {
    const childOrgs = await databaseAdapter.getChildOrganizations(auth.organizationId);
    hasChildOrganizations = childOrgs.length > 0;
  }
  return {
    userPreferences,
    hasChildOrganizations
  };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 9;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-qzXx3E68.js')).default;
const server_id = "src/routes/(protected)/admin/settings/account/+page.server.ts";
const imports = ["_app/immutable/nodes/9.BLXB-dhP.js","_app/immutable/chunks/BDCi2jMF.js","_app/immutable/chunks/CK91KPpo.js","_app/immutable/chunks/BxkjPDAx.js","_app/immutable/chunks/CPc8x607.js","_app/immutable/chunks/D8MlOj3o.js","_app/immutable/chunks/C0mwdGTf.js","_app/immutable/chunks/dt7zgPvE.js","_app/immutable/chunks/DUACBwDd.js","_app/immutable/chunks/o_7Dr-qM.js","_app/immutable/chunks/IhlVLgJr.js","_app/immutable/chunks/ChS4WpBa.js","_app/immutable/chunks/DYT902qo.js","_app/immutable/chunks/COl6ZeUq.js","_app/immutable/chunks/XlMopvfE.js","_app/immutable/chunks/CiamAUD5.js","_app/immutable/chunks/I9k0B4Ob.js","_app/immutable/chunks/Cp5qd9Zb.js","_app/immutable/chunks/CcHWWnoU.js","_app/immutable/chunks/BQvIzZR_.js","_app/immutable/chunks/Bcrdfp_K.js","_app/immutable/chunks/ngokrZaz.js","_app/immutable/chunks/BN8Rci2r.js","_app/immutable/chunks/CCfJ1IQK.js","_app/immutable/chunks/CKQTapQa.js","_app/immutable/chunks/D1eK47qZ.js","_app/immutable/chunks/CdktuC_a.js","_app/immutable/chunks/CkAdVJyS.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=9-Dwx6YuPM.js.map
