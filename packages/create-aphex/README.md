# @aphexcms/aphex-scaffolding

Scaffolder that copies the Aphex CMS base template into a new project and rewrites `workspace:*` deps to real versions.

> **You probably don't want to invoke this directly.** End users run it through the [`aphx`](https://www.npmjs.com/package/aphx) CLI:
>
> ```bash
> npx aphx create
> ```
>
> Internally, `aphx create` shells out to this package.

## Direct usage

If you want to skip the `aphx` wrapper (for example during local development of the scaffolder itself):

```bash
npx @aphexcms/aphex-scaffolding
# or
pnpm dlx @aphexcms/aphex-scaffolding
```

## What it does

1. Prompts for a project name.
2. Prompts for a template (currently only `base`).
3. Copies `templates/base/` into the new directory.
4. Rewrites `workspace:*` dependencies to their published versions.
5. Writes a default `.env` file with working-dev defaults.

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
cd your-project-name
pnpm install
pnpm db:start      # Start PostgreSQL + Mailpit via Docker
pnpm db:push       # Apply the schema (dev)
pnpm dev           # http://localhost:5173
```

Open `http://localhost:5173/admin` — the first user to sign up becomes the super admin.
