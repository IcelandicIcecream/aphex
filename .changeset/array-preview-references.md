---
'@aphexcms/cms-core': minor
---

Array rows preview through references and show option titles. A row whose `preview.select` reads through a reference field (`item.name` on `{ item: { _ref } }`) now shows the referenced document's value, fetched in one batch for the whole array and refreshed when that document changes; before, the row fell back to the type's title. A selected field with a `list` of options shows the option's title ("Full bleed") rather than its stored value (`fullBleed`). New helpers in `utils/preview`: `previewReferenceFields` and `withPreviewReferences`.
