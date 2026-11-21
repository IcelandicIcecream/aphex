---
'@aphexcms/cms-core': minor
---

Validation errors are written for editors. `Field "layout[2].items[0].title" Required` now reads "Layout › FAQ (item 3) › Question (item 1) › Title: This is required." under the field, in the save and publish toasts, and in the editor's error banner. Validator jargon (wrong value types, broken references, unknown item types, unreadable rich text) becomes a sentence saying what to do. A schema's own `Rule` messages are shown as written. The functions are `humanizeValidationMessage()` and `toFieldIssues()` in `@aphexcms/cms-core/field-validation/utils`.

Before publishing, the editor now runs the same check the server runs, so a problem nested inside a block is named before the request instead of being refused by it. A refused publish throws `PublishValidationError`, exported from `@aphexcms/cms-core/server`. The HTTP routes return its `issues`, one entry per failure with its full `path`. Saving also reads `issues`: it looked for `validationErrors`, which the server never sent. An object field holding an array no longer reports `Field "seo.actions" Field "actions[0].text" Required`.
