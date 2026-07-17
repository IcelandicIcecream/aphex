// Narrow client entrypoint: API client functions only, no Svelte components.
//
// The main `@aphexcms/cms-core/client` barrel re-exports the whole admin UI —
// DocumentEditor, ArrayField and the rich-text editor it pulls (TipTap + @dnd-kit).
// Because those are side-effectful Svelte modules, importing *anything* from the
// barrel drags the entire graph into the route's chunk (~1.18 MB min / 328 kB gzip),
// even a page that only wants an API function.
//
// Utility pages that just call the API (invitations, god-mode) import from here so
// they stay off that chunk. Same symbols as the barrel's `export * from '../api'`.
export * from '../api/index';
