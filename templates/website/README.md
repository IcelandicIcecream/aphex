# Aphex Website Template

A page-builder website on Aphex CMS: the studio, a block-based content model, a
blog, search and a sitemap — all in one SvelteKit app. Modelled on Payload's
website template.

What's in the box:

**Content model** (`src/lib/schemaTypes/`)

- **`page`** — a hero and a stack of layout blocks, served at `/<slug>`. The page
  slugged `home` is the front page.
- **`post`** — a dated article: rich text with banner/code/media blocks inside it,
  categories, related posts. Served at `/posts/<slug>`.
- **`category`** — the one taxonomy.
- **`header`** / **`footer`** — singletons holding the site navigation.
- **`siteSettings`** — a singleton for the site name, description, logo and favicon.

**Layout blocks** (`src/lib/schemaTypes/objects/blocks.ts`, rendered from `src/lib/blocks/`)

| Block          | What it does                                             |
| -------------- | -------------------------------------------------------- |
| Call to action | A pitch and up to two buttons                            |
| Content        | One to four columns of rich text on a twelve-column grid |
| Media          | A full-width image with a caption                        |
| Archive        | A grid of posts, either queried or hand-picked           |

**Hero treatments** (`src/lib/heros/`) — `none`, `highImpact` (full-bleed image with
the copy centred on it), `mediumImpact` (copy then image), `lowImpact` (copy only).

**The front end**

- `/` and `/[slug]` — pages, assembled from blocks
- `/posts`, `/posts/page/2`, … — the archive, paginated, filterable by `?category=`
- `/posts/[slug]` — an article, with related posts
- `/search` — full-text search over posts and pages, backed by a real index
  (Postgres `tsvector`, SQLite FTS5), not a `LIKE` scan
- `/sitemap.xml` — built from the CMS at request time

**Example content**, created on first run: a small publication with real articles
and photographs, so every block, the archive, the navigation and the related-posts
strip all have something in them the moment you open the site. Re-run it any time
with `curl -X POST localhost:5173/api/seed`, or turn it off with `APHEX_SEED=false`.

Delete `src/lib/schemaTypes/`, `src/routes/(site)/` and `src/lib/server/seed/` once
your own model exists — nothing else depends on them.

### A few things worth knowing

- **Reserved field names.** `type` and `publishedAt` are document columns, so a
  schema can't declare them. That's why the hero's variant picker is `variant` and
  a link's is `linkType`. See `AGENTS.md`.
- **No conditional fields.** Aphex has no equivalent of Payload's
  `admin.condition`, so a link shows both its "internal" and "custom URL" fields at
  once and the descriptions explain which applies. (`dependsOn` exists, but it
  varies a field's _options_, not its visibility.)
- **Stega and preview.** In the visual editor every string carries invisible
  click-to-edit markers. Values used as _logic_ — a hero's `variant`, a block's
  `_type`, a URL — must be cleaned first or they match nothing. See
  `src/lib/utils/stega.ts`.
- **Category filtering scans a bounded window.** There's no operator for "this
  array contains a reference to X", so it happens in memory above the database
  query. Fine at starter scale; `src/lib/server/posts.ts` explains what to do
  instead when it isn't.

> This directory is mirrored to [**IcelandicIcecream/aphex-website**](https://github.com/IcelandicIcecream/aphex-website), so you can clone it directly as a standalone project:
>
> ```bash
> git clone https://github.com/IcelandicIcecream/aphex-website my-app
> cd my-app && pnpm install
> ```
>
> Or scaffold via the CLI: `pnpm create aphex my-site --template website`.

## Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/IcelandicIcecream/aphex-website)
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https%3A%2F%2Fgithub.com%2FIcelandicIcecream%2Faphex-website&envs=AUTH_SECRET%2CAPHEX_SQLITE_URL%2CAPHEX_UPLOADS_DIR%2CAPHEX_EMBEDDED_WORKER&AUTH_SECRETDesc=Signs+session+cookies+and+API+keys.+Generate+with%3A+openssl+rand+-base64+48&APHEX_SQLITE_URLDesc=Database+file.+Must+sit+on+the+volume+you+mount+at+%2Fdata.&APHEX_SQLITE_URLDefault=file%3A%2Fdata%2Fwebsite.db&APHEX_UPLOADS_DIRDesc=Uploads+directory.+Must+sit+on+the+volume+you+mount+at+%2Fdata.&APHEX_UPLOADS_DIRDefault=%2Fdata%2Fuploads&APHEX_EMBEDDED_WORKERDesc=Runs+scheduled+publishes+and+event+consumers+in-process.&APHEX_EMBEDDED_WORKERDefault=true)

Both buttons read a config file in this repository — `render.yaml` and
`railway.json` — and build the bundled `Dockerfile`. Either way you get one
container with a mounted volume holding the SQLite database and the uploads, so
there is no database to provision and nothing to wire together.

**The buttons deploy this template, not your copy of it.** They name
`IcelandicIcecream/aphex-website` and that is the repo they build, so a project
you scaffolded and then changed is not what goes live — and you cannot push to
what does. Press one to see a running CMS; don't put content you care about in
it.

To deploy **your own project**, push it to GitHub and point the platform at your
repo. The config files came with the template, so it is the same one click:

- **Render** — New → Blueprint → your repo, which reads `render.yaml`.
- **Railway** — New Project → Deploy from GitHub repo, which reads `railway.json`.

That path also works with a **private** repo. The buttons cannot: a `?repo=`
deploy link can only reach a public one.

Self-hosting instead? `docker-compose.prod.yml` is the Coolify / Dokploy / VPS
path, and the full guides — including Fly, buildpack platforms and what to do
about email, backups and custom domains — are at
[docs.getaphex.com/deployment](https://docs.getaphex.com/deployment).

**Two things to do the moment it goes live**, however you deployed:

1. **Sign up at `/login`.** The first account to sign up becomes super admin. On a
   public URL that is a race, so either do it immediately or set
   `APHEX_BOOTSTRAP_EMAIL` to your address before deploying, which restricts the
   claim to you.
2. **Add `RESEND_API_KEY` and `APHEX_EMAIL_FROM`.** Until email works there is no
   password reset and no way to invite anyone — the account you created is the
   only way in.

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Then generate the one required value, `AUTH_SECRET`, and paste it in:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Everything else in `.env.example` is either already correct for local development
or commented out. The file is grouped into **required**, **local defaults** and
**optional** so you can see at a glance what still needs your attention before you
deploy.

### 3. Start Development Server

No database setup needed — this template runs on a local **SQLite** file
(`.aphex/base.db`) and pushes the schema on boot. Prefer Postgres? See
[Using Postgres instead](#using-postgres-instead) below.

```bash
pnpm dev
```

Your application will be available at `http://localhost:5173`, or the next free port
shown by Vite. Use `pnpm dev --host` only when you intentionally want LAN or tunnel access.

### 4. First Login

1. Go to `/login` at the URL Vite printed
2. Sign up with your email and password — the first user automatically becomes the super admin with a default organization
3. Access God Mode at `/god-mode` for instance-level administration

## Defining Content Schemas

Add your content schemas in `src/lib/schemaTypes/`. Two types are available:

- **`document`** — Top-level entities (e.g. Page, Post, Product)
- **`object`** — Reusable nested structures (e.g. SEO, Hero)

Example:

```typescript
// src/lib/schemaTypes/post.ts
import type { SchemaType } from '@aphexcms/cms-core';

const post: SchemaType = {
	type: 'document',
	name: 'post',
	title: 'Post',
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Title',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'slug',
			type: 'slug',
			title: 'Slug',
			source: 'title'
		},
		{
			name: 'body',
			type: 'text',
			title: 'Body'
		}
	]
};

export default post;
```

Then register it in `src/lib/schemaTypes/index.ts`:

```typescript
import post from './post.js';

export const schemaTypes = [post];
```

Available field types: `string`, `text`, `number`, `boolean`, `slug`, `image`, `file`, `date`, `datetime`, `url`, `array`, `object`, `reference`

## Using Postgres instead

SQLite is the default, but the Postgres adapter is wired in and one env var away —
no code changes. In `.env`:

```bash
APHEX_DATABASE=postgres
DATABASE_URL=postgres://root:my-secret-password@localhost:5432/local
# …or PG_HOST / PG_PORT / PG_USER / PG_PASSWORD / PG_DATABASE instead of DATABASE_URL
```

Then:

```bash
pnpm db:start     # start Postgres via the bundled docker-compose.yml (optional)
pnpm db:migrate   # apply the migrations in drizzle/ (or leave auto-migrate on)
pnpm dev
```

The driver is selected in `src/lib/server/db/index.ts` — `postgres` picks the
Postgres adapter, anything else falls back to SQLite. The runtime and
`drizzle.config.ts` both default to SQLite, so local development needs no
`APHEX_DATABASE` setting.

To use **Turso** instead of a local file:

```bash
APHEX_SQLITE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your_turso_token
```

The Drizzle config automatically selects its `turso` dialect for `libsql://`
URLs so the token reaches the remote client; local `file:` URLs use its `sqlite`
dialect. For production, push the schema once during deployment and disable
boot-time schema pushes in the running app:

```bash
pnpm db:push
APHEX_DB_AUTO_MIGRATE=false
```

## Available Scripts

- `pnpm dev` — Start the development server (SQLite, zero setup)
- `pnpm build` — Build for production
- `pnpm preview` — Preview production build
- `pnpm db:start` — Start PostgreSQL via Docker (only if using Postgres)
- `pnpm db:migrate` — Run database migrations (Postgres)
- `pnpm db:push` — Push the SQLite/Turso schema
- `pnpm db:generate` — Generate migration files
- `pnpm db:studio` — Open Drizzle Studio

## Project Structure

```
.
├── src/
│   ├── lib/
│   │   ├── blocks/           # One component per layout block + RenderBlocks
│   │   ├── heros/            # The four hero treatments + RenderHero
│   │   ├── components/       # Header, Footer, Card, RichText, CMSLink, …
│   │   ├── schemaTypes/      # Content model — start here
│   │   │   ├── fields/       # Reusable field builders (link, hero)
│   │   │   └── objects/      # The layout blocks
│   │   ├── server/
│   │   │   ├── auth/         # Authentication (Better Auth)
│   │   │   ├── db/           # Database connection and schema
│   │   │   ├── email/        # Email templates and adapter
│   │   │   ├── seed/         # First-run example content
│   │   │   ├── page.ts       # The shared page loader
│   │   │   ├── posts.ts      # The shared post query
│   │   │   └── references.ts # Expanding document references for the front end
│   │   └── utils/            # link resolution, stega cleaning, dates
│   └── routes/
│       ├── (site)/           # The public site
│       ├── (protected)/admin/ # Admin panel
│       ├── api/               # API endpoints (incl. POST /api/seed)
│       └── sitemap.xml/       # Generated from the CMS
├── aphex.config.ts            # CMS configuration
├── drizzle/                   # Database migrations
└── docker-compose.yml         # PostgreSQL setup
```

## Learn More

- [Aphex CMS](https://github.com/IcelandicIcecream/aphex)
- [SvelteKit](https://kit.svelte.dev)
- [Drizzle ORM](https://orm.drizzle.team)
- [Better Auth](https://better-auth.com)
