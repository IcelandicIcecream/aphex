# Aphex CMS Monorepo Guide

This guide explains how the Aphex CMS monorepo is structured and how to work with it effectively.

## Table of Contents

- [Structure](#structure)
- [How It Works](#how-it-works)
- [Development Workflows](#development-workflows)
- [Turborepo](#turborepo)
- [Shadcn-Svelte Components](#shadcn-svelte-components)
- [Adding New Apps](#adding-new-apps)
- [Troubleshooting](#troubleshooting)

## Structure

```
aphex/
├── apps/
│   └── studio/          # Main Aphex Studio app
│       ├── src/
│       │   ├── lib/
│       │   │   ├── schemaTypes/    # Content schemas
│       │   │   ├── server/
│       │   │   │   ├── auth/       # Better Auth with API keys
│       │   │   │   └── db/         # Database connection & schemas
│       │   │   └── api/            # API client wrapper
│       │   └── routes/
│       │       ├── api/            # CMS & auth API routes
│       │       └── (protected)/admin/  # Admin interface
│       ├── package.json
│       ├── svelte.config.js
│       └── vite.config.ts
│
├── packages/
│   ├── cms-core/        # @aphex/cms-core - Core CMS package
│   │   ├── src/
│   │   │   ├── components/  # Admin UI components
│   │   │   ├── db/          # Database adapters
│   │   │   ├── storage/     # Storage adapters
│   │   │   └── routes/      # API handlers
│   │   └── package.json
│   └── ui/              # @aphex/ui - Shared shadcn-svelte components
│       ├── src/
│       │   ├── app.css
│       │   └── lib/
│       │       ├── components/ui/
│       │       └── utils.ts
│       ├── package.json
│       └── components.json
│
├── package.json         # Root workspace config
├── pnpm-workspace.yaml  # PNPM workspace definition
└── turbo.json           # Turborepo pipeline config
```

## How It Works

### Workspace Structure

The monorepo uses **PNPM workspaces** with **Turborepo** for build orchestration:

- `apps/*` - Production applications (served to users)
- `packages/*` - Shared libraries and components

### Package Dependencies

Apps and packages reference each other using `workspace:*` protocol:

```json
{
	"dependencies": {
		"@aphex/cms-core": "workspace:*",
		"@aphex/ui": "workspace:*"
	}
}
```

PNPM automatically links these during `pnpm install`.

### Shared UI Components (shadcn-svelte)

The `packages/ui` package contains shadcn-svelte components shared across apps. Key features:

1. **Components use `@lib` imports** (not `$lib`) for cross-package compatibility
2. **Package exports** allow importing components and styles:

   ```json
   {
   	"./shadcn/*": "./src/lib/components/ui/*/index.ts",
   	"./shadcn/css": "./src/app.css"
   }
   ```

3. **Apps configure aliases** in `svelte.config.js`:

   ```js
   alias: {
     '@lib': '../../packages/ui/src/lib',
     '@lib/*': '../../packages/ui/src/lib/*'
   }
   ```

4. **Tailwind CSS v4 scans** the UI package via `@source` directive in `app.css`:

   ```css
   @import 'tailwindcss';
   @source "../../packages/ui/src/**/*.{html,js,svelte,ts}";
   @import '@aphex/ui/shadcn/css';
   ```

5. **Vite allows monorepo access** in `vite.config.ts`:
   ```ts
   server: {
   	fs: {
   		allow: ['../../'];
   	}
   }
   ```

## Development Workflows

### Starting Development

```bash
# Start the main studio app
pnpm dev

# Or explicitly
pnpm run dev:studio

# Develop the CMS core package in watch mode
pnpm run dev:package
```

### Installing shadcn-svelte Components

**Always use the root script** to install components:

```bash
# From project root
pnpm run shadcn button
pnpm run shadcn dialog
pnpm run shadcn select
```

This installs components to `packages/ui/src/lib/components/ui/` where they're shared across all apps.

### Using UI Components in Apps

Import shadcn components from the shared package:

```svelte
<script lang="ts">
	import { Button } from '@aphex/ui/shadcn/button';
</script>

<Button>Click me</Button>
```

Utilities are also available:

```ts
import { cn } from '@aphex/ui/utils';
```

### Building

```bash
# Build all packages and apps (uses Turborepo)
pnpm build

# Build specific package
pnpm -F @aphex/cms-core build
pnpm -F @aphex/studio build
```

### Type Checking

```bash
# Check all workspaces (uses Turborepo)
pnpm check

# Check specific package
pnpm -F @aphex/studio check
```

### Database Operations

```bash
# Start PostgreSQL
pnpm db:start

# Push schema changes
pnpm db:push

# Generate migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio
```

## Turborepo

Turborepo orchestrates tasks across the monorepo with caching and parallelization.

### Pipeline Configuration

`turbo.json` defines task dependencies:

```json
{
	"tasks": {
		"build": {
			"dependsOn": ["^build"], // Build dependencies first
			"outputs": [".svelte-kit/**", "dist/**"]
		},
		"dev": {
			"cache": false, // Don't cache dev servers
			"persistent": true // Keep running
		},
		"check": {
			"dependsOn": ["^build"] // Type-check after building deps
		}
	}
}
```

### Running Tasks

```bash
# Turbo runs tasks in optimal order with caching
turbo build   # Builds everything, skips unchanged
turbo check   # Type-checks all packages
turbo lint    # Lints all packages
```

### Cache Benefits

- Turborepo caches successful builds
- Re-runs only changed packages
- Parallelizes independent tasks

## Shadcn-Svelte Components

### How Components Are Shared

1. **Installation**: `pnpm run shadcn <component>` installs to `packages/ui`
2. **Exports**: Components exported via `package.json` exports
3. **Imports**: Apps import via `@aphex/ui/shadcn/<component>`
4. **Styles**: Tailwind scans `packages/ui` via `@source` directive
5. **Aliases**: `@lib` alias resolves utilities in components

### Why `@lib` Instead of `$lib`?

- `$lib` is SvelteKit-specific and resolves to each app's own lib
- `@lib` is a custom alias pointing to `packages/ui/src/lib`
- Shadcn components use `@lib` so utilities resolve correctly across packages

### Adding Custom Components

Create components in `packages/ui/src/lib/components/` and export them:

```ts
// packages/ui/src/lib/components/custom/index.ts
export { default as MyComponent } from './my-component.svelte';
```

Update `package.json` exports:

```json
{
	"exports": {
		"./custom/*": "./src/lib/components/custom/*.svelte"
	}
}
```

## Adding New Apps

To add a new app to the monorepo:

1. **Create app directory**:

   ```bash
   mkdir -p apps/my-app
   cd apps/my-app
   ```

2. **Initialize SvelteKit** (or other framework):

   ```bash
   pnpm create svelte@latest .
   ```

3. **Add dependencies**:

   ```json
   {
   	"name": "@aphex/my-app",
   	"dependencies": {
   		"@aphex/cms-core": "workspace:*",
   		"@aphex/ui": "workspace:*"
   	}
   }
   ```

4. **Configure for shared UI**:

   **svelte.config.js**:

   ```js
   alias: {
     '@lib': '../../packages/ui/src/lib',
     '@lib/*': '../../packages/ui/src/lib/*'
   }
   ```

   **vite.config.ts**:

   ```ts
   server: {
   	fs: {
   		allow: ['../../'];
   	}
   }
   ```

   **src/app.css**:

   ```css
   @import 'tailwindcss';
   @source "../../packages/ui/src/**/*.{html,js,svelte,ts}";
   @import '@aphex/ui/shadcn/css';
   ```

5. **Install dependencies**:
   ```bash
   pnpm install
   ```

## Troubleshooting

### Components not styled correctly

**Problem**: Shadcn components render but have no styles.

**Solution**: Ensure `app.css` has the `@source` directive:

```css
@source "../../packages/ui/src/**/*.{html,js,svelte,ts}";
```

### Import errors for `@lib`

**Problem**: `Cannot find module '@lib/utils'`

**Solution**: Add alias in `svelte.config.js`:

```js
alias: {
  '@lib': '../../packages/ui/src/lib',
  '@lib/*': '../../packages/ui/src/lib/*'
}
```

### Vite cannot resolve packages

**Problem**: `Failed to resolve import "@aphex/ui/shadcn/button"`

**Solution**: Allow Vite to access monorepo in `vite.config.ts`:

```ts
server: {
	fs: {
		allow: ['../../'];
	}
}
```

### Workspace dependency not found

**Problem**: `Could not resolve "@aphex/ui"`

**Solution**: Run `pnpm install` from the root to link workspace packages.

### Turbo cache issues

**Problem**: Changes not reflected after build

**Solution**: Clear Turbo cache:

```bash
turbo build --force
```

## Best Practices

1. **Always install shadcn from root**: `pnpm run shadcn <component>`
2. **Keep UI components in packages/ui**: Don't duplicate in apps
3. **Use workspace protocol**: `"@aphex/cms-core": "workspace:*"`
4. **Run tasks from root**: `pnpm dev`, `pnpm build`, `pnpm check`
5. **Update PNPM regularly**: `pnpm add -g pnpm@latest`

## Reference

- [PNPM Workspaces](https://pnpm.io/workspaces)
- [Turborepo Docs](https://turbo.build/repo/docs)
- [shadcn-svelte Docs](https://next.shadcn-svelte.com/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
