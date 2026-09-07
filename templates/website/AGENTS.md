# Working in this project

Instructions for AI agents (Claude Code, Cursor, Copilot, …) working in an
AphexCMS project. Read this before adding schemas, routes, or content.

## This CMS can describe itself — ask it, don't guess

The app exposes an MCP server at `/mcp`. Point your client at it and the CMS
answers questions about itself from the **running config**, so the answers are
never stale:

- `describe_cms` — every content type, the reference graph, the valid field-type
  vocabulary, and the reserved field names. Call this first.
- `get_schema <collection>` — one type's field shape. For rich-text types it also
  returns the allowed styles, marks, and custom block types.
- `validate_schema` — **structurally validate a proposed schema before writing
  the file.** Pass it as JSON; validation-rule functions aren't needed.
- `validate_document` — check a document body before creating it.

**Validate before you write.** Guessing a field type and finding out at boot is
the slow loop; `validate_schema` is the fast one. Note it validates against the
_live_ CMS, so proposing a type whose name already exists returns a duplicate-name
error — that means "this name is taken", not "your structure is wrong". Probe
under a temporary name if you're replacing an existing type.

For exact TypeScript signatures, read `SchemaType` and `Field` from
`@aphexcms/cms-core`. Don't reproduce field-type tables in documentation — they
go stale; point at the types or at `describe_cms`.

## Schemas

Content types live in `src/lib/schemaTypes/` and are registered in `index.ts`.
Two kinds: `document` (top-level) and `object` (reusable nested shapes).

- **Rich text is not a field type.** It's `{ type: 'array', of: [{ type: 'block' }] }`.
  The `block` entry activates the Portable Text editor. Custom types listed
  alongside `block` render between paragraphs; types inside `block.of` render
  inline.
- **`slug` stores a bare string.** `"about"`, never `{ current: "about" }`. This
  differs from Sanity and it catches people out.
- **Never use a reserved field name.** A document already has these columns, and
  a schema that shadows one is rejected when the engine boots: `id`, `type`,
  `status`, `organizationId`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`,
  `publishedAt`, `draftData`, `publishedData`, `publishedHash`. `describe_cms`
  returns the live list. Two bite constantly, because they're the obvious names:
  - **`type`** — what a variant picker wants to be called (`hero.type`,
    `link.type`). Use `variant` / `linkType`. The check walks _nested_ `object`
    fields too, not just top-level ones.
  - **`publishedAt`** — don't declare one. The engine stamps it on first publish;
    read it as `_meta.publishedAt` and sort on it with `sort: '-publishedAt'`.
    Note `orderings` is stricter than `sort`: it may only name fields the schema
    itself declares, so an ordering on `publishedAt` fails separately.
- **Hide fields that don't apply (`hidden`) — this is editor experience, not
  security.** A field may declare
  `hidden: ({ siblingData, documentData }) => boolean`, so a link's target
  document disappears when the link is a custom URL and a hero's media
  disappears when the hero is text only. Prefer a condition over a description
  reading "only used when…", which makes the editor evaluate the rule in their
  head every time.
  - **Use `siblingData`.** It's the object the field belongs to, so repeated
    array rows each answer for themselves; `documentData` would make every link
    row follow the first one's value.
  - **Hidden fields skip validation too**, so a required field on the inactive
    branch can't block a save with an error pointing at a control nobody can
    see. Keep real invariants in `validation` as well — the API is reachable
    without the admin.
  - **Hiding keeps the stored value**, so don't render a field the editor can't
    see: the page would show something with no control to change it.
  - It is **not access control** — the value is still in the document, in API
    responses, and writable through the API. Use field-level `access` for that.
- **Types regenerate themselves.** The Vite plugin rewrites
  `src/lib/generated-types.ts` from your schemas whenever the dev server starts
  or a schema file changes, so editing a schema is enough. `pnpm generate:types`
  exists for CI and for when the server isn't running.

Three concerns that look similar and must stay separate:

| Intent                               | Where it goes                           |
| ------------------------------------ | --------------------------------------- |
| Normalize, derive, stamp, default    | `hooks.beforeValidate` — transform only |
| Reject: required, format, invariants | `validation: (Rule) => …`               |
| React: email, webhook, cache         | An event consumer, out of band          |

**Never put side effects in a schema hook.** Hooks transform; events react.

## Reading content

Fetch through the Local API inside `+page.server.ts`. It's the same in-process
API the admin uses — no HTTP round-trip.

```ts
const { docs } = await locals.aphexCMS.localAPI.collections.page.find(context, {
	limit: 20,
	public: true
});
```

- **Never fetch CMS content from the client.** The site is server-rendered.
- **Pass `public: true` on any read that renders a public page.** It strips
  `organizationId`, `createdBy`, `updatedBy`, and `publishedHash` before the data
  lands in the hydration payload where any visitor can read it.
- **Call `assetService.injectAssetUrls(orgId, doc)` on anything with images.** An
  image field stores only `{ asset: { _ref } }` — no URL. Without this the ref is
  never expanded and every image renders as nothing, with no error to explain it.
  It walks the whole document, so it covers cover images and images inside rich
  text in one call.
- **Render images with `<Image>` from `@aphexcms/cms-core/image`,** not a raw
  `<img>`. It consumes the injected srcset and intrinsic size, resolves alt as
  placement → asset → empty, sets `decoding`/`loading`, renders nothing when the
  url is missing, and takes `priority` for an above-the-fold LCP image. It has a
  narrow entrypoint so a public page importing it doesn't pull in the admin
  bundle. Pass `sizes` — without it the browser assumes full-viewport width and
  picks the largest candidate, defeating the srcset.
- Render Portable Text through the project's `Prose` component. Don't hand-roll
  block rendering and don't reach for a Markdown library — the content is
  Portable Text and already has a renderer.

## Design

The public pages commit to one look: a white page, near-black ink (`#111111`), a
single accent (`#ff7a22`) used as a detail rather than a fill, and typography
carrying the hierarchy. Tokens live in `src/routes/(site)/+layout.svelte`. Use
them; don't introduce a second visual system.

Three traps worth knowing before you style anything:

- **Tailwind's preflight resets anchors to `text-decoration: inherit`.** Set
  `text-decoration-line` explicitly or your links render as plain text.
- **`@aphexcms/ui` paints `body` with `bg-background`** for the admin, inside
  `@layer base`. A public page's background has to be set on `body`, unlayered,
  to win against it — a background on a wrapper leaves the admin's colour showing
  wherever the wrapper doesn't reach.
- **…but never leave that `body` rule unqualified.** Svelte extracts `:global()`
  into the stylesheet, so it applies document-wide as soon as that CSS is loaded
  — and it stays loaded after a client-side navigation into `/admin`. Being
  unlayered, it then beats the admin's own rule and pins its text colour, which
  silently breaks dark mode there. Qualify it so it only applies while a public
  page is mounted:

  ```css
  /* not `:global(body)` */
  :global(body:has(.site-shell)) {
  	background: var(--paper);
  	color: var(--ink);
  }
  ```

  Token _definitions_ are fine on `html` — nothing in the admin reads `--paper`
  or `--ink`, and they have to sit above `body` for that rule to resolve them,
  since custom properties inherit downward only. It's the paint that leaks, not
  the tokens.

Avoid the defaults that mark a page as machine-generated: eyebrows and tracked
overlines above headings, centered hero copy over a card grid, decorative
gradients and glows, cards nested in cards, pills around ordinary metadata,
placeholder-voiced copy. Restraint here means precise hierarchy and real
typography — not an empty grey page.

## Visual editing

Preview is not a read-only render — an author clicks what they want to change, so
every renderer owes them a target.

- **Every page-builder block must reveal its own row.** `RenderBlocks` passes each
  block its `index`; spread it onto the block's root element:

  ```svelte
  <section {...ve.edit({ field: 'layout', arrayIndex: index })}>
  ```

  Text carries stega markers and is clickable on its own, but _only the text is_:
  the padding around it, a button, a card, an empty archive grid is inert without
  an explicit target. Blocks that accepted `index` and ignored it — on the
  reasoning that "the text in this block is click-to-edit on its own" — sent the
  author to the top of the `layout` array instead of to their block.

- **Images always need `ve.edit()`.** A string can carry stega inside itself; an
  image has no string to carry it, so an image without explicit attributes is the
  one thing on a page an author cannot click.

- **An embedded document needs its own `ve.live()`.** When a block renders a
  _different_ document (a form, a referenced card), the studio pushes that
  document — not the page — while it's open. Gate on both type and id:
  `ve.live(block._form, { type: 'form', id: block._form.id })`. Without it,
  editing the embedded document appears to do nothing until a reload.

- **Server-derived data survives the swap** (`_posts`, `_form`) because `live()`
  restores underscore-prefixed keys from the fallback. Don't work around it by
  hand.

- **Clean every value you branch on** with `control()` — a stega-marked `'center'`
  matches nothing and the branch silently takes the wrong arm. Display text keeps
  its markers; that's what makes it clickable. See `$lib/utils/stega.ts`.

## Checks

```bash
pnpm check   # svelte-check — must be clean
pnpm build   # production build
```
