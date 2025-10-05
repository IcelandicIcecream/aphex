module.exports = [
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
"[project]/node_modules/.pnpm/fumadocs-core@15.8.3_@types+react@19.2.0_lucide-react@0.544.0_react@19.2.0__next@15.5.4_react_mwulk4ip3laegiyyyjygis4ysi/node_modules/fumadocs-core/dist/algolia-Z232AL35.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "groupResults",
    ()=>groupResults,
    "searchDocs",
    ()=>searchDocs
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$15$2e$8$2e$3_$40$types$2b$react$40$19$2e$2$2e$0_lucide$2d$react$40$0$2e$544$2e$0_react$40$19$2e$2$2e$0_$5f$next$40$15$2e$5$2e$4_react_mwulk4ip3laegiyyyjygis4ysi$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$chunk$2d$OTD7MV33$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/fumadocs-core@15.8.3_@types+react@19.2.0_lucide-react@0.544.0_react@19.2.0__next@15.5.4_react_mwulk4ip3laegiyyyjygis4ysi/node_modules/fumadocs-core/dist/chunk-OTD7MV33.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$15$2e$8$2e$3_$40$types$2b$react$40$19$2e$2$2e$0_lucide$2d$react$40$0$2e$544$2e$0_react$40$19$2e$2$2e$0_$5f$next$40$15$2e$5$2e$4_react_mwulk4ip3laegiyyyjygis4ysi$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$chunk$2d$JSBRDJBE$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/fumadocs-core@15.8.3_@types+react@19.2.0_lucide-react@0.544.0_react@19.2.0__next@15.5.4_react_mwulk4ip3laegiyyyjygis4ysi/node_modules/fumadocs-core/dist/chunk-JSBRDJBE.js [app-ssr] (ecmascript)");
;
;
// src/search/client/algolia.ts
function groupResults(hits) {
    const grouped = [];
    const scannedUrls = /* @__PURE__ */ new Set();
    for (const hit of hits){
        if (!scannedUrls.has(hit.url)) {
            scannedUrls.add(hit.url);
            grouped.push({
                id: hit.url,
                type: "page",
                breadcrumbs: hit.breadcrumbs,
                url: hit.url,
                content: hit.title
            });
        }
        grouped.push({
            id: hit.objectID,
            type: hit.content === hit.section ? "heading" : "text",
            url: hit.section_id ? `${hit.url}#${hit.section_id}` : hit.url,
            content: hit.content
        });
    }
    return grouped;
}
async function searchDocs(query, { indexName, onSearch, client, locale, tag }) {
    if (query.trim().length === 0) return [];
    const result = onSearch ? await onSearch(query, tag, locale) : await client.searchForHits({
        requests: [
            {
                type: "default",
                indexName,
                query,
                distinct: 5,
                hitsPerPage: 10,
                filters: tag ? `tag:${tag}` : void 0
            }
        ]
    });
    const highlighter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$15$2e$8$2e$3_$40$types$2b$react$40$19$2e$2$2e$0_lucide$2d$react$40$0$2e$544$2e$0_react$40$19$2e$2$2e$0_$5f$next$40$15$2e$5$2e$4_react_mwulk4ip3laegiyyyjygis4ysi$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$chunk$2d$OTD7MV33$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContentHighlighter"])(query);
    return groupResults(result.results[0].hits).flatMap((hit)=>{
        if (hit.type === "page") {
            return {
                ...hit,
                contentWithHighlights: hit.contentWithHighlights ?? highlighter.highlight(hit.content)
            };
        }
        return [];
    });
}
;
}),
];

//# sourceMappingURL=cb89c_fumadocs-core_dist_9b7027dc._.js.map