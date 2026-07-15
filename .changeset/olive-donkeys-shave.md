---
'@aphexcms/postgresql-adapter': minor
'@aphexcms/sqlite-adapter': minor
'@aphexcms/cms-core': minor
---

Per-organization plugin settings, with encrypted secrets

A plugin declares its settings shape via an `aphex/settings` part; core renders
the form, stores values per organization, and injects them into the plugin's
server code. Storage is a generic `cms_plugin_settings` table keyed by
(organization, plugin) — adding a plugin never means a migration.

Fields typed `'secret'` are encrypted at rest with AES-256-GCM under a versioned
`v1:iv:tag:ciphertext` envelope, so the key can be rotated later without
guessing at old values. Set `APHEX_SECRET_ENCRYPTION_KEY` to enable them; saving
a secret without it fails loudly rather than writing plaintext.

Secrets never reach the browser: the API serves masked values, and the decrypting
accessor is server-only. Submitting a blank or masked field leaves the stored
secret untouched, so a round-trip through the form can't wipe it.

`SecretField` is deliberately not part of `FieldTypeMap` — `Field` derives from
that map, so adding it there would let `'secret'` leak into content schemas.
Settings are config, not content.

Gated behind a new `plugin.settings.manage` capability.
