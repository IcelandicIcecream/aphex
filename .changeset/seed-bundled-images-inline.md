---
'create-aphex': patch
---

Fix scaffolded sites seeding with no logo, favicon or hero image in production.

Both templates bundle a few images the seed uploads on first run — the base template's
wordmark and favicon, and the website template's those plus the hero artwork the
headline sits on. They were read from disk at seed time, resolved relative to the
module:

```ts
const assetsDir = fileURLToPath(new URL('./assets/', import.meta.url));
```

That only holds in dev, where Vite serves modules from source and `./assets/` really is
next to the seed. Every production build bundles the seed into
`build/server/chunks/`, and a binary that nothing ever `import`s is not emitted
alongside it — so the directory did not exist and all three reads failed. Docker was
never involved; `pnpm build && node build` reproduces it.

It failed silently, which is why it reached a deploy: the read was wrapped in a
`try/catch` that logged `[seed] Missing bundled asset` and returned `null`, so the seed
reported success with the images quietly absent. The article photographs still appeared,
because those are fetched from picsum over HTTP and never touch the filesystem — the
missing images were exactly the ones bundled _because_ they should not depend on the
network.

The assets are now imported with `?inline`, so the bundler turns each into a base64 data
URI at build time and the bytes travel inside the module. This makes them build inputs
rather than runtime paths: a missing file is a build failure instead of a warning in a
deploy log, and the decode cannot fail at run time, so the `null` branch is gone. The
base template keeps its `try/catch` around the _upload_, which talks to storage and
genuinely can fail; the picsum fetch keeps its soft failure, which was always right for
it.

Costs ~260KB of base64 in the website template's server bundle for the 194KB hero JPEG,
which is the price of not depending on a path that does not exist.

Released as a `create-aphex` patch because the templates are `ignore`d by changesets and
the scaffolder pins a tag named after this package's version — the sync workflow never
moves an existing tag, so a template-only change does not reach `pnpm create aphex`
until a new version is cut.
