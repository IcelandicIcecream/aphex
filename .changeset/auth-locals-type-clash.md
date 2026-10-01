---
'@aphexcms/cms-core': patch
---

Add `aphexLocals(locals)`, a typed view used internally instead of reading or writing `locals.auth` directly. `@auth/sveltekit` declares `App.Locals.auth` as its own session getter; an app using both cms-core and `@auth/sveltekit` failed type-check on every direct `locals.auth` access because both libraries claim the same key with different types. This is a type-only change with no runtime effect; `graphql/index.ts` already carried an inline cast for the same reason, replaced here with the named helper.
