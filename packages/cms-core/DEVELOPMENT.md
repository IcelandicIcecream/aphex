# Development Guide - @aphex/cms-core

This guide explains how to develop and test the `@aphex/cms-core` package.

## 📁 Package Structure

```
packages/cms-core/
├── src/                    # Source files (TypeScript + Svelte)
│   ├── index.ts           # Main client export
│   ├── server/            # Server-only exports
│   ├── components/        # Svelte components
│   ├── db/                # Database adapters
│   ├── storage/           # Storage adapters
│   └── services/          # Business logic
├── dist/                  # Built package (generated)
└── package.json          # Package configuration
```

## 🔧 Development Workflow

### Option 1: Fast Development (Recommended)

Work directly with source files - changes hot-reload automatically:

```bash
# From project root
pnpm dev

# Any changes to packages/cms-core/src/* are instantly reflected
# No build step needed!
```

**How it works:**
- Your app uses `workspace:*` dependency
- Vite resolves `@aphex/cms-core` → `packages/cms-core/src/index.ts`
- Hot Module Replacement (HMR) works out of the box

### Option 2: Test Built Package

Test the actual build output (what users will get):

```bash
# Terminal 1: Watch and rebuild package
cd packages/cms-core
pnpm dev  # Rebuilds to dist/ on changes

# Terminal 2: Run your app
cd ../..
pnpm dev
```

**When to use:**
- Before publishing
- Testing build configuration
- Debugging module resolution issues

## 🧪 Testing

### 1. Local Testing (In-Workspace)

Your app is already set up as a test environment:

```bash
# From project root
pnpm dev              # Start dev server
pnpm check            # Type-check everything
pnpm lint             # Run linters
pnpm build            # Build production bundle

# Test package only
pnpm test:package     # Build + type-check package
pnpm dev:package      # Watch mode for package
```

### 2. Package Build Verification

```bash
cd packages/cms-core

# Build and check
pnpm build            # Build to dist/
pnpm check            # Type-check
pnpm lint             # Lint check

# Create tarball (test packaging)
pnpm pack             # → aphex-cms-core-0.1.0.tgz
```

### 3. External Project Testing

Test how the package works in a real project:

#### Method A: pnpm Link

```bash
# In packages/cms-core
pnpm link --global

# In another SvelteKit project
pnpm link --global @aphex/cms-core

# Configure the test project
# See "Example Usage" below
```

#### Method B: Tarball Installation

```bash
# Build and pack
cd packages/cms-core
pnpm build
pnpm pack

# In another project
pnpm add /path/to/aphex-cms-core-0.1.0.tgz
```

#### Method C: Local Registry (Most Realistic)

```bash
# Terminal 1: Start Verdaccio (local npm registry)
npx verdaccio
# Runs on http://localhost:4873

# Terminal 2: Publish to local registry
cd packages/cms-core
npm publish --registry http://localhost:4873

# In another project
pnpm add @aphex/cms-core --registry http://localhost:4873
```

## 📝 Example Usage (External Project)

Create a new SvelteKit project to test the package:

```bash
# Create test project
pnpm create svelte@latest test-aphex-cms
cd test-aphex-cms
pnpm install

# Add dependencies
pnpm add @aphex/cms-core drizzle-orm postgres sharp
pnpm add -D drizzle-kit

# Add UI peer dependencies
pnpm add bits-ui lucide-svelte mode-watcher clsx tailwind-merge tailwind-variants
```

**Configure the CMS:**

```typescript
// aphex.config.ts
import { createCMSConfig } from '@aphex/cms-core/server';
import { DATABASE_URL } from '$env/static/private';

export default createCMSConfig({
  schemas: {
    page: {
      type: 'document',
      name: 'page',
      title: 'Page',
      fields: [
        {
          name: 'title',
          type: 'string',
          title: 'Title',
          validation: (Rule) => Rule.required()
        }
      ]
    }
  },
  database: {
    adapter: 'postgresql',
    connectionString: DATABASE_URL
  },
  storage: {
    adapter: 'local',
    basePath: './static/uploads',
    baseUrl: '/uploads'
  }
});
```

```typescript
// src/hooks.server.ts
import { createCMSHook } from '@aphex/cms-core/server';
import cmsConfig from '../aphex.config';

export const handle = createCMSHook(cmsConfig);
```

## 🚀 Common Commands

```bash
# Root workspace
pnpm dev              # Run app (uses source files)
pnpm build            # Build app for production
pnpm check            # Type-check all workspaces
pnpm lint             # Lint all workspaces
pnpm format           # Format all code

# Package-specific (from root)
pnpm test:package     # Build + type-check package
pnpm dev:package      # Watch mode for package

# Package-specific (from packages/cms-core)
pnpm build            # Build package → dist/
pnpm dev              # Watch mode (rebuild on change)
pnpm check            # Type-check package only
pnpm lint             # Lint package only
pnpm package          # Build + create tarball
```

## 🔍 Debugging Tips

### TypeScript Errors

```bash
# Check package types
cd packages/cms-core
pnpm check

# Check app types
cd ../..
pnpm check
```

### Import Resolution Issues

```bash
# Clear SvelteKit cache
rm -rf .svelte-kit

# Reinstall dependencies
rm -rf node_modules
pnpm install

# Rebuild package
cd packages/cms-core
pnpm build
```

### Component Hot Reload Not Working

Make sure you're using source files (not dist):
- Check `package.json`: `"@aphex/cms-core": "workspace:*"` ✅
- NOT: `"@aphex/cms-core": "file:packages/cms-core"` ❌

## 📦 Pre-Publish Checklist

Before publishing to npm:

```bash
# 1. Build and test package
cd packages/cms-core
pnpm build
pnpm check
pnpm lint

# 2. Test in app
cd ../..
pnpm build
pnpm check

# 3. Create test tarball
cd packages/cms-core
pnpm pack

# 4. Test in external project
# (Use Method B or C above)

# 5. Update version and publish
pnpm version patch  # or minor, major
npm publish --access public
```

## 🛠️ Workflow Tips

### Daily Development

```bash
# Just run the app - no package build needed
pnpm dev
```

All changes to `packages/cms-core/src/**` hot-reload automatically!

### Before Committing

```bash
pnpm check && pnpm lint
```

### Before Publishing

```bash
# Build and verify package
cd packages/cms-core
pnpm build && pnpm check

# Ensure app still works
cd ../..
pnpm build
```

## 🐛 Troubleshooting

### "Cannot find module @aphex/cms-core"

```bash
# Reinstall workspace dependencies
pnpm install
```

### Components not updating

```bash
# Clear Vite cache
rm -rf .svelte-kit
pnpm dev
```

### Type errors in components

Make sure UI peer dependencies are installed in the app:

```bash
pnpm add bits-ui lucide-svelte mode-watcher clsx tailwind-merge tailwind-variants
```

## 📚 Additional Resources

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [SvelteKit Package](https://kit.svelte.dev/docs/packaging)
- [Verdaccio Docs](https://verdaccio.org/docs/what-is-verdaccio)
