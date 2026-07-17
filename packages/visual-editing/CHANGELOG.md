# @aphexcms/visual-editing

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
