# Contributing to AphexCMS

Thank you for your interest in contributing to AphexCMS! This guide will help you get started with development, understand our standards, and submit quality contributions.

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Code Standards](#code-standards)
4. [Project Structure](#project-structure)
5. [Adding Features](#adding-features)
6. [Testing](#testing)
7. [Pull Request Process](#pull-request-process)
8. [Reporting Issues](#reporting-issues)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** (use `nvm` for version management)
- **pnpm 9.0+** (required for monorepo)
- **Docker** (for PostgreSQL)
- **Git** (with SSH keys configured for GitHub)

### Initial Setup

```bash
# Fork the repository on GitHub, then clone your fork
git clone git@github.com:YOUR_USERNAME/aphex.git
cd aphex

# Add upstream remote
git remote add upstream git@github.com:IcelandicIcecream/aphex.git

# Install dependencies
pnpm install

# Configure environment
cd apps/studio
cp .env.example .env
# Default values work for local development
cd ../..

# Start PostgreSQL database
pnpm db:start

# Run migrations
pnpm db:migrate

# Start development server
pnpm dev
```

🎉 **Admin UI**: http://localhost:5173/admin

### Creating Your First Account

When you first start the app, the **first user to sign up becomes a super admin**. Create your account at `/login` and you'll have full access.

---

## 🔄 Development Workflow

### Daily Development

```bash
# Update your fork
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/my-feature

# Make changes and test
pnpm dev

# Check code quality
pnpm format  # Auto-format code
pnpm check   # Type-check all packages
pnpm lint    # Lint check

# Build to ensure no errors
pnpm build
```

### Hot Module Replacement (HMR)

- **Schema changes**: Auto-reload (no restart needed)
- **Component changes**: Instant updates with Vite HMR
- **Database schema changes**: Requires `pnpm db:push` or `pnpm db:migrate`

### Database Commands

```bash
# Development (push schema changes without migration files)
pnpm db:push

# Production (generate and run migrations)
pnpm db:generate  # Create migration file
pnpm db:migrate   # Apply migrations

# Debug (inspect database)
pnpm db:studio    # Open Drizzle Studio at http://localhost:4983
```

### Package Development

```bash
# Work on specific package
pnpm dev:package  # cms-core only
pnpm dev:studio   # studio app only

# Test package build
pnpm test:package # Build and type-check cms-core

# Add UI components (shadcn-svelte)
pnpm shadcn button       # Add button to @aphex/ui
pnpm shadcn dialog       # Add dialog component
pnpm shadcn dropdown-menu # Add dropdown menu
```

### Working with UI Components

AphexCMS uses **[shadcn-svelte](https://shadcn-svelte.com)** components in `@aphex/ui`:

```bash
# Browse available components
# Visit https://shadcn-svelte.com/docs/components

# Add component to @aphex/ui package
pnpm shadcn <component-name>

# Component is now available in:
# - packages/cms-core (admin UI)
# - apps/studio (your app)
```

**Usage example:**
```svelte
<script lang="ts">
  import { Button } from '@aphex/ui/shadcn/button';
  import { Dialog } from '@aphex/ui/shadcn/dialog';
</script>

<Button onclick={() => console.log('clicked')}>
  Click me
</Button>
```

**Customizing components:**
- Components live in `packages/ui/src/lib/components/ui/`
- Edit directly in your codebase (no ejecting needed)
- Changes apply to both cms-core and studio
- Shared Tailwind config in `packages/ui/tailwind.config.ts`

---

## 📏 Code Standards

### Style Guide

We use **Prettier** and **ESLint** to maintain consistent code style.

#### TypeScript

```typescript
// ✅ Good: Use type imports
import type { SchemaType } from '@aphex/cms-core';

// ✅ Good: Explicit return types for exported functions
export function createAdapter(): DatabaseAdapter {
  // ...
}

// ✅ Good: Interfaces for object shapes
interface UserProfile {
  userId: string;
  role: 'admin' | 'editor' | 'viewer';
}

// ❌ Bad: Using \`any\`
function processData(data: any) { }  // Use proper types! ACTUALLY, FOR SPEED, I DON'T MIND.
```

#### Svelte 5 (Runes)

```typescript
// ✅ Good: Use runes for reactivity
let count = $state(0);
const doubled = $derived(count * 2);

$effect(() => {
  console.log('Count changed:', count);
});

// ❌ Bad: Old Svelte 3/4 syntax
let count = 0;  // Not reactive!
$: doubled = count * 2;  // Don't use $: labels
```

#### Naming Conventions

- **Files**: `kebab-case.ts`, `PascalCaseComponent.svelte`
- **Variables/Functions**: `camelCase`
- **Types/Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE` (for true constants)
- **Private fields**: Prefix with `_` or use `#` syntax

### Comments

Only comment **why**, not **what**. Code should be self-explanatory.

```typescript
// ✅ Good: Explains WHY
// Schemas are loaded from code, not DB, because validation functions
// cannot be serialized to JSON
const schemas = loadSchemasFromFiles();

// ❌ Bad: Explains WHAT (obvious from code)
// Loop through users
for (const user of users) { }
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add MongoDB adapter
fix: resolve circular reference in schema resolution
docs: update ARCHITECTURE.md with multi-tenancy details
chore: update dependencies
refactor: simplify auth provider interface
test: add unit tests for validation rules
```

**Format**: `<type>(<scope>): <description>`

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## 📁 Project Structure

```
aphex/
├── apps/
│   └── studio/                    # Reference implementation
│       ├── src/
│       │   ├── lib/
│       │   │   ├── schemaTypes/        # YOUR content models
│       │   │   └── server/
│       │   │       ├── auth/           # Auth implementation
│       │   │       ├── db/             # Database singleton
│       │   │       └── storage/        # Storage singleton
│       │   ├── routes/
│       │   │   ├── admin/              # Admin UI pages
│       │   │   └── api/                # API route re-exports
│       │   └── hooks.server.ts         # CMS initialization
│       └── aphex.config.ts             # CMS configuration
│
└── packages/
    ├── cms-core/                  # 🧠 Core engine (no DB deps)
    │   ├── src/
    │   │   ├── auth/                   # Auth contracts
    │   │   ├── db/                     # Database interfaces
    │   │   ├── storage/                # Storage interfaces
    │   │   ├── services/               # Business logic
    │   │   ├── components/             # Admin UI (Svelte)
    │   │   ├── api/                    # Client-side API
    │   │   ├── routes/                 # Server route handlers
    │   │   ├── field-validation/       # Validation rules
    │   │   ├── schema-utils/           # Schema utilities
    │   │   ├── plugins/                # Plugin system
    │   │   ├── types/                  # TypeScript types
    │   │   ├── engine.ts               # CMS engine
    │   │   ├── hooks.ts                # SvelteKit hook factory
    │   │   └── routes-exports.ts       # Exportable handlers
    │   └── package.json
    │
    ├── postgresql-adapter/        # 🐘 PostgreSQL implementation
    ├── storage-s3/                # ☁️ S3-compatible storage
    ├── graphql-plugin/            # 🔌 GraphQL API plugin
    └── ui/                        # 🎨 Shared shadcn-svelte components
        ├── src/lib/components/ui/      # Button, Dialog, etc.
        ├── tailwind.config.ts          # Shared Tailwind config
        └── app.css                     # Global styles & CSS vars
```

### Key Principles

1. **\`cms-core\` is database-agnostic**: No database-specific imports
2. **Adapters are separate packages**: Each database gets its own package
3. **App layer controls singletons**: Database and storage instances created in app
4. **Routes are re-exported**: Most API routes simply re-export from cms-core
5. **Schemas live in app**: Content models defined by developers, not core
6. **UI components are shared**: `@aphex/ui` provides shadcn-svelte components to both cms-core and studio

---

## ➕ Adding Features

### Adding a Database Adapter

See [ARCHITECTURE.md](./ARCHITECTURE.md#adding-a-database-adapter) for comprehensive guide with examples.

**Quick overview:**
1. Create new package (e.g., `@aphex/mongodb-adapter`)
2. Implement `DatabaseAdapter` interface
3. Create `DatabaseProvider` with `createAdapter()` method
4. Export typed config interface
5. Install in app and configure

### Adding a Storage Adapter

See [ARCHITECTURE.md](./ARCHITECTURE.md#adding-a-storage-adapter) for full details.

**Quick overview:**
1. Implement `StorageAdapter` interface
2. Handle file upload, deletion, existence checks
3. Provide public URLs for assets
4. Export adapter for use in app config

### Adding a Field Type

1. **Create Svelte component** in `packages/cms-core/src/components/admin/fields/`
2. **Add TypeScript type** in `packages/cms-core/src/types/schemas.ts`
3. **Update SchemaField.svelte** to render your field type

See [ARCHITECTURE.md](./ARCHITECTURE.md#adding-custom-field-types) for detailed example.

### Adding a Plugin

Implement the `CMSPlugin` interface:

```typescript
import type { CMSPlugin, CMSInstances } from '@aphex/cms-core/server';

export function createMyPlugin(config): CMSPlugin {
  return {
    name: '@aphex/my-plugin',
    version: '1.0.0',
    routes: {
      '/api/my-endpoint': async (event) => {
        // Handle request
      }
    },
    install: async (cms: CMSInstances) => {
      // Access cms.databaseAdapter, cms.storageAdapter, etc.
    }
  };
}
```

---

## 🧪 Testing

### Current State

AphexCMS is in **early development** and does not yet have comprehensive tests. We welcome contributions to add testing infrastructure!

### Manual Testing Checklist

Before submitting a PR, manually test:

- ✅ **Build passes**: `pnpm build`
- ✅ **Type-check passes**: `pnpm check`
- ✅ **Linting passes**: `pnpm lint`
- ✅ **Dev server runs**: `pnpm dev` (no errors in console)
- ✅ **Admin UI loads**: Visit `/admin` and test affected features
- ✅ **Database migrations work**: `pnpm db:migrate` (if schema changed)

---

## 🔀 Pull Request Process

### Before Submitting

1. **Ensure code quality**
   ```bash
   pnpm format  # Auto-format
   pnpm check   # Type-check
   pnpm lint    # Lint check
   pnpm build   # Ensure builds
   ```

2. **Update documentation**
   - Update README.md if adding user-facing features
   - Update ARCHITECTURE.md if changing core patterns
   - Add JSDoc comments to new public APIs

3. **Commit with conventional commits**
   ```bash
   git add .
   git commit -m "feat: add MongoDB adapter"
   ```

4. **Sync with upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### Submitting PR

1. **Push to your fork**
   ```bash
   git push origin feature/my-feature
   ```

2. **Create Pull Request on GitHub**
   - Use a clear, descriptive title
   - Reference related issues (e.g., "Closes #123")

3. **PR Description Should Include:**
   - **What**: Summary of changes
   - **Why**: Motivation and context
   - **How**: Implementation approach
   - **Testing**: How you tested the changes
   - **Screenshots**: If UI changes

### PR Guidelines

- ✅ **Focused scope**: One feature/fix per PR
- ✅ **Small diffs**: Easier to review (<500 lines preferred)
- ✅ **Descriptive commits**: Clear commit messages
- ✅ **No unrelated changes**: Avoid reformatting entire files
- ❌ **No breaking changes**: Unless discussed in an issue first

### Review Process

1. **Automated checks**: CI runs linting, type-checking, build
2. **Manual review**: Maintainer reviews code, architecture, docs
3. **Feedback**: Address review comments
4. **Approval**: Maintainer approves and merges

**Be patient!** Reviews may take a few days. Feel free to ping after a week.

---

## 🐛 Reporting Issues

### Before Reporting

1. **Search existing issues**: Your issue may already be reported
2. **Try latest version**: Update dependencies and test again
3. **Minimal reproduction**: Isolate the problem

### Bug Reports

Include:

**Environment:**
- OS (macOS, Linux, Windows)
- Node.js version (\`node -v\`)
- pnpm version (\`pnpm -v\`)
- Browser (if UI bug)

**Steps to Reproduce:**
```
1. Run \`pnpm dev\`
2. Navigate to \`/admin/documents\`
3. Click "New Page"
4. Error appears in console
```

**Expected Behavior:**
"Should open a new document editor"

**Actual Behavior:**
"Console shows \`TypeError: Cannot read property 'fields' of undefined\`"

**Error Logs:**
```
// Paste browser console errors
// Paste terminal errors
```

### Feature Requests

Include:

**Use Case:**
"As a [role], I want to [action] so that [benefit]"

**Proposed Solution:**
Brief description of how you envision it working

**Alternatives:**
Other approaches you considered

---

## 📚 Additional Resources

- **[README.md](./README.md)** - Quick start and features
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Deep dive into internals
- **[GitHub Discussions](https://github.com/IcelandicIcecream/aphex/discussions)** - Ask questions, share ideas
- **[GitHub Issues](https://github.com/IcelandicIcecream/aphex/issues)** - Bug reports and feature requests

---

## 🙏 Thank You!

Your contributions make AphexCMS better for everyone. Whether it's code, documentation, bug reports, or feature ideas—every contribution is valuable and appreciated! 💙

**Questions?** Don't hesitate to ask in [Discussions](https://github.com/IcelandicIcecream/aphex/discussions) or open an issue.
