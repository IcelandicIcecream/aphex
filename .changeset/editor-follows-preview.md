---
'@aphexcms/cms-core': minor
'@aphexcms/visual-editing': minor
---

The editor and preview follow what you're working on:

- An item added to an array (a page's new section) is scrolled to and outlined in the preview, with the new `aphex:item-focus` message. Older previews ignore it.
- A click in the preview on a field with nothing to type in (a photo, a file, a toggle) flashes that field, instead of focusing the image field's hidden file input.
- A block or inline object inserted into rich text is in the text at once, so the document and its preview show it while its editor is open, not only once it closes.
