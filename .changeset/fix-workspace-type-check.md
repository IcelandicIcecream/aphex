---
'@aphexcms/base': patch
'@aphexcms/website': patch
---

Don't ship the monorepo-only `@lib` alias to scaffolded projects.

`svelte.config.js` aliased `@lib` to `../../packages/ui/src/lib` — required inside
the Aphex monorepo, where `@aphexcms/ui` resolves to workspace source whose
components import each other through that alias, but meaningless in a scaffolded
project, where the published package ships a `dist` in which `svelte-package` has
already rewritten it. There the alias pointed two directories above the project at
a path that doesn't exist. It is now applied only when the monorepo is detected,
matching how `server.fs.allow` in `vite.config.ts` is handled.
