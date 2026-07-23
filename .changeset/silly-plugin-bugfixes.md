---
'@aphexcms/cms-core': patch
---

Fix three admin/type-gen bugs found while building out a client project's plugins:

- `type-gen`'s esbuild pass (used to compile+import `aphex.config.ts` outside
  Vite) now stubs `$env/*` imports to an empty object instead of failing the
  whole build — a plugin/schema module importing `$env/dynamic/public` (or
  any other `$env/*` variant) just to read a default config value no longer
  breaks type generation.
- `ObjectModal`'s title now falls back to a title-cased `schema.name` when a
  nested object schema (e.g. an array item type) has no `title` set, instead
  of rendering `Edit undefined`.
- `ObjectModal`'s panel now sets `cursor-default`, overriding a `cursor:
pointer` that could otherwise inherit onto the whole modal from an app-level
  `[role="button"]` cursor rule matching the modal's backdrop.
- Click-to-edit stega encoding and the array item click target now resolve
  named object-type references (e.g. `{ type: 'doctorGridBlock' }`) from the
  schema registry, not just inline `fields`, so page-builder block items are
  clickable in the live preview.
