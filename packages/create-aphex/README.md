# create-aphex

Scaffold a new Aphex CMS project. Copies the base template into a new
directory and rewrites `workspace:*` deps to their published versions.

## Usage

```bash
pnpm create aphex my-app
# or
npm create aphex my-app
# or
npx create-aphex my-app
```

You can also invoke it through the [`aphx`](https://www.npmjs.com/package/aphx)
CLI, which shells out to this package:

```bash
npx aphx create
```

## What it does

1. Prompts for a project name (or takes the positional argument).
2. Prompts for a template (currently only `base`).
3. Copies `templates/base/` into the new directory.
4. Rewrites `workspace:*` dependencies to their published versions.
5. Writes a default `.env` with working dev defaults.

## Templates

### base

A full-featured Aphex CMS application:

- Better Auth (email + password, email verification, password reset)
- Organizations with parent/child hierarchy
- PostgreSQL + Drizzle ORM with RLS policies
- S3-compatible storage (`@aphexcms/storage-s3`) with local-filesystem fallback
- Mailpit in dev / Resend in prod
- Auto-generated GraphQL API
- In-memory cache adapter for published-perspective reads

## After scaffolding

```bash
cd my-app
pnpm install
pnpm db:start      # Start PostgreSQL + Mailpit via Docker
pnpm db:push       # Apply the schema (dev)
pnpm dev           # http://localhost:5173
```

Open `http://localhost:5173/admin` — the first user to sign up becomes the
super admin.
