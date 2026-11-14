---
'create-aphex': minor
---

`pnpm create aphex` run inside a SvelteKit app now adds Aphex to that app instead of creating a new one. It asks for the database (SQLite or Postgres), upload storage (local or S3) and email (none or Resend), shows every file it will create or change, and asks before writing. It writes the config, admin route, client config and a sample schema, adds `aphex()` and Tailwind to `vite.config.ts`, puts Aphex first in an existing `handle`, adds Aphex's `locals` to `app.d.ts`, adds the missing `.env` keys with a generated secret, and installs the packages. Files it can't edit safely get printed instructions instead. `--db`, `--storage`, `--email`, `--yes`, `--dry-run` and `--no-install` skip the questions. It refuses SvelteKit 3, Tailwind 3, apps without TypeScript, and apps that already have `src/routes/admin`.

The package's tests now run in CI: it had no `test` script, so the CI job found nothing to run.
