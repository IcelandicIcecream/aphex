# @aphexcms/visual-editing

## 0.3.0

### Minor Changes

- [#294](https://github.com/IcelandicIcecream/aphex/pull/294) [`657db9e`](https://github.com/IcelandicIcecream/aphex/commit/657db9e3ec1f2251bc98fd2e132616a050545d6e) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix the missing publish controls on a referenced document opened in presentation (visual-editing) mode, make a list row's edit marker point at the row rather than the whole field, and raise the reference picker's search ceiling.

  **cms-core**
  - `AdminApp.svelte`: the primary editor's wrapper is now `overflow-y: hidden` in presentation mode. The stacked reference panel is an `absolute inset-y-0` sibling inside that wrapper, and for a _scroll container_ the containing block of an absolute child is the padding box — the whole scrollable extent, not the visible height. With `auto` the panel stretched to the scroll height and pinned its footer (Publish / Schedule / Unpublish) below the fold, so a referenced document looked like it had no publish controls at all; the bar visible at the bottom of the window was the base editor's showing through. Nothing is lost by disabling it there: in presentation mode `DocumentEditor` is `h-full overflow-hidden` and scrolls its own field column.
  - `DocumentEditor.svelte`: new `hideActionBar` prop, set by `AdminApp` on the base document while a reference panel is stacked over it in presentation mode. Two action bars in the same corner give no clue which document each one publishes. Hides the bar only — the document keeps auto-saving and its status stays in the header. Not applied to the ordinary side-by-side stacked panel, where each bar already sits under its own column.
  - `ReferenceField.svelte`: the reference picker fetches 200 documents instead of 20. The picker filters client-side over that cache, so the fetch limit was also the search limit — anything beyond it could never be found by typing, making documents silently unreachable in any collection larger than a screenful (a menu of 36 dishes could only ever surface the first 20). This raises the ceiling rather than removing it; collections beyond 200 still need server-side search, which the list endpoint doesn't expose today.
  - `ArrayField.svelte`: array rows now carry `data-array-index`, the DOM hook the visual editor reads to resolve a click to a specific row.

  **visual-editing**
  - `PreviewApi` gains `documentType` — the schema type currently open in the editor, or `null` outside preview. It's how a page reachable from several document types picks what a click should do.
  - `edit()` accepts `{ field, arrayIndex }` to target a field, or a specific row of it, in the open document, rather than only another document by `{ id, type }`. Revealing the row is what lets an author reorder or remove it, which opening the referenced document does not.
  - The hover overlay's label appends `[n]` for a list entry. Several rows of one list otherwise all read as the same bare field name, with nothing to say which slot is which.

## 0.2.0

### Minor Changes

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Preview API for click-to-edit, plus overlay fixes

  `usePreview()` resolves preview-aware values (images, portable text fields) so a
  site component can render the same markup in preview and production, and
  `stegaClean` strips the invisible markers before any parsing. Adds a portable-text
  field context so inline blocks can report which field they belong to, letting a
  click land on the right block.

  Fixes the overlay swallowing in-page interactions. The click handler ran
  `preventDefault()` on every click in the capture phase — the intent was to stop
  links navigating away from the preview, but opening a `<details>`/`<summary>` is
  also a click's default action, so toggles could never be opened while previewing,
  and checkboxes and radios could never be ticked. Only anchors and submit/reset
  controls are cancelled now. Buttons are matched on the `type` property rather than
  an attribute selector, since a bare `<button>` has no `type` attribute but still
  defaults to `submit`.

## 0.1.2

### Patch Changes

- [#262](https://github.com/IcelandicIcecream/aphex/pull/262) [`d4c5d6f`](https://github.com/IcelandicIcecream/aphex/commit/d4c5d6f95389a84ed4f04d3c81d7a931055da9e7) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Replace a ternary-for-side-effects with an explicit `if/else` in the preview hover handler (no behavior change).

## 0.1.1

### Patch Changes

- add visual editing
