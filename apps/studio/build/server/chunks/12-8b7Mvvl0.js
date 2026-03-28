const load = async ({ locals }) => {
  const { databaseAdapter } = locals.aphexCMS;
  const instanceSettings = await databaseAdapter.getInstanceSettings();
  return {
    instanceSettings
  };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 12;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-D-6EHbSl.js')).default;
const server_id = "src/routes/god-mode/+page.server.ts";
const imports = ["_app/immutable/nodes/12.CUqKgEtq.js","_app/immutable/chunks/BDCi2jMF.js","_app/immutable/chunks/CK91KPpo.js","_app/immutable/chunks/CPc8x607.js","_app/immutable/chunks/D8MlOj3o.js","_app/immutable/chunks/DUACBwDd.js","_app/immutable/chunks/dt7zgPvE.js","_app/immutable/chunks/BxkjPDAx.js","_app/immutable/chunks/CKQTapQa.js","_app/immutable/chunks/DYT902qo.js","_app/immutable/chunks/o_7Dr-qM.js","_app/immutable/chunks/ChS4WpBa.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=12-8b7Mvvl0.js.map
