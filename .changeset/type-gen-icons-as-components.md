---
'@aphexcms/cms-core': patch
---

Type generation no longer rewrites a schema's source to remove icons. Lucide icons and `.svelte` files load as empty components instead, so a schema can use them as values, including through a call: `icon: picture(drawing)` used to become `icon: undefined(drawing)` and stop `aphex generate:types` with "(void 0) is not a function".
