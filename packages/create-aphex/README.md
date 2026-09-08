# create-aphex

Scaffold a new Aphex CMS project from an official standalone template.

## Usage

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
pnpm dev           # http://localhost:5173
```

Open `http://localhost:5173/admin` — the first user to sign up becomes the
super admin.
