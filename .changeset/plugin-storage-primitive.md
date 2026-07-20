---
'@aphexcms/cms-core': minor
'@aphexcms/postgresql-adapter': minor
'@aphexcms/sqlite-adapter': minor
---

Add a generic plugin storage primitive — `cms_plugin_storage`, the data-plane
sibling of `cms_plugin_settings`. Plugins persist arbitrary org-scoped JSON
records namespaced by `(plugin, collection)` through the new
`PluginStorageAdapter` port (`createPluginRecord` / `getPluginRecord` /
`listPluginRecords`), implemented by both the PostgreSQL and SQLite adapters.
`createPluginRecord` is callable on the `withTransaction` handle, so a record
and the domain event announcing it commit atomically (transactional outbox).
