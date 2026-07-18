---
'@aphexcms/cms-core': minor
---

Add schema lifecycle hooks and a typed `defineType` authoring helper.

- `hooks.beforeValidate` on a schema — save-time transform functions that run on every write path (Local API `create`/`update`, HTTP API, admin UI) before field validation. Use them to normalize or derive input (trim, slugify, stamp, default). Hooks are transform-only by design: rejection and cross-field invariants stay in `validation: (Rule) => Rule.custom(...)`, and side effects belong in domain-event consumers — never in a hook.
- `defineType(schema)` — an optional, backwards-compatible wrapper that captures the exact `fields` literal via a `const` type parameter, so `beforeValidate` hooks receive a `data` typed by self-reflection from the schema's own fields — no generated types, no casts. Plain `const x: SchemaType = { ... }` objects keep working unchanged.
- Cross-field validation: `validateDocumentData` now populates `context.document` (the whole document) for `Rule.custom((value, { document }) => ...)`, matching the `ValidationContext` type. The document is built internally from the data being validated, so callers no longer pass it redundantly.
