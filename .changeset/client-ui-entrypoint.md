---
'@aphexcms/cms-core': minor
---

Add a `@aphexcms/cms-core/client/ui` entrypoint: the admin chrome and context
primitives (Sidebar, ConfirmDialog, permissions/schema/slots/nav contexts,
PluginSettingsPanel, API client, toast) without the document editor or field
widgets.

The full `/client` barrel also re-exports DocumentEditor, SchemaField, AdminApp
and every `*Field` component, which pull the field registry (+@dnd-kit, +lucide)
into one chunk (~337 kB min / ~110 kB gzip). Because Rollup's download unit is
the chunk, a page that only wants a Sidebar or a confirm dialog still downloaded
that whole chunk just by sharing the barrel.

Non-breaking: `/client` is unchanged. Admin pages that don't mount the editor
(settings, members, roles, plugins, organizations, god-mode) can import from
`/client/ui` to drop the field registry from their initial load. Only the route
that mounts `AdminApp`/`DocumentEditor` needs the full `/client`.

```diff
-import { Sidebar, ConfirmDialogHost, setPermissionsContext } from '@aphexcms/cms-core/client';
+import { Sidebar, ConfirmDialogHost, setPermissionsContext } from '@aphexcms/cms-core/client/ui';
```
