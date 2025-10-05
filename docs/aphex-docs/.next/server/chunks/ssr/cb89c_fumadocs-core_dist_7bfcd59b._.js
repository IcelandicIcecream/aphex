module.exports = [
"[project]/node_modules/.pnpm/fumadocs-core@15.8.3_@types+react@19.2.0_lucide-react@0.544.0_react@19.2.0__next@15.5.4_react_mwulk4ip3laegiyyyjygis4ysi/node_modules/fumadocs-core/dist/chunk-ZMWYLUDP.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// src/utils/remove-undefined.ts
__turbopack_context__.s([
    "removeUndefined",
    ()=>removeUndefined
]);
function removeUndefined(value, deep = false) {
    const obj = value;
    for(const key in obj){
        if (obj[key] === void 0) delete obj[key];
        if (!deep) continue;
        const entry = obj[key];
        if (typeof entry === "object" && entry !== null) {
            removeUndefined(entry, deep);
            continue;
        }
        if (Array.isArray(entry)) {
            for (const item of entry)removeUndefined(item, deep);
        }
    }
    return value;
}
;
}),
"[project]/node_modules/.pnpm/fumadocs-core@15.8.3_@types+react@19.2.0_lucide-react@0.544.0_react@19.2.0__next@15.5.4_react_mwulk4ip3laegiyyyjygis4ysi/node_modules/fumadocs-core/dist/chunk-OTD7MV33.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// src/search/index.ts
__turbopack_context__.s([
    "createContentHighlighter",
    ()=>createContentHighlighter
]);
function escapeRegExp(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function buildRegexFromQuery(q) {
    const trimmed = q.trim();
    if (trimmed.length === 0) return null;
    const terms = Array.from(new Set(trimmed.split(/\s+/).map((t)=>t.trim()).filter(Boolean)));
    if (terms.length === 0) return null;
    const escaped = terms.map(escapeRegExp).join("|");
    return new RegExp(`(${escaped})`, "gi");
}
function createContentHighlighter(query) {
    const regex = typeof query === "string" ? buildRegexFromQuery(query) : query;
    return {
        highlight (content) {
            if (!regex) return [
                {
                    type: "text",
                    content
                }
            ];
            const out = [];
            let i = 0;
            for (const match of content.matchAll(regex)){
                if (i < match.index) {
                    out.push({
                        type: "text",
                        content: content.substring(i, match.index)
                    });
                }
                out.push({
                    type: "text",
                    content: match[0],
                    styles: {
                        highlight: true
                    }
                });
                i = match.index + match[0].length;
            }
            if (i < content.length) {
                out.push({
                    type: "text",
                    content: content.substring(i)
                });
            }
            return out;
        }
    };
}
;
}),
"[project]/node_modules/.pnpm/fumadocs-core@15.8.3_@types+react@19.2.0_lucide-react@0.544.0_react@19.2.0__next@15.5.4_react_mwulk4ip3laegiyyyjygis4ysi/node_modules/fumadocs-core/dist/orama-cloud-GMFFJOIB.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "searchDocs",
    ()=>searchDocs
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$15$2e$8$2e$3_$40$types$2b$react$40$19$2e$2$2e$0_lucide$2d$react$40$0$2e$544$2e$0_react$40$19$2e$2$2e$0_$5f$next$40$15$2e$5$2e$4_react_mwulk4ip3laegiyyyjygis4ysi$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$chunk$2d$ZMWYLUDP$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/fumadocs-core@15.8.3_@types+react@19.2.0_lucide-react@0.544.0_react@19.2.0__next@15.5.4_react_mwulk4ip3laegiyyyjygis4ysi/node_modules/fumadocs-core/dist/chunk-ZMWYLUDP.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$15$2e$8$2e$3_$40$types$2b$react$40$19$2e$2$2e$0_lucide$2d$react$40$0$2e$544$2e$0_react$40$19$2e$2$2e$0_$5f$next$40$15$2e$5$2e$4_react_mwulk4ip3laegiyyyjygis4ysi$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$chunk$2d$OTD7MV33$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/fumadocs-core@15.8.3_@types+react@19.2.0_lucide-react@0.544.0_react@19.2.0__next@15.5.4_react_mwulk4ip3laegiyyyjygis4ysi/node_modules/fumadocs-core/dist/chunk-OTD7MV33.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$15$2e$8$2e$3_$40$types$2b$react$40$19$2e$2$2e$0_lucide$2d$react$40$0$2e$544$2e$0_react$40$19$2e$2$2e$0_$5f$next$40$15$2e$5$2e$4_react_mwulk4ip3laegiyyyjygis4ysi$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$chunk$2d$JSBRDJBE$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/fumadocs-core@15.8.3_@types+react@19.2.0_lucide-react@0.544.0_react@19.2.0__next@15.5.4_react_mwulk4ip3laegiyyyjygis4ysi/node_modules/fumadocs-core/dist/chunk-JSBRDJBE.js [app-ssr] (ecmascript)");
;
;
;
// src/search/client/orama-cloud.ts
async function searchDocs(query, options) {
    const highlighter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$15$2e$8$2e$3_$40$types$2b$react$40$19$2e$2$2e$0_lucide$2d$react$40$0$2e$544$2e$0_react$40$19$2e$2$2e$0_$5f$next$40$15$2e$5$2e$4_react_mwulk4ip3laegiyyyjygis4ysi$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$chunk$2d$OTD7MV33$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContentHighlighter"])(query);
    const list = [];
    const { index = "default", client, params: extraParams = {}, tag } = options;
    if (index === "crawler") {
        const result2 = await client.search({
            ...extraParams,
            term: query,
            where: {
                category: tag ? {
                    eq: tag.slice(0, 1).toUpperCase() + tag.slice(1)
                } : void 0,
                ...extraParams.where
            },
            limit: 10
        });
        if (!result2) return list;
        for (const hit of result2.hits){
            const doc = hit.document;
            list.push({
                id: hit.id,
                type: "page",
                content: doc.title,
                contentWithHighlights: highlighter.highlight(doc.title),
                url: doc.path
            }, {
                id: "page" + hit.id,
                type: "text",
                content: doc.content,
                contentWithHighlights: highlighter.highlight(doc.content),
                url: doc.path
            });
        }
        return list;
    }
    const params = {
        ...extraParams,
        term: query,
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$15$2e$8$2e$3_$40$types$2b$react$40$19$2e$2$2e$0_lucide$2d$react$40$0$2e$544$2e$0_react$40$19$2e$2$2e$0_$5f$next$40$15$2e$5$2e$4_react_mwulk4ip3laegiyyyjygis4ysi$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$chunk$2d$ZMWYLUDP$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["removeUndefined"])({
            tag,
            ...extraParams.where
        }),
        groupBy: {
            properties: [
                "page_id"
            ],
            maxResult: 7,
            ...extraParams.groupBy
        }
    };
    const result = await client.search(params);
    if (!result || !result.groups) return list;
    for (const item of result.groups){
        let addedHead = false;
        for (const hit of item.result){
            const doc = hit.document;
            if (!addedHead) {
                list.push({
                    id: doc.page_id,
                    type: "page",
                    content: doc.title,
                    breadcrumbs: doc.breadcrumbs,
                    contentWithHighlights: highlighter.highlight(doc.title),
                    url: doc.url
                });
                addedHead = true;
            }
            list.push({
                id: doc.id,
                content: doc.content,
                contentWithHighlights: highlighter.highlight(doc.content),
                type: doc.content === doc.section ? "heading" : "text",
                url: doc.section_id ? `${doc.url}#${doc.section_id}` : doc.url
            });
        }
    }
    return list;
}
;
}),
];

//# sourceMappingURL=cb89c_fumadocs-core_dist_7bfcd59b._.js.map