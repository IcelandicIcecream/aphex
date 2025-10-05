module.exports = [
"[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/docs/aphex-docs/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "build/chunks/node_modules__pnpm_806d01c0._.js",
  "build/chunks/[root-of-the-server]__94bd6b8c._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/docs/aphex-docs/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];