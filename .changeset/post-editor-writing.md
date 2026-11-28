---
'@aphexcms/cms-core': minor
---

Rich text: a "/" menu offers the field's styles, lists and blocks, filtered as you type; empty text shows a placeholder (`placeholder` on the field sets it). A block type's `icon` shows in the insert menus and on its card, and a card reads its registered type's title and preview. A schema's own `link` annotation replaces the built-in URL-only link and now loads with all its fields (before, they were dropped on load and lost on the next save). The ``` and --- shortcuts only work where the schema allows a code block, so they no longer make content the field refuses. A click in the preview brings its field to the middle of the editor, and a clicked paragraph flashes.
