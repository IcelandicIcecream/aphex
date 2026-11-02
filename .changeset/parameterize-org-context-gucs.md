---
'@aphexcms/postgresql-adapter': major
'@aphexcms/sqlite-adapter': major
---

Set the RLS organization context with a bound parameter and drop the unused `userId`/`userRole` options from `withOrgContext`.

`withOrgContext` built its `SET LOCAL` statements by interpolating values into raw SQL, because `SET LOCAL` accepts no parameters. `organizationId` was validated against a UUID regex, but `options.userId` and `options.userRole` were interpolated unchecked — a latent SQL injection sink in the function that establishes tenant isolation. Nothing in the project ever passed either option, no RLS policy read the `app.user_id` / `app.user_role` GUCs they set, and the `DatabaseAdapter` port never declared them, so no shipped code path could reach it; a custom plugin that bypassed the port and fed untrusted input to the concrete adapter could. Reported by Sahil Mhatre.

Both options are removed rather than sanitized — they had no consumer, and the audit/role behaviour their docs advertised was never implemented. Every remaining context write now goes through `set_config('app.organization_id', $1, true)`, which is transaction-scoped exactly like `SET LOCAL` but carries the value as a parameter; the UUID check stays as defence in depth instead of being the only guard. This also covers the pglite hierarchy-fallback and in-transaction override paths, which interpolated `organizationId` without validating it.

Breaking only in signature: `withOrgContext(orgId, fn, options)` no longer accepts `userId` or `userRole`. Since neither ever did anything, callers can delete them with no behaviour change.
