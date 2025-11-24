# Aphex CMS Playground

A complete playground template for Aphex CMS, based on the current studio setup. This template includes all the features you need to experiment with and build a full-featured content management system.

## What's Included

- **Authentication**: Better Auth with email/password and organization support
- **Multi-tenancy**: Organization-based access control
- **Database**: PostgreSQL with Drizzle ORM
- **File Storage**: S3-compatible storage
- **Email**: Resend integration for transactional emails
- **GraphQL API**: Built-in GraphQL endpoint
- **Admin Panel**: Pre-built admin interface for content management

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/aphex

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:5173

# Email (Resend)
RESEND_API_KEY=your-resend-api-key

# Storage (S3)
S3_BUCKET_NAME=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_ENDPOINT=https://s3.amazonaws.com

# Admin user (for first setup)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme
```

### 3. Start PostgreSQL Database

```bash
pnpm db:start
```

This will start a PostgreSQL instance via Docker Compose on port 5432.

### 4. Run Database Migrations

```bash
pnpm db:migrate
```

This applies all database migrations including Row Level Security (RLS) policies. Note: Use `db:migrate` instead of `db:push` to ensure RLS policies are properly applied.

### 5. Start Development Server

```bash
pnpm dev
```

Your application will be available at `http://localhost:5173`

## Available Scripts

- `pnpm dev` - Start the development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm db:start` - Start PostgreSQL via Docker
- `pnpm db:push` - Push schema changes to database
- `pnpm db:generate` - Generate migration files
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Drizzle Studio to view/edit database
- `pnpm generate:types` - Generate TypeScript types from schemas

## Project Structure

```
.
├── src/
│   ├── lib/
│   │   ├── components/       # Reusable Svelte components
│   │   ├── server/
│   │   │   ├── auth/         # Authentication logic
│   │   │   ├── db/           # Database schemas and connection
│   │   │   ├── email/        # Email service
│   │   │   ├── graphql/      # GraphQL API
│   │   │   ├── services/     # Business logic
│   │   │   └── storage/      # File storage
│   │   ├── schemaTypes/      # Content type definitions
│   │   └── utils/            # Utility functions
│   └── routes/               # SvelteKit routes
│       ├── (protected)/      # Protected routes (require auth)
│       │   └── admin/        # Admin panel
│       ├── api/              # API endpoints
│       └── login/            # Login page
├── static/                   # Static assets
├── aphex.config.ts           # Aphex CMS configuration
└── docker-compose.yml        # PostgreSQL setup
```

## Authentication

The project uses Better Auth for authentication with:

- Email/password login
- Organization-based multi-tenancy
- Role-based access control

### First Login

1. Go to `http://localhost:5173/login`
2. Use the admin credentials from your `.env` file
3. Create additional users and organizations from the admin panel

## Database Management

### Viewing the Database

Open Drizzle Studio to view and edit your database:

```bash
pnpm db:studio
```

### Creating Migrations

After modifying schemas in `src/lib/server/db/`:

```bash
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Apply migrations
```

## Content Types

Define your content schemas in `src/lib/schemaTypes/`. The template includes example schemas that you can use as a starting point.

Create new schemas by adding files to the `schemaTypes` directory, then run:

```bash
pnpm generate:types
```

## Storage

File uploads are handled by the S3 storage adapter. Make sure to configure your S3 credentials in the `.env` file.

For local development, you can use MinIO or LocalStack as S3-compatible alternatives.

## Email

Transactional emails use Resend. Get your API key from [resend.com](https://resend.com) and add it to your `.env` file.

## GraphQL API

Access the GraphQL endpoint at:

```
http://localhost:5173/api/graphql
```

Use the built-in GraphQL explorer to test queries and mutations.

## Learn More

- [Aphex CMS Documentation](https://github.com/IcelandicIcecream/aphex)
- [SvelteKit Documentation](https://kit.svelte.dev)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Better Auth Documentation](https://better-auth.com)

## Support

For issues and questions, please visit the [Aphex CMS GitHub repository](https://github.com/IcelandicIcecream/aphex).
