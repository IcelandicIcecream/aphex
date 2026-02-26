# Aphex CMS

A clean starting point for building with Aphex CMS. No example schemas — just the wiring.

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

### 3. Start PostgreSQL Database

```bash
pnpm db:start
```

### 4. Run Database Migrations

```bash
pnpm db:migrate
```

### 5. Start Development Server

```bash
pnpm dev
```

Your application will be available at `http://localhost:5173`

### 6. First Login

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
- `pnpm db:start` — Start PostgreSQL via Docker
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
└── docker-compose.yml         # PostgreSQL setup
```

## Learn More

- [Aphex CMS](https://github.com/IcelandicIcecream/aphex)
- [SvelteKit](https://kit.svelte.dev)
- [Drizzle ORM](https://orm.drizzle.team)
- [Better Auth](https://better-auth.com)
