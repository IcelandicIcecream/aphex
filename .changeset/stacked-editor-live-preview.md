---
'@aphexcms/cms-core': minor
'@aphexcms/visual-editing': minor
---

A document open in a stacked editor (a form opened from the page that shows it) now updates the page's preview as it's typed, about 0.2 s after each edit, instead of after it autosaves. The editor sends it to the preview as `aphex:related-data`, and `ve.live(value, { type, id })` reads it. Older overlays ignore the message and keep refreshing after the save.
