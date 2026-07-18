# Aphex CMS Blog

A blog starter for Aphex CMS — public frontend, visual editing, and a ready-made blog content model.

> This directory is mirrored to [**IcelandicIcecream/aphex-blog**](https://github.com/IcelandicIcecream/aphex-blog) on every change, so you can clone it directly as a standalone project:
>
> ```bash
> git clone https://github.com/IcelandicIcecream/aphex-blog my-blog
> cd my-blog && pnpm install
> ```
>
> Or scaffold via the CLI: `pnpm aphex create`.

## Deploy to Vercel (try it instantly)

No local setup — click the button, and Vercel provisions a Neon Postgres database and a Blob store for you automatically. The blog defaults to SQLite locally, but auto-switches dialect the moment `DATABASE_URL` looks like a Postgres URL — which is exactly what the Neon integration injects, so this needs zero manual DB wiring.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FIcelandicIcecream%2Faphex&root-directory=templates%2Fblog&project-name=my-aphex-blog&repository-name=my-aphex-blog&demo-title=AphexCMS%20Blog&demo-description=Blog%20starter%20for%20AphexCMS%20%E2%80%94%20spin%20up%20your%20own%20instance&env=BETTER_AUTH_SECRET&envDescription=Random%20secret%20Better%20Auth%20uses%20to%20sign%20session%20tokens.%20Generate%20one%20with%3A%20openssl%20rand%20-base64%2032&envLink=https%3A%2F%2Fgithub.com%2FIcelandicIcecream%2Faphex%2Fblob%2Fmain%2Ftemplates%2Fblog%2F.env.example&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%5D&stores=%5B%7B%22type%22%3A%22blob%22%7D%5D)

You'll be asked for one value, `BETTER_AUTH_SECRET` — any long random string (`openssl rand -base64 32` works). Once it's live, visit `/admin` on your new deployment and sign up — the first account becomes super admin. This deploys straight from this repo (an isolated instance, not a shared demo) and is meant for trying the product, not production use.

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Copy the example file and update as needed:

```bash
cp .env.example .env
```

### 3. Start Development Server

No database setup needed — the blog runs on a local SQLite file (`.aphex/blog.db`)
and the schema pushes automatically on boot. For managed SQLite hosting, point
`DATABASE_URL` at a [Turso](https://turso.tech) database (`libsql://...` +
`DATABASE_AUTH_TOKEN`). Prefer Postgres (e.g. [Neon](https://neon.tech))? Just set
`DATABASE_URL` to a `postgres://`/`postgresql://` URL — the dialect switches
automatically, no other config needed (see `src/lib/server/db/index.ts`).

```bash
pnpm dev
```

Your application will be available at `http://localhost:5173`

### 4. First Login

1. Go to `http://localhost:5173/login`
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

Available field types: `string`, `text`, `number`, `boolean`, `slug`, `image`, `date`, `datetime`, `url`, `array`, `object`, `reference`

## Available Scripts

- `pnpm dev` — Start the development server
- `pnpm build` — Build for production
- `pnpm preview` — Preview production build
- `pnpm mail` — Start Mailpit (local email testing) via Docker
- `pnpm db:migrate` — Run database migrations
- `pnpm db:push` — Push schema changes (dev only)
- `pnpm db:generate` — Generate migration files
- `pnpm db:studio` — Open Drizzle Studio

## Project Structure

```
.
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── auth/         # Authentication (Better Auth)
│   │   │   ├── db/           # Database connection and schema
│   │   │   ├── email/        # Email templates and adapter
│   │   │   ├── services/     # Business logic
│   │   │   └── storage/      # File storage adapter
│   │   ├── schemaTypes/      # Your content type definitions
│   │   └── utils/            # Utility functions
│   └── routes/
│       ├── (protected)/admin/ # Admin panel
│       ├── api/               # API endpoints
│       ├── god-mode/          # Super admin panel
│       └── login/             # Authentication
├── aphex.config.ts            # CMS configuration
├── drizzle/                   # Database migrations
└── docker-compose.yml         # Mailpit (local email testing)
```

## Learn More

- [Aphex CMS](https://github.com/IcelandicIcecream/aphex)
- [SvelteKit](https://kit.svelte.dev)
- [Drizzle ORM](https://orm.drizzle.team)
- [Better Auth](https://better-auth.com)
