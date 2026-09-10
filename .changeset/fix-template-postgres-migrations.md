---
'@aphexcms/cms-core': patch
---

Fix the starter templates' PostgreSQL migrations, which had been frozen at their
initial migration since July while the schema kept moving. Every Postgres deployment
of either template was missing the `two_factor` table and `user.two_factor_enabled`
(so signing in failed with `column "two_factor_enabled" does not exist`),
`cms_documents.revision` (the compare-and-swap concurrency guard),
`cms_documents.search_text`, and the `cms_agent_change_sets`, `cms_agent_operations`
and `cms_asset_references` tables with their RLS policies — plus ~50 columns that
should have been `timestamptz`.

SQLite deployments were unaffected: that adapter provisions its schema at startup with
`pushSQLiteSchema`, so it always matches the code. Only the Postgres path replays
checked-in migration files, and nothing regenerated them.

The fix is an additive `0001` migration in each template, so an existing Postgres
deployment picks up the missing objects on its next deploy without a reset.

Two gaps let this ship unnoticed, both worth knowing:

- The conformance and integration suites bootstrap with drizzle-kit's `pushSchema`
  ("no migration files needed"), so no test ever replays a template's `.sql` files.
  They also push only `cmsSchema`, which excludes the auth tables entirely.
- `scripts/sync-template.sh` cannot propagate migration history by construction: it
  walks template files and copies the studio counterpart, and never creates new files
  — so studio's `0001`–`0009` could never reach a template holding only `0000`.
