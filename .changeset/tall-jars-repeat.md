---
'@aphexcms/visual-editing': minor
---

Preview API for click-to-edit, plus overlay fixes

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
