import { a as authToContext } from './auth-helpers-D0NRVV-P.js';
import { f as fail, e as error } from './index-CpeNL06-.js';
import './utils-gGoUUMc2.js';

const load = async ({ locals }) => {
  try {
    const { localAPI, databaseAdapter } = locals.aphexCMS;
    const organization = await databaseAdapter.findOrganizationBySlug("default");
    if (!organization) {
      return error(404, {
        message: "Organization doesn't exist"
      });
    }
    const auth = locals.auth;
    let context;
    let isLoggedIn = false;
    let userRole = null;
    let userName = null;
    let result = null;
    if (auth && auth.type == "session") {
      isLoggedIn = true;
      userRole = auth.user.role;
      userName = auth.user.name || auth.user.email;
      context = authToContext(auth);
      result = await localAPI.collections.todo?.find(context, {
        limit: 100,
        depth: 1,
        perspective: "draft",
        where: { "_meta.createdBy": { equals: auth.user.id } }
      });
    }
    return {
      todos: result?.docs || [],
      isLoggedIn,
      userRole,
      userName
    };
  } catch (err) {
    console.error("Failed to fetch todos:", err);
    return {
      todos: [],
      isLoggedIn: false,
      userRole: null,
      userName: null
    };
  }
};
const actions = {
  createTodo: async ({ request, locals }) => {
    const { localAPI } = locals.aphexCMS;
    const data = await request.formData();
    const title = data.get("title")?.toString();
    const description = data.get("description")?.toString();
    if (!title) {
      return fail(400, { error: "Title is required" });
    }
    const auth = locals.auth;
    if (!auth) {
      return fail(401, { error: "You must be logged in to create todos" });
    }
    try {
      const context = authToContext(auth);
      await localAPI.collections.todo?.create(context, {
        title,
        description: description || "",
        completed: false
      });
      return { success: true, action: "create" };
    } catch (err) {
      console.error("Failed to create todo:", err);
      return fail(500, { error: "Failed to create todo" });
    }
  },
  toggleComplete: async ({ request, locals }) => {
    const { localAPI } = locals.aphexCMS;
    const data = await request.formData();
    const todoId = data.get("id")?.toString();
    const completed = data.get("completed") === "true";
    if (!todoId) {
      return fail(400, { error: "Todo ID is required" });
    }
    const auth = locals.auth;
    if (!auth) {
      return fail(401, { error: "You must be logged in to update todos" });
    }
    try {
      const context = authToContext(auth);
      const existingTodo = await localAPI.collections.todo?.findByID(context, todoId);
      if (!existingTodo) {
        return fail(404, { error: "Todo not found" });
      }
      await localAPI.collections.todo?.update(
        context,
        todoId,
        {
          title: existingTodo.title,
          description: existingTodo.description,
          completed: !completed
        },
        { publish: false }
      );
      return { success: true };
    } catch (err) {
      console.error("Failed to toggle todo:", err);
      return fail(500, { error: "Failed to update todo" });
    }
  },
  updateTodo: async ({ request, locals }) => {
    const { localAPI } = locals.aphexCMS;
    const data = await request.formData();
    const todoId = data.get("id")?.toString();
    const title = data.get("title")?.toString();
    const description = data.get("description")?.toString();
    if (!todoId || !title) {
      return fail(400, { error: "Todo ID and title are required" });
    }
    const auth = locals.auth;
    if (!auth) {
      return fail(401, { error: "You must be logged in to update todos" });
    }
    try {
      const context = authToContext(auth);
      const existingTodo = await localAPI.collections.todo?.findByID(context, todoId);
      if (!existingTodo) {
        return fail(404, { error: "Todo not found" });
      }
      await localAPI.collections.todo?.update(
        context,
        todoId,
        {
          title,
          description: description || "",
          completed: existingTodo.completed
        },
        { publish: false }
      );
      return { success: true, action: "update" };
    } catch (err) {
      console.error("Failed to update todo:", err);
      return fail(500, { error: "Failed to update todo" });
    }
  },
  deleteTodo: async ({ request, locals }) => {
    const { localAPI } = locals.aphexCMS;
    const data = await request.formData();
    const todoId = data.get("id")?.toString();
    if (!todoId) {
      return fail(400, { error: "Todo ID is required" });
    }
    const auth = locals.auth;
    if (!auth) {
      return fail(401, { error: "You must be logged in to delete todos" });
    }
    try {
      const context = authToContext(auth);
      await localAPI.collections.todo?.delete(context, todoId);
      return { success: true, action: "delete" };
    } catch (err) {
      console.error("Failed to delete todo:", err);
      return fail(500, { error: "Failed to delete todo" });
    }
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 3;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-B5M0FWAs.js')).default;
const server_id = "src/routes/+page.server.ts";
const imports = ["_app/immutable/nodes/3.B4vvZeoP.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DWBROaph.js","_app/immutable/chunks/zhm3sqsy.js","_app/immutable/chunks/CrQaW3DA.js","_app/immutable/chunks/CgH_2WnA.js","_app/immutable/chunks/D8BKmG1w.js","_app/immutable/chunks/CMwlA4jW.js","_app/immutable/chunks/CrOXdnIQ.js","_app/immutable/chunks/CQxSK_kJ.js","_app/immutable/chunks/AHJMyVxs.js","_app/immutable/chunks/BegLjn8u.js","_app/immutable/chunks/C4tAP6mY.js","_app/immutable/chunks/BVXJ_ZUV.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=3-BonFCUTv.js.map
