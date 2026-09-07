---
'@aphexcms/cms-core': patch
---

Fix multi-type references opening the wrong schema, and stop the object modal covering the document it opens

A `reference` field may name several targets (`to: [{type: 'page'}, {type: 'post'}]`).
`ReferenceField` treated `to[0]` as _the_ type, so a link pointing at a post opened
under the `page` schema. Every field the page schema doesn't declare was then reported
as orphaned, offering a one-click "Remove" that would have deleted the article's body —
a data-loss button presented as tidying up.

The type now comes from the document itself, read at `_meta.type` (the Local API
projection keeps `type` out of the content data, since it is a reserved column) with a
top-level `type` fallback for the list endpoint's row shape.

Three further consequences of the same `to[0]` assumption are fixed alongside it:

- The picker only ever listed the first target type, so a `page | post` reference could
  never select a post by hand — such a value could only be written programmatically.
  It now fetches every allowed type.
- Preview titles and the row icon resolved every row through the first type's `preview`
  config, so a mixed list showed wrong or missing titles. Each row now resolves through
  its own schema.
- "Create…" silently created the first type. With more than one allowed it is now a
  menu, because which to create is genuinely ambiguous.

`DocumentEditor` no longer trusts its `documentType` prop once the document has loaded:
an `effectiveType` derives from the document's own `_meta.type`, guarded by an id check
so a previous document's type can't leak in while the next is in flight. This matters
beyond reference rows — the type also arrives from `?docType=` and the `stack=` URL
parameter, so a stale or hand-edited URL previously reproduced the mismatch on reload
and now self-corrects.

Separately, opening a referenced document from inside an `ObjectModal` left the new
editor _underneath_ the modal: the stacked editor is part of the admin layout while the
modal is an overlay above it, so the document the user asked for sat behind a backdrop
they had to dismiss to reach. The modal now closes as it hands off — opening a document
is navigation. Nothing is lost, since field edits propagate through `onUpdate` as they
happen rather than being held until close, and nested modals unwind on their own
because an inner modal's handler is the outer one's wrapper.
