---
'@aphexcms/cms-core': minor
---

Enforce configurable accepted file types throughout image and file fields

The `accept` option now consistently supports a comma-separated string or an array of exact MIME
types, MIME wildcards, and filename extensions. Restrictions apply to file inputs, drag-and-drop,
asset-picker uploads and selection, multipart uploads, and direct-to-storage upload grants. The
server resolves the live schema rule when field context is available, preventing a client from
loosening the field's allow-list. An optional `upload.allowedMimeTypes` configuration adds an
installation-wide MIME security ceiling; field rules may narrow it but cannot widen it.
Direct uploads are written to a temporary key and claimed once in the database before promotion.
The promoted bytes are magic-inspected before confirmation succeeds, preventing a reusable signed
upload URL or confirmation ticket from overwriting content that has already passed validation.
When no installation-wide MIME policy is configured, uploads now use a conservative built-in
safelist of common CMS formats. An explicit `allowedMimeTypes` list replaces these defaults while
the non-overridable dangerous-content checks remain active.
