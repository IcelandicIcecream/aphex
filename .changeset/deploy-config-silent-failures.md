---
'@aphexcms/cms-core': patch
---

Make three deployment misconfigurations loud instead of silent, and fix the Render
Postgres blueprint, which contradicted itself.

Each of these previously fell back to a working-looking default and lost data later:

- **`DATABASE_URL` set but `APHEX_DATABASE` unset.** Every managed platform injects
  `DATABASE_URL` when you attach a Postgres service, so the natural action — attach a
  database, deploy — produced an app running SQLite on the container's ephemeral disk
  while Postgres sat empty. The same missing variable also made the container
  entrypoint skip its migration step, so nothing in the log said so. The templates now
  infer Postgres from `DATABASE_URL` when `APHEX_DATABASE` is unset, and log that they
  did. An explicit `APHEX_DATABASE` still wins, and local dev is unaffected because
  nothing sets `DATABASE_URL` there. Studio is unchanged — it already defaults to
  Postgres, so the case is not ambiguous there.
- **Partial `S3_*` configuration.** The bucket needs all four variables; with three set,
  the app silently used local disk and uploads vanished on the next deploy. It now warns
  and names the variables it did not find.
- **No job worker configured in production.** Neither `APHEX_EMBEDDED_WORKER` nor
  `APHEX_WORKER_SECRET` means nothing drains the queue: a scheduled publish is accepted
  and never happens, an event consumer never fires, and no error is raised because
  nothing failed. The templates now warn once at boot.

`render.postgres.yaml` in both templates pinned `numInstances: 1` while omitting
`APHEX_EMBEDDED_WORKER` with a comment reasoning about multiple instances, so anyone
deploying it got a CMS whose queue never ran. It now sets it, and documents the swap to
`APHEX_WORKER_SECRET` plus a cron for when you scale. It also sets `APHEX_SKIP_MIGRATE`
alongside `APHEX_DB_AUTO_MIGRATE`: those disable different code paths (the container
entrypoint and the app's boot migration), so setting only one left the entrypoint still
migrating on every container start — duplicating the pre-deploy step it was meant to
replace.

Docs: `operations.mdx` told you to run `pnpm migrate`, a script no template defines;
it now gives the compiled CLI path that works inside the pruned production image, and
explains that a single-instance deploy needs no migration step at all. Railway's
one-click buttons are replaced with the **Deploy from GitHub repo** path — Railway no
longer honours `?template=<github-url>` and silently ignored it.
