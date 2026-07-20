---
name: sync-template
description: How to flow apps/studio changes downstream to templates/base and the create-aphex scaffolder, and how the aphx CLI relates. Use when syncing the studio reference app to the template, cutting a template release, or editing the CLI.
---

# Syncing studio → template → CLI

`apps/studio` is the reference app where new features land first. `templates/base` is the starter shipped to end users via `create-aphex`. To flow studio changes downstream:

1. **Sync studio → template** — `./scripts/sync-template.sh --apply`. Template-driven: walks every file tracked in `templates/base/` and copies the matching file from `apps/studio/` if it exists. Skips `src/lib/schemaTypes/**` (template keeps its own minimal example schema). Merges `package.json` preserving the template's `name` and `version`. Studio-only files (tests, seed routes, scripts, render route) never flow over because the template has no matching path. (Dry run first: `./scripts/sync-template.sh` with no flag.)

2. **If studio added a genuinely new file/dir** (e.g. `src/lib/server/cache/`), create a placeholder in `templates/base/` first so the sync picks it up on the next run. This is the tradeoff of the template-driven approach — safe, but requires one manual step for new top-level additions.

3. **Update `templates/base/CHANGELOG.md`** — under `## Unreleased`, list the files that changed and a one-line reason. The template is meant to be customized, so syncs don't auto-apply to downstream projects — the changelog is how users know what to port into their own customized copy. When cutting a release, rename `Unreleased` to the new version.

4. **Push to standalone repo** — when changes to `templates/base/**` land on `main`, `.github/workflows/sync-template.yml` mirrors the folder to `IcelandicIcecream/aphex-base`, rewriting `workspace:*` deps to real versions before pushing. `create-aphex` fetches that repo at scaffold time via `giget` (no bundled templates), so once the workflow runs the new template is live for end users — no `create-aphex` republish needed.

5. **Test the scaffolder locally** — `pnpm -F create-aphex build && node packages/create-aphex/dist/index.js`. By default it pulls `github:IcelandicIcecream/aphex-base`; override with `APHEX_TEMPLATE=github:owner/repo#ref` to test an unpushed branch or a fork.

6. **Verify the template builds** — `pnpm -F @aphexcms/base build`. The template guards module-eval-time env reads with the SvelteKit `building` flag, so build does not require a real `.env`.

## The `aphx` CLI

The `aphx` CLI (`packages/cli/`, `@aphexcms/cli`) is separate and minimal. Edit `src/index.ts`, run `pnpm -F @aphexcms/cli build`, then `node packages/cli/dist/index.js <cmd>` or `pnpm link --global` to test. The `aphex generate:types` command the template uses is a different bin, exposed by `@aphexcms/cms-core` at `packages/cms-core/src/cli/index.ts`.
