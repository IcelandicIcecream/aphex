(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/node_modules/.pnpm/fumadocs-core@15.8.3_@types+react@19.2.0_lucide-react@0.544.0_react@19.2.0__next@15.5.4_react_mwulk4ip3laegiyyyjygis4ysi/node_modules/fumadocs-core/dist/fetch-C3XV44E6.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fetchDocs",
    ()=>fetchDocs
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$15$2e$8$2e$3_$40$types$2b$react$40$19$2e$2$2e$0_lucide$2d$react$40$0$2e$544$2e$0_react$40$19$2e$2$2e$0_$5f$next$40$15$2e$5$2e$4_react_mwulk4ip3laegiyyyjygis4ysi$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$chunk$2d$JSBRDJBE$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/fumadocs-core@15.8.3_@types+react@19.2.0_lucide-react@0.544.0_react@19.2.0__next@15.5.4_react_mwulk4ip3laegiyyyjygis4ysi/node_modules/fumadocs-core/dist/chunk-JSBRDJBE.js [app-client] (ecmascript)");
;
// src/search/client/fetch.ts
var cache = /* @__PURE__ */ new Map();
async function fetchDocs(query, param) {
    let { api = "/api/search", locale, tag } = param;
    const url = new URL(api, window.location.origin);
    url.searchParams.set("query", query);
    if (locale) url.searchParams.set("locale", locale);
    if (tag) url.searchParams.set("tag", Array.isArray(tag) ? tag.join(",") : tag);
    const key = "".concat(url.pathname, "?").concat(url.searchParams);
    const cached = cache.get(key);
    if (cached) return cached;
    const res = await fetch(key);
    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    cache.set(key, result);
    return result;
}
;
}),
]);

//# sourceMappingURL=cb89c_fumadocs-core_dist_fetch-C3XV44E6_1b54d403.js.map