---
'@aphexcms/cms-core': patch
---

Lazy-load the rich-text (TipTap) editor. `ArrayField` now dynamically imports
`RichtextField` only when a field's `of` actually contains `{ type: 'block' }`,
so the ProseMirror/TipTap bundle (~393 kB min / 122 kB gzip) is split into its
own async chunk instead of riding in the shared admin chunk.

Effect: every admin page that doesn't render a rich-text editor — settings,
members, roles, api-keys, and document editors whose schema has no block field —
no longer downloads TipTap up front. It loads on demand the first time a
rich-text field is shown. No API or behaviour change.
