---
'@aphexcms/visual-editing': patch
---

Keep server-derived data across the live-preview document swap

`usePreview().live(fallback)` documented itself as "the live document merged over
your server fallback", but it replaced the fallback wholesale. The document the
studio pushes comes straight from the editor's form state and has never been
through a page load, so anything a `load` derived and attached to the document was
dropped the moment preview opened.

That is how an archive block renders "no posts" in preview while the published page
lists twelve — with nothing on screen to suggest the difference is preview itself.
It affects any app that enriches a document server-side: resolved references,
queried lists, computed URLs.

`live()` now merges. The editor's values always win; keys are restored from the
fallback only when all three of these hold:

- **underscore-prefixed** — the convention for derived data. An authored field is
  never underscore-prefixed, so clearing one in the editor still clears it in
  preview. A naive "fill in what's missing" merge would resurrect every value the
  author just deleted, which is worse than the bug being fixed.
- **not structural** — `_type`, `_key`, `_ref`, `_id`, `_rev` describe the document
  rather than decorate it, and are never copied.
- **absent from the live document** — this only fills gaps.

Arrays match by `_key`, so reordering, inserting and deleting rows behave; arrays
whose items carry no `_key` fall back to position, and only when both arrays are
the same length (otherwise one insertion would shift every derived value onto the
wrong row). Nodes that need no restoration are returned by identity, so `$derived`
doesn't see a new object on every keystroke.

Derived values are necessarily one load stale — change an archive's category filter
and it keeps showing the previous query until the page reloads. Stale-but-real
content beats an empty grid, and every authored field around it still updates live.
