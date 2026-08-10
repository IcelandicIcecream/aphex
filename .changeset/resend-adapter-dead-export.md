---
'@aphexcms/resend-adapter': patch
---

Remove the `./schema` export subpath, which never resolved.

The manifest advertised `@aphexcms/resend-adapter/schema`, but there is no `src/schema.ts` — the
block was copied from an adapter that has one, and `nodemailer-adapter`, its closest sibling, never
had it. Importing it threw `ERR_MODULE_NOT_FOUND`; nothing in the monorepo or the templates did, so
this removes a path that only ever failed rather than changing behaviour anyone relied on.
