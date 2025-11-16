import { r as redirect } from './index-CpeNL06-.js';
import './utils-gGoUUMc2.js';

const load = async ({ locals, request }) => {
  const { aphexCMS } = locals;
  const session = await aphexCMS.auth?.getSession(request, aphexCMS.databaseAdapter);
  if (session?.session) {
    throw redirect(302, "/admin");
  }
  return {};
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 7;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-NZCyRkXV.js')).default;
const server_id = "src/routes/login/+page.server.ts";
const imports = ["_app/immutable/nodes/7.BMSKFOgV.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DWBROaph.js","_app/immutable/chunks/zhm3sqsy.js","_app/immutable/chunks/CrQaW3DA.js","_app/immutable/chunks/D4agE4Ng.js","_app/immutable/chunks/CMwlA4jW.js","_app/immutable/chunks/BSYjuwBa.js","_app/immutable/chunks/CrOXdnIQ.js","_app/immutable/chunks/DL8tdTp6.js","_app/immutable/chunks/CQxSK_kJ.js","_app/immutable/chunks/CC2su3ap.js","_app/immutable/chunks/DJpeLsgd.js","_app/immutable/chunks/BegLjn8u.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=7-AT_3UdUw.js.map
