// `@aphexcms/cms-core/image` — the public rendering surface.
//
// Its own narrow entrypoint on purpose. A marketing page importing `<Image>`
// must not pull in the admin barrel and its TipTap/field-editor chunk, which is
// exactly what a shared barrel would cause: Rollup's unit is the chunk, not the
// symbol.
//
// It lives here rather than in `@aphexcms/ui` because that package is the
// shadcn design system and knows nothing about assets — putting an
// Asset-shaped component there would invert the dependency.
export { default as Image } from './Image.svelte';
export type { ImageValue, InjectedAsset } from './types';
