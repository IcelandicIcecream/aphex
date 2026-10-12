---
'@aphexcms/cms-core': minor
---

**`preview.select` can read through a reference.** A schema whose preview selects `voice.name` — a path starting at a `reference` field — used to land on `{ _ref }` and render an empty subtitle. The document list now fetches at `depth: 1` when, and only when, a selected path starts at a reference field (the new `previewDepth(schema)`), and `readPath` steps through a resolved row's `draftData`/`publishedData` to reach the field.

Kept deliberately narrow: a list page shouldn't pay for reference resolution no row displays.
