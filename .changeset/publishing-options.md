---
'@aphexcms/cms-core': minor
---

Document schemas can change how the editor presents publishing, with `publishing` on the schema. Unset, the editor is exactly as before.

- `publishing.labels` renames the editor's publishing words: `draft`, `published`, `publish`, `publishChanges`, `upToDate`, `publishing`, `justPublished`, `unpublish` and `unpublished`. Any left out keep their defaults (`DEFAULT_PUBLISH_LABELS`). For documents that are "sent" or "shared" rather than published, such as an invoice.
- `publishing.controls: 'status'` shows only whether the work is saved, with a Save button, in place of the Draft/Published tabs and the Publish, Schedule and Unpublish controls. For a `liveEdit` record, which is live once saved. A save that stayed a draft (it fails validation, or the role can't publish) says so. The default, `'full'`, keeps every control, including on `liveEdit` schemas.
