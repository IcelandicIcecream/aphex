---
'@aphexcms/ui': patch
---

Ship type declarations for `@aphexcms/ui/shadcn/tooltip`.

bits-ui implements `Tooltip.Root`, `Provider` and `Portal` as Svelte components, so re-exporting
them bare gave them the `$$IsomorphicComponent` type declared inside bits-ui's own
`tooltip.svelte` — a type with no importable name. `svelte-package` can't write that into a
`.d.ts`, so it skipped `tooltip/index.d.ts` altogether, with a warning rather than a non-zero
exit. The published `./shadcn/tooltip` export declared a `types` path pointing at a file that
wasn't in the tarball, and consumers importing tooltip got no types at all.

The three re-exports now carry an explicit `typeof TooltipPrimitive.X` annotation, which names the
type through the value import and gives the emitter something it can write.

Patch rather than minor for the same reason as 0.8.4: every core package peer-depends on
`@aphexcms/ui`, and changesets treats a peer-range change as breaking, so a minor would cascade a
major onto cms-core and every adapter.
