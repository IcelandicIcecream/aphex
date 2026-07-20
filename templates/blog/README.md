# Aphex CMS — Blog Template

A batteries-included blog built with Aphex CMS: `Post` / `Page` content, a page-builder,
a rendered public site, a **contact form** with a submissions inbox, and email — all on a
zero-setup local **SQLite** database.

> This directory is mirrored to [**IcelandicIcecream/aphex-blog**](https://github.com/IcelandicIcecream/aphex-blog) on every change, so you can clone it directly as a standalone project:
>
> ```bash
> git clone https://github.com/IcelandicIcecream/aphex-blog my-app
> cd my-app && pnpm install
> ```

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
and migrations apply automatically on boot. For managed hosting, point
`DATABASE_URL` at a [Turso](https://turso.tech) database (`libsql://...` +
`DATABASE_AUTH_TOKEN`). Prefer Postgres? Mirror the DB wiring from the base
template (`@aphexcms/postgresql-adapter`).

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

Available field types: `string`, `text`, `number`, `boolean`, `slug`, `image`, `file`, `date`, `datetime`, `url`, `array`, `object`, `reference`

## Contact form & submissions

The contact form is a **code-authored form**, not a content type. It lives in
`src/lib/forms/`:

- **`contact-form.ts`** — `defineForm({ id, fields, … })`. Fields reuse the CMS field
  model, so validation (`required`, `email`, `max`) is the same engine the admin uses, and
  `InferForm<typeof contactForm>` gives you the typed submission shape with no codegen.
  - `transform` normalizes raw input **before** validation (trims strings, lowercases the
    email) — the one thing validation can't do.
  - `notifyEmail` is where a "new submission" email is sent (see [Email](#email) below).
- **`submit.ts`** — `submitForm()` validates, persists the submission to the generic
  `cms_plugin_storage` table (under `plugin:'forms', collection:'contact'`), and emits a
  `form.submitted` domain event — all in one transaction.
- **`forms-plugin.ts`** — registers the submit endpoint, the **Submissions** admin tool
  (a read-only inbox), and the `form.submitted` consumer that sends the notification email.

The public form posts to `/api/contact` (`src/routes/api/contact/+server.ts`). Submissions
show up in the admin sidebar under **Submissions**, and each submission + its notification
delivery is visible in **Activity**.

To add another form: copy `contact-form.ts`, give it a new `id`, register it in the plugin's
form list, and drop `<ContactForm formId="your-id" />` (or your own component) on a page.

## Email

Dev uses **Mailpit** (run `pnpm mail`, inbox at `http://localhost:8025`) — it catches every
message regardless of address. Production uses **Resend** when `RESEND_API_KEY` is set (swap
in the nodemailer/SMTP adapter in `src/lib/server/email/index.ts` if you'd rather use SMTP).

The sender identity is `APHEX_EMAIL_FROM` (read server-side; falls back to the default in
`src/lib/email-sender.ts`). **With Resend the `from` domain must be verified** in your Resend
account, so set `APHEX_EMAIL_FROM` to a verified-domain address before going live.

## Background jobs

The event/queue/job spine (scheduled publishing, the `form.submitted` consumer) runs **in
process** during `pnpm dev` — `aphex.config.ts` sets `jobs.embedded: dev`, so there's no
second worker terminal. In production, turn `embedded` off and drive
`POST /api/internal/workers/run` from cron or a poll loop instead.

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
