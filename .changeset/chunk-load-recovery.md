---
'@aphexcms/cms-core': minor
---

Add chunk-load/hung-navigation recovery, importable as `@aphexcms/cms-core/chunk-recovery` — a standalone, zero-dependency module for a public-facing site's `hooks.client.ts` (plus its root `+layout.svelte`) that masks a transient CDN/proxy hiccup — a dropped connection to the origin, or a stale cached HTML document referencing a since-replaced hashed filename — that would otherwise leave a visitor stuck on an unresponsive page. Three distinct gaps, three functions:

- `installChunkLoadRecovery()` — the _initial_ hydration path: if the entry module itself fails to load, a `window` listener reloads the page once.
- `handleChunkLoadClientError(error, destinationUrl?)` — a failed client-side _navigation_ (clicking a link to a lazily-loaded route) is caught by SvelteKit's router internally and routed through `handleError` instead, never becoming a global `window` event — confirmed live via a real "click a link, nothing happens" report. Reloads straight to `destinationUrl` (pass `event.url` from `HandleClientError`) rather than the current address, since SvelteKit doesn't update the address bar until a navigation resolves.
- `installNavigationTimeoutRecovery(timeoutMs = 4000)` — both of the above only fire once SvelteKit/the CDN has already decided the navigation failed, which can ride on a slow gateway timeout (observed live: ~90s on an actual 522). Pre-empts that by forcing a hard navigation to the destination if a client-side navigation hasn't finished within `timeoutMs`, instead of leaving a visitor watching a dead click for a minute-plus. Must be called during a `.svelte` component's initialization (root `+layout.svelte`), not from `hooks.client.ts`.

Guarded to reload/navigate at most once per session across all three, so a genuinely down origin doesn't loop. Deliberately not exported from `/client`: that barrel pulls in the admin UI component tree, and this needs to stay light enough for the hottest of hot paths — every visitor's initial page load. Wired into `apps/studio` and both `templates/base`/`templates/blog` as the reference usage.
