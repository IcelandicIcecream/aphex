# create-aphex

CLI tool to scaffold Aphex CMS projects.

## Usage

Create a new Aphex CMS project interactively:

```bash
npx create-aphex
```

Or with pnpm:

```bash
pnpm create aphex
```

Or with npm:

```bash
npm create aphex
```

## What it does

The CLI will guide you through:

1. Choosing a project name
2. Selecting a template (currently only `base` is available)
3. Scaffolding the project files
4. Setting up a basic `.env` file with required environment variables

## Templates

### Base

A full-featured Aphex CMS application with:

- Authentication (Better Auth)
- Multi-tenancy (Organizations)
- PostgreSQL database with Drizzle ORM
- File storage (S3)
- Email (Resend)
- GraphQL API

## After scaffolding

Once your project is created, follow these steps:

```bash
cd your-project-name
pnpm install
pnpm db:start      # Start PostgreSQL via Docker
pnpm db:migrate    # Apply database migrations (includes RLS policies)
pnpm dev           # Start development server
```

Don't forget to update the `.env` file with your actual credentials!
