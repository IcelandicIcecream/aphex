# Vite optimizeDeps — Fixing 504 (Outdated Optimize Dep) Errors

## The Problem

When Vite discovers a new dependency at runtime that isn't listed in `optimizeDeps.include`, it triggers a re-optimization. This deletes old chunks and generates new ones, but the browser still holds references to the old chunk names — causing `504 (Outdated Optimize Dep)` errors and failed dynamic imports.

## How to Diagnose

While the dev server is running, check what Vite has optimized:

```bash
cat apps/studio/node_modules/.vite/deps/_metadata.json | grep '"src"' | sort
```

Compare the output against `optimizeDeps.include` in `apps/studio/vite.config.ts`. Anything in the metadata but **not** in the config is a dep Vite discovered at runtime — and a candidate to add.

## How to Fix

Add the missing dependency to `optimizeDeps.include` in `apps/studio/vite.config.ts`, then clean restart:

```bash
rm -rf apps/studio/node_modules/.vite apps/studio/.svelte-kit && pnpm dev
```

### Direct vs Transitive Dependencies

- **Direct dependency** (exists in `apps/studio/node_modules/`) — add it directly:
  ```ts
  'some-package'
  ```
- **Transitive dependency** (only exists inside a workspace package's `node_modules/`, e.g. from `cms-core`) — use the `>` syntax:
  ```ts
  '@aphexcms/cms-core > some-package'
  ```

### How to Check

```bash
# Direct dep?
ls apps/studio/node_modules/some-package

# Transitive dep from cms-core?
ls packages/cms-core/node_modules/some-package
```

## Best Practice

When adding a new npm package to `cms-core` (or any workspace package) that gets used on the **client side**, add a corresponding entry to `optimizeDeps.include` in `apps/studio/vite.config.ts` at the same time.
