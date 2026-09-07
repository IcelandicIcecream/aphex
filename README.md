<div align="center">
  <img src="./apps/studio/static/favicon.svg" alt="AphexCMS Logo" width="72" />
  <br>
  <h1>AphexCMS</h1>
  <p><strong>A Sanity-inspired, database-agnostic CMS built with SvelteKit V2 (Svelte 5)</strong></p>
</div>

<div align="center">
  <img
    src="./admin-screenshot.webp"
    alt="The AphexCMS admin: a page's fields on the left, the live site on the right, with the hero block highlighted for editing in place"
    width="100%"
  />
</div>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-V2-FF3E00?logo=svelte)](https://kit.svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**[Documentation](https://docs.getaphex.com)** · [Getting started](https://docs.getaphex.com/getting-started) · [Schemas](https://docs.getaphex.com/schemas) · [Deployment](https://docs.getaphex.com/deployment)

</div>

Aphex lives **inside your SvelteKit app**, not beside it. The same app that serves your
site serves the admin, so content is read through a typed Local API call rather than a
network hop — and live preview is a component render, not an integration. Define your
content model as TypeScript, and the admin UI, HTTP API, GraphQL schema, and MCP server
are all generated from it.

## Quick start

```bash
pnpm create aphex my-app
cd my-app
pnpm install
pnpm dev
```

Open **http://localhost:5173/admin** — the first user to sign up becomes super admin.

No database to start and no migration to run: a new project uses SQLite and provisions
its own schema on first boot. Postgres and Turso are a one-line config change — see
**[Getting started](https://docs.getaphex.com/getting-started)**.

## Features

- 🎨 **Sanity-inspired admin** — responsive 3-panel editor with mobile navigation, auto-save, validation, and version history
- 🔌 **Database adapters** — PostgreSQL and SQLite/libsql behind one `DatabaseAdapter` contract, as peers rather than tiers
- 📝 **Type-safe schemas** — define content models in TypeScript, get strongly typed Local API collections
- 👁️ **Visual editing** — live preview with stega-encoded click-to-edit overlays
- ✍️ **Portable Text rich content** — TipTap-backed block editor with custom blocks, inline objects, marks, and annotations
- 🔄 **Draft/publish workflow** — auto-save, hash-based change detection, scheduled publishing, and rolling version history
- ⚡ **Events & durable jobs** — append-only event log, transactional outbox, and a DB-backed queue with leases, backoff and dead-lettering
- 🤖 **AI built in** — an in-admin assistant plus a Streamable HTTP MCP server, sharing one tool set
- 🏢 **Multi-tenancy** — organizations, parent/child hierarchy, capability RBAC, field-level access, and Postgres RLS
- 🚀 **Four API surfaces** — Local API, Zod-validated HTTP API, generated GraphQL, and MCP, all from the same schema
- ☁️ **Storage & email adapters** — local filesystem or S3-compatible (R2, MinIO); SMTP or Resend
- 🧩 **Plugins** — admin tools, settings panels, event consumers, job handlers, and agent tools, with no app wiring

## Packages

| Package                        | Description                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `@aphexcms/cms-core`           | Database-agnostic core engine with admin UI, API handlers, and built-in GraphQL |
| `@aphexcms/postgresql-adapter` | PostgreSQL implementation with Drizzle ORM (also exports `/pglite`)             |
| `@aphexcms/sqlite-adapter`     | SQLite/libsql implementation (local `file:` databases and Turso)                |
| `@aphexcms/storage-s3`         | S3-compatible storage (R2, AWS S3, MinIO)                                       |
| `@aphexcms/nodemailer-adapter` | Nodemailer/SMTP email adapter (with a Mailpit helper for local dev)             |
| `@aphexcms/resend-adapter`     | Resend API email adapter for production                                         |
| `@aphexcms/ai-openai`          | Model backend for the in-admin assistant (OpenAI-compatible endpoints)          |
| `@aphexcms/ui`                 | Shared [shadcn-svelte](https://shadcn-svelte.com) component library             |
| `@aphexcms/visual-editing`     | Live preview overlay, stega helpers, and click-to-edit frontend integration     |
| `@aphexcms/plugin-forms`       | Editor-composed forms, stored submissions, and notifications                    |
| `@aphexcms/plugin-seo`         | Meta group injection with per-type title, description, and URL generation       |
| `create-aphex`                 | Scaffolder invoked by `pnpm create aphex`                                       |

## Documentation

Everything lives at **[docs.getaphex.com](https://docs.getaphex.com)**.

|                                                                                                                                              |                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [Getting started](https://docs.getaphex.com/getting-started)                                                                                 | Install, configure, and run your first project         |
| [Schemas](https://docs.getaphex.com/schemas)                                                                                                 | Field types, validation, hooks, and conditional fields |
| [Local API](https://docs.getaphex.com/local-api) · [HTTP](https://docs.getaphex.com/http-api) · [GraphQL](https://docs.getaphex.com/graphql) | Reading and writing content                            |
| [Visual editing](https://docs.getaphex.com/visual-editing)                                                                                   | Live preview and click-to-edit                         |
| [AI assistant](https://docs.getaphex.com/ai-assistant) · [MCP](https://docs.getaphex.com/mcp)                                                | The in-admin agent, and AI clients like Claude Code    |
| [Events & jobs](https://docs.getaphex.com/events-and-jobs)                                                                                   | Reacting to publishes, durably                         |
| [Plugins](https://docs.getaphex.com/plugins)                                                                                                 | Extending the admin and the engine                     |
| [Access control](https://docs.getaphex.com/access-control) · [API keys](https://docs.getaphex.com/api-keys)                                  | Roles, capabilities, and programmatic access           |
| [Deployment](https://docs.getaphex.com/deployment)                                                                                           | Docker, Railway, Render, Coolify/Dokploy               |

The docs site publishes [`llms.txt`](https://docs.getaphex.com/llms.txt) and per-page
markdown, so you can point an AI client straight at it.

## Contributing

Contributions are welcome — bug fixes, field types, database or storage adapters, UI
improvements, and docs. Start with the [contributing
guide](https://docs.getaphex.com/contributing) for dev setup, code standards, the
release flow, and the studio → template → CLI sync chain.

Working in this repo with an AI agent? [`CLAUDE.md`](./CLAUDE.md) carries the
architecture notes and the traps worth knowing.

## Acknowledgments

Inspired by [Sanity.io](https://sanity.io) • Built with [SvelteKit](https://kit.svelte.dev), [Drizzle ORM](https://orm.drizzle.team), [Better Auth](https://better-auth.com), and [shadcn-svelte](https://shadcn-svelte.com)

---

<div align="center">
  <strong>Questions?</strong> Open an <a href="https://github.com/IcelandicIcecream/aphex/issues">issue</a> or start a <a href="https://github.com/IcelandicIcecream/aphex/discussions">discussion</a>
</div>
