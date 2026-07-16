---
'@aphexcms/cms-core': minor
---

Plugin system: declare schemas, routes, capabilities and admin UI from a package

`definePlugin` plus a discriminated-union `PluginPart` and a part resolver let a
package contribute to the CMS without the app wiring each piece by hand. Parts
cover schemas and schema transforms, server routes, capabilities, document
actions, admin tools, field components, and settings.

Parts split across two planes: serializable parts the server engine ingests via
`aphex.config.ts`, and component parts the admin imports directly (they can't
cross a SvelteKit `load`). A Vite plugin handles auto-discovery.

`aphex/server/route` parts must declare `requiredCapabilities` — there is no
default, because none is right for both a webhook receiver and an admin-only
export. `['forms.export']` requires authentication plus those capabilities, `[]`
requires only authentication, and `'public'` opts out of the gate entirely. The
CMS enforces this at mount, before the handler runs, so a plugin route is never
accidentally open: omitting the field doesn't type-check, and exposing a route to
the internet is a word you have to write.

Also adds a theme module (`theme/`) exporting tokens, schemes and derivation, and
an `AdminArea` type for extending the admin shell.

This is additive — existing configs keep working without declaring any plugins.
