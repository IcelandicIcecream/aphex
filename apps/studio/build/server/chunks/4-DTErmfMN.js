import { r as redirect } from './index-BcOZ6EV9.js';
import './utils-FiC4zhrQ.js';

const load = async ({ locals }) => {
  const auth = locals.auth;
  if (!auth || auth.type !== "session") {
    throw redirect(302, "/login");
  }
  if (auth.user.role !== "super_admin") {
    return {
      unauthorized: true,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
        role: auth.user.role
      }
    };
  }
  return {
    unauthorized: false,
    user: {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      role: auth.user.role
    }
  };
};

var _layout_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 4;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-D1ebrK9o.js')).default;
const server_id = "src/routes/god-mode/+layout.server.ts";
const imports = ["_app/immutable/nodes/4.CUg3bPg9.js","_app/immutable/chunks/BDCi2jMF.js","_app/immutable/chunks/CK91KPpo.js","_app/immutable/chunks/CcHWWnoU.js","_app/immutable/chunks/CPc8x607.js","_app/immutable/chunks/D8MlOj3o.js","_app/immutable/chunks/DYT902qo.js","_app/immutable/chunks/dt7zgPvE.js","_app/immutable/chunks/C0mwdGTf.js","_app/immutable/chunks/BQvIzZR_.js","_app/immutable/chunks/Bcrdfp_K.js","_app/immutable/chunks/ngokrZaz.js","_app/immutable/chunks/CdktuC_a.js","_app/immutable/chunks/o_7Dr-qM.js","_app/immutable/chunks/BxkjPDAx.js","_app/immutable/chunks/XlMopvfE.js","_app/immutable/chunks/DSFL3bnU.js","_app/immutable/chunks/IhlVLgJr.js","_app/immutable/chunks/ChS4WpBa.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=4-DTErmfMN.js.map
