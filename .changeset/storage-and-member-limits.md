---
'@aphexcms/cms-core': minor
'@aphexcms/plugin-forms': minor
'@aphexcms/postgresql-adapter': patch
'@aphexcms/sqlite-adapter': patch
---

Limits per organization for storage and team size, beside `documentLimits`. `storageLimits: ({ organizationId }) => ({ maxBytes, message? }) | null` is checked on every upload (studio, REST, direct upload, MCP); `memberLimits: ({ organizationId }) => ({ max, message? }) | null` when an invitation is made (pending ones count) or accepted. Both answer 402 with `code: 'limit_reached'`; the members page shows the message in place of the invite form and the invite link page says the organization is full. `isLimitError` matches any limit, by name.

`localAPI.checkDocumentLimit(organizationId, type)` applies `documentLimits` to a create made for someone outside the organization, and `plugin-forms` uses it for visitor submissions, so a limit on `formSubmission` caps a site's messages.

The adapters' `getTotalAssetsSize` always returns a number (Postgres's `sum` came back as a string).
