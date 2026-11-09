# create-aphex

Create a new Aphex CMS project, or add Aphex to the SvelteKit app you already have.

## Add Aphex to an existing app

Run it inside your SvelteKit 2 app, with no project name:

```bash
pnpm create aphex
```

It asks which database, upload storage and email to use, shows every file it will create or change, and asks before writing anything. It creates the config, the admin route and a sample schema, adds `aphex()` (and Tailwind, if you don't have it) to `vite.config.ts`, puts Aphex first in your `handle`, adds Aphex's `locals` to `app.d.ts`, fills in `.env` with a generated secret, and installs the packages. It never overwrites a file you already have. When a file has a shape it can't edit safely, it prints the lines to add by hand.

```bash
pnpm create aphex --dry-run                          # show the changes, make none
pnpm create aphex --db postgres --storage s3 --yes   # no questions
```

| Flag           | Values                                                            | Default  |
| -------------- | ----------------------------------------------------------------- | -------- |
| `--db`         | `sqlite`, `postgres`                                              | `sqlite` |
| `--storage`    | `local`, `s3`                                                     | `local`  |
| `--email`      | `none`, `resend`                                                  | `none`   |
| `-y`, `--yes`  | Use the defaults for anything not given, and don't ask to confirm |          |
| `--dry-run`    | Show the changes without making them                              |          |
| `--no-install` | Write the files but don't install packages                        |          |

With Postgres it also runs `drizzle-kit generate`, so commit the `drizzle` folder it creates. It stops without changing anything on SvelteKit 3, Tailwind 3, an app without TypeScript, or an app that already has `src/routes/admin`.

## Upgrade an older Aphex app

Run the same command in an app that already uses Aphex, and it upgrades the app to the embedded admin (`@aphexcms/cms-core` 12) instead: it deletes the admin, account, `/api` and `/media` route files that core now serves, adds the admin route and `aphex.client.ts`, fixes the config, and moves the `@aphexcms/*` packages to the latest version. `--yes`, `--dry-run` and `--no-install` work the same way.

It deletes a file only if it's exactly a version an Aphex template shipped, and keeps a route folder whole if you changed any file in it. It recognises versions by their git blob ids, listed in `src/upgrade/known-files.ts`. When a template changes one of those files, regenerate the list with `pnpm -F create-aphex known-files`, which reads the monorepo's git history. See [Upgrading to the embedded admin](https://docs.getaphex.com/upgrading-to-embedded-admin).

## Create a new app

```bash
pnpm create aphex my-app
pnpm create aphex my-site --template website
# or
npm create aphex my-app
# or
npx create-aphex my-app
```

Pick a template with `--template`:

```bash
npm create aphex@latest my-site --template website
```

`base` (the default) is a minimal starter; `website` is a working marketing site
with a page builder, blog, forms and SEO.

## What it does

1. Prompts for a project name (or takes the positional argument).
2. Prompts for an official template when `--template` is omitted.
3. Downloads the selected standalone template repository.
4. Sets the package name and writes a default `.env` with local development defaults.

Official templates are pinned to the matching `create-aphex-vX.Y.Z` repository tag. A given CLI
version therefore always scaffolds the same snapshot even after the template's `main` branch moves.

## Templates

### base

A minimal Aphex CMS application for defining your own content model and public site.

### website

A content-focused website starter with:

- Better Auth (email + password, email verification, password reset)
- Organizations with parent/child hierarchy
- SQLite by default with optional PostgreSQL and Turso
- S3-compatible storage (`@aphexcms/storage-s3`) with local-filesystem fallback
- Page builder, posts, categories, site navigation, and SEO

Choose non-interactively with `--template base` or `--template website`. Set
`APHEX_TEMPLATE` to a complete [giget](https://github.com/unjs/giget) source such
as `github:owner/repo#branch` when testing a custom template repository.

## After scaffolding

```bash
cd my-app
pnpm install
pnpm dev           # http://localhost:5173, or the next free port
```

Open `/admin` at the URL Vite prints — the first user to sign up becomes the
super admin.
