---
'@aphexcms/cms-core': patch
---

Fix `generate:types` failing on plugins that import named icons

The esbuild stub that strips `@lucide/svelte` out of the type-generation
bundle was an ESM module exporting only a default. esbuild validates ESM named
imports against the target module's exports, so any plugin doing
`import { Sparkles } from '@lucide/svelte'` — which `@aphexcms/plugin-seo` does
— failed the bundle with:

    No matching export in "lucide-stub:@lucide/svelte" for import "Sparkles"

The stub (and the `.svelte` component stub, which has the same problem) now
emits CommonJS. Named imports off a CJS module are resolved as property access
rather than statically validated, so every icon name works and yields
`undefined` — which is what the existing `icon:` rewrite wants anyway.
