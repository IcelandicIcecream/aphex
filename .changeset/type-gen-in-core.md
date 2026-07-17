---
'@aphexcms/cms-core': patch
---

Fix broken build in consuming apps: `@aphexcms/cms-core` shipped `dist/mcp/tools.js` importing `../../cli/generate-types.js`, a path that escapes the `dist` tree and fails to resolve in any consuming app (`Could not resolve "../../cli/generate-types.js"`). The shared type-shape logic (`mapFieldTypeToTS`/`fieldWriteShape`, plus the `generateTypesFromConfig` wrapper) now lives in core at `src/lib/type-gen.ts`, so `lib` no longer reaches up into `src/cli`. The `aphex` CLI bin is unchanged and imports the logic from core.
